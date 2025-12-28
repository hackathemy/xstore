import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, NonceManager } from 'ethers';
import { PrismaService } from '../../common/prisma/prisma.service';

interface PaymentDataParams {
  paymentId: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
}

interface ProcessPaymentParams {
  paymentId: string;
  signature: string;
  deadline: number;
  v?: number;
  r?: string;
  s?: string;
}

interface RefundDataParams {
  refundId: string;
  from: string;  // Store wallet address
  to: string;    // Customer address
  amount: string;
  tokenAddress: string;
}

interface ProcessRefundParams {
  refundId: string;
  from: string;       // Store wallet
  to: string;         // Customer wallet
  amount: string;
  tokenAddress: string;
  signature: string;
  deadline: number;
  v?: number;
  r?: string;
  s?: string;
}

// ERC-2612 Permit + ERC20 ABI
const TOKEN_ABI = [
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function nonces(address owner) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function name() view returns (string)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

@Injectable()
export class FacilitatorService {
  private readonly logger = new Logger(FacilitatorService.name);
  private provider: ethers.JsonRpcProvider;
  private facilitatorWallet: ethers.Wallet | null = null;
  private readonly chainId: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const rpcUrl = this.configService.get<string>('RPC_URL') || 'https://mevm.testnet.imola.movementlabs.xyz';
    this.chainId = this.configService.get<number>('CHAIN_ID') || 30732;
    const privateKey = this.configService.get<string>('FACILITATOR_PRIVATE_KEY');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.facilitatorWallet = new ethers.Wallet(privateKey, this.provider);
      this.logger.log(`Facilitator wallet initialized: ${this.facilitatorWallet.address}`);
    } else {
      this.logger.warn('FACILITATOR_PRIVATE_KEY not set - x402 facilitator will not work');
    }
  }

  /**
   * Get facilitator wallet address
   */
  getFacilitatorAddress(): string | null {
    return this.facilitatorWallet?.address || null;
  }

  /**
   * Generate EIP-712 typed data for permit signing
   */
  async generatePaymentData(params: PaymentDataParams) {
    const { from, to, amount, tokenAddress, paymentId } = params;

    if (!this.facilitatorWallet) {
      throw new Error('Facilitator not configured');
    }

    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, this.provider);

    // Get nonce for the payer
    const nonce = await tokenContract.nonces(from);
    const name = await tokenContract.name();

    // Calculate deadline (1 hour from now)
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Convert amount to wei (assuming 18 decimals)
    const amountWei = ethers.parseUnits(amount, 18);

    // EIP-712 domain
    const domain = {
      name,
      version: '1',
      chainId: this.chainId,
      verifyingContract: tokenAddress,
    };

    // Permit types
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    // Permit message
    const message = {
      owner: from,
      spender: this.facilitatorWallet.address,
      value: amountWei.toString(),
      nonce: nonce.toString(),
      deadline,
    };

    return {
      paymentId,
      domain,
      types,
      message,
      primaryType: 'Permit',
      deadline,
      nonce: nonce.toString(),
      facilitatorAddress: this.facilitatorWallet.address,
      recipient: to,
      amountWei: amountWei.toString(),
    };
  }

  /**
   * Process payment with permit signature
   * 1. Execute permit to approve facilitator
   * 2. Execute transferFrom to move tokens from payer to merchant
   */
  async processPayment(params: ProcessPaymentParams): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const { paymentId, signature, deadline, v, r, s } = params;

    if (!this.facilitatorWallet) {
      return { success: false, error: 'Facilitator not configured' };
    }

    try {
      // Get payment details from database
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          tab: {
            include: { store: true },
          },
        },
      });

      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      const tokenAddress = payment.tokenAddress;
      const payer = payment.payerAddress;
      const recipient = payment.tab.store.walletAddress;
      const amount = ethers.parseUnits(payment.amount.toString(), 18);

      this.logger.log(`Processing payment ${paymentId}:`);
      this.logger.log(`  Payer: ${payer}`);
      this.logger.log(`  Recipient: ${recipient}`);
      this.logger.log(`  Amount: ${payment.amount}`);
      this.logger.log(`  Token: ${tokenAddress}`);

      // Parse signature components
      let sigV = v;
      let sigR = r;
      let sigS = s;

      if (!sigV || !sigR || !sigS) {
        const sig = ethers.Signature.from(signature);
        sigV = sig.v;
        sigR = sig.r;
        sigS = sig.s;
      }

      // Use NonceManager to handle nonce synchronization properly
      const managedWallet = new NonceManager(this.facilitatorWallet);

      const tokenContract = new ethers.Contract(
        tokenAddress,
        TOKEN_ABI,
        managedWallet,
      );

      // Step 1: Execute permit
      this.logger.log('Executing permit...');
      const permitTx = await tokenContract.permit(
        payer,
        this.facilitatorWallet.address,
        amount,
        deadline,
        sigV,
        sigR,
        sigS,
      );
      await permitTx.wait();
      this.logger.log(`Permit executed: ${permitTx.hash}`);

      // Step 2: Execute transferFrom
      this.logger.log('Executing transferFrom...');
      const transferTx = await tokenContract.transferFrom(payer, recipient, amount);
      const receipt = await transferTx.wait();
      this.logger.log(`Transfer executed: ${transferTx.hash}`);

      return {
        success: true,
        txHash: transferTx.hash,
      };
    } catch (error) {
      this.logger.error(`Payment processing failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if facilitator has enough gas for transactions
   */
  async checkFacilitatorBalance(): Promise<{ hasBalance: boolean; balance: string }> {
    if (!this.facilitatorWallet) {
      return { hasBalance: false, balance: '0' };
    }

    const balance = await this.provider.getBalance(this.facilitatorWallet.address);
    const hasBalance = balance > ethers.parseEther('0.001'); // Minimum 0.001 MOVE

    return {
      hasBalance,
      balance: ethers.formatEther(balance),
    };
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress: string, address: string): Promise<string> {
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, this.provider);
    const balance = await tokenContract.balanceOf(address);
    return ethers.formatUnits(balance, 18);
  }

  /**
   * Generate EIP-712 typed data for refund permit signing (store signs this)
   */
  async generateRefundData(params: RefundDataParams) {
    const { from, to, amount, tokenAddress, refundId } = params;

    if (!this.facilitatorWallet) {
      throw new Error('Facilitator not configured');
    }

    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, this.provider);

    // Get nonce for the store (signer)
    const nonce = await tokenContract.nonces(from);
    const name = await tokenContract.name();

    // Calculate deadline (1 hour from now)
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Convert amount to wei (assuming 18 decimals)
    const amountWei = ethers.parseUnits(amount, 18);

    // EIP-712 domain
    const domain = {
      name,
      version: '1',
      chainId: this.chainId,
      verifyingContract: tokenAddress,
    };

    // Permit types
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    // Permit message - store allows facilitator to transfer tokens
    const message = {
      owner: from,  // Store wallet
      spender: this.facilitatorWallet.address,
      value: amountWei.toString(),
      nonce: nonce.toString(),
      deadline,
    };

    return {
      refundId,
      domain,
      types,
      message,
      primaryType: 'Permit',
      deadline,
      nonce: nonce.toString(),
      facilitatorAddress: this.facilitatorWallet.address,
      recipient: to,  // Customer wallet
      amountWei: amountWei.toString(),
    };
  }

  /**
   * Process refund with permit signature
   * 1. Execute permit to approve facilitator (signed by store)
   * 2. Execute transferFrom to move tokens from store to customer
   */
  async processRefund(params: ProcessRefundParams): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const { refundId, from, to, amount, tokenAddress, signature, deadline, v, r, s } = params;

    if (!this.facilitatorWallet) {
      return { success: false, error: 'Facilitator not configured' };
    }

    try {
      const amountWei = ethers.parseUnits(amount, 18);

      this.logger.log(`Processing refund ${refundId}:`);
      this.logger.log(`  From (Store): ${from}`);
      this.logger.log(`  To (Customer): ${to}`);
      this.logger.log(`  Amount: ${amount}`);
      this.logger.log(`  Token: ${tokenAddress}`);

      // Parse signature components
      let sigV = v;
      let sigR = r;
      let sigS = s;

      if (!sigV || !sigR || !sigS) {
        const sig = ethers.Signature.from(signature);
        sigV = sig.v;
        sigR = sig.r;
        sigS = sig.s;
      }

      // Use NonceManager to handle nonce synchronization properly
      const managedWallet = new NonceManager(this.facilitatorWallet);

      const tokenContract = new ethers.Contract(
        tokenAddress,
        TOKEN_ABI,
        managedWallet,
      );

      // Step 1: Execute permit (store approved facilitator)
      this.logger.log('Executing refund permit...');
      const permitTx = await tokenContract.permit(
        from,  // Store wallet (owner)
        this.facilitatorWallet.address,
        amountWei,
        deadline,
        sigV,
        sigR,
        sigS,
      );
      await permitTx.wait();
      this.logger.log(`Refund permit executed: ${permitTx.hash}`);

      // Step 2: Execute transferFrom (store to customer)
      this.logger.log('Executing refund transfer...');
      const transferTx = await tokenContract.transferFrom(from, to, amountWei);
      await transferTx.wait();
      this.logger.log(`Refund transfer executed: ${transferTx.hash}`);

      return {
        success: true,
        txHash: transferTx.hash,
      };
    } catch (error) {
      this.logger.error(`Refund processing failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
