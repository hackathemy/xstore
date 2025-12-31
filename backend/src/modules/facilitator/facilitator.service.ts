import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Aptos,
  AptosConfig,
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  InputGenerateTransactionPayloadData,
} from '@aptos-labs/ts-sdk';
import { PrismaService } from '../../common/prisma/prisma.service';

// Movement Network Configuration
interface MovementNetworkConfig {
  name: string;
  nodeUrl: string;
  faucetUrl?: string;
  chainId: number;
}

const MOVEMENT_TESTNET: MovementNetworkConfig = {
  name: 'Movement Testnet',
  nodeUrl: 'https://aptos.testnet.bardock.movementlabs.xyz/v1',
  faucetUrl: 'https://faucet.testnet.bardock.movementlabs.xyz',
  chainId: 250,
};

const MOVEMENT_LOCAL: MovementNetworkConfig = {
  name: 'Movement Local',
  nodeUrl: 'http://127.0.0.1:8080/v1',
  faucetUrl: 'http://127.0.0.1:8081',
  chainId: 4,
};

// MOVE decimals (8 for Aptos-compatible)
const MOVE_DECIMALS = 8;

interface PaymentDataParams {
  paymentId: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress?: string; // Not used in Move, kept for compatibility
}

interface ProcessPaymentParams {
  paymentId: string;
  txHash: string; // In Move, we verify txHash instead of processing signature
}

interface RefundDataParams {
  refundId: string;
  from: string;
  to: string;
  amount: string;
}

@Injectable()
export class FacilitatorService {
  private readonly logger = new Logger(FacilitatorService.name);
  private client: Aptos;
  private facilitatorAccount: Account | null = null;
  private readonly networkConfig: MovementNetworkConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Determine network
    const isDev = this.configService.get<string>('NODE_ENV') === 'development';
    this.networkConfig = isDev ? MOVEMENT_LOCAL : MOVEMENT_TESTNET;

    // Override with config if provided
    const nodeUrl = this.configService.get<string>('MOVEMENT_NODE_URL');
    if (nodeUrl) {
      this.networkConfig.nodeUrl = nodeUrl;
    }

    // Initialize Aptos client
    const config = new AptosConfig({
      fullnode: this.networkConfig.nodeUrl,
      faucet: this.networkConfig.faucetUrl,
    });
    this.client = new Aptos(config);

    // Initialize facilitator account
    const privateKey = this.configService.get<string>('FACILITATOR_PRIVATE_KEY');
    if (privateKey) {
      try {
        const ed25519Key = new Ed25519PrivateKey(privateKey);
        this.facilitatorAccount = Account.fromPrivateKey({ privateKey: ed25519Key });
        this.logger.log(`Facilitator account initialized: ${this.facilitatorAccount.accountAddress.toString()}`);
      } catch (error) {
        this.logger.warn('Failed to initialize facilitator account. Using verification-only mode.');
      }
    } else {
      this.logger.warn('FACILITATOR_PRIVATE_KEY not set - operating in verification-only mode');
    }

    this.logger.log(`Connected to ${this.networkConfig.name}: ${this.networkConfig.nodeUrl}`);
  }

  /**
   * Get facilitator account address
   */
  getFacilitatorAddress(): string | null {
    return this.facilitatorAccount?.accountAddress.toString() || null;
  }

  /**
   * Generate payment data for Move transaction
   * Unlike EVM, Move doesn't need signatures for approval
   * The client will directly execute the transfer
   */
  async generatePaymentData(params: PaymentDataParams) {
    const { from, to, amount, paymentId } = params;

    // Convert amount to octas (8 decimals)
    const amountInOctas = this.parseAmount(amount);

    return {
      paymentId,
      network: this.networkConfig.name,
      moduleAddress: '0x1', // Native transfer module
      function: '0x1::aptos_account::transfer',
      recipient: to,
      amount: amountInOctas.toString(),
      amountFormatted: amount,
    };
  }

  /**
   * Process/verify payment transaction
   * In Move, we verify the transaction was successful on-chain
   */
  async processPayment(params: ProcessPaymentParams): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const { paymentId, txHash } = params;

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

      // Verify transaction on-chain
      const txInfo = await this.client.getTransactionByHash({ transactionHash: txHash });

      if (!txInfo) {
        return { success: false, error: 'Transaction not found on chain' };
      }

      // Check if transaction was successful
      if ('success' in txInfo && !txInfo.success) {
        return { success: false, error: 'Transaction failed on chain' };
      }

      this.logger.log(`Payment ${paymentId} verified: ${txHash}`);

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Check facilitator account balance
   */
  async checkFacilitatorBalance(): Promise<{ hasBalance: boolean; balance: string }> {
    if (!this.facilitatorAccount) {
      return { hasBalance: false, balance: '0' };
    }

    try {
      const resources = await this.client.getAccountResources({
        accountAddress: this.facilitatorAccount.accountAddress,
      });

      const coinStore = resources.find(
        (r) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
      );

      if (coinStore) {
        const balance = (coinStore.data as { coin: { value: string } }).coin.value;
        const formattedBalance = this.formatAmount(BigInt(balance));
        return {
          hasBalance: BigInt(balance) > BigInt(1000000), // > 0.01 MOVE
          balance: formattedBalance,
        };
      }

      return { hasBalance: false, balance: '0' };
    } catch (error) {
      this.logger.error('Error checking balance:', error);
      return { hasBalance: false, balance: '0' };
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(address: string): Promise<string> {
    try {
      const resources = await this.client.getAccountResources({
        accountAddress: AccountAddress.from(address),
      });

      const coinStore = resources.find(
        (r) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
      );

      if (coinStore) {
        const balance = (coinStore.data as { coin: { value: string } }).coin.value;
        return this.formatAmount(BigInt(balance));
      }

      return '0';
    } catch (error) {
      return '0';
    }
  }

  /**
   * Generate refund data
   */
  async generateRefundData(params: RefundDataParams) {
    const { from, to, amount, refundId } = params;
    const amountInOctas = this.parseAmount(amount);

    return {
      refundId,
      network: this.networkConfig.name,
      moduleAddress: '0x1',
      function: '0x1::aptos_account::transfer',
      from,
      recipient: to,
      amount: amountInOctas.toString(),
      amountFormatted: amount,
    };
  }

  /**
   * Process refund (if facilitator has funds)
   */
  async processRefund(params: {
    refundId: string;
    to: string;
    amount: string;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.facilitatorAccount) {
      return { success: false, error: 'Facilitator account not configured' };
    }

    try {
      const amountInOctas = this.parseAmount(params.amount);

      const payload: InputGenerateTransactionPayloadData = {
        function: '0x1::aptos_account::transfer',
        functionArguments: [
          AccountAddress.from(params.to),
          amountInOctas,
        ],
      };

      // Build transaction
      const transaction = await this.client.transaction.build.simple({
        sender: this.facilitatorAccount.accountAddress,
        data: payload,
      });

      // Sign transaction
      const senderAuthenticator = this.client.transaction.sign({
        signer: this.facilitatorAccount,
        transaction,
      });

      // Submit transaction
      const pendingTx = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      // Wait for confirmation
      const txResult = await this.client.waitForTransaction({
        transactionHash: pendingTx.hash,
      });

      this.logger.log(`Refund ${params.refundId} processed: ${txResult.hash}`);

      return {
        success: true,
        txHash: txResult.hash,
      };
    } catch (error) {
      this.logger.error(`Refund processing failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  /**
   * Parse amount string to octas (8 decimals)
   */
  private parseAmount(amount: string): bigint {
    const num = parseFloat(amount);
    return BigInt(Math.floor(num * Math.pow(10, MOVE_DECIMALS)));
  }

  /**
   * Format octas to human-readable amount
   */
  private formatAmount(octas: bigint): string {
    return (Number(octas) / Math.pow(10, MOVE_DECIMALS)).toFixed(MOVE_DECIMALS);
  }

  /**
   * Get network info
   */
  getNetworkInfo() {
    return {
      name: this.networkConfig.name,
      nodeUrl: this.networkConfig.nodeUrl,
      chainId: this.networkConfig.chainId,
      facilitatorAddress: this.getFacilitatorAddress(),
    };
  }
}
