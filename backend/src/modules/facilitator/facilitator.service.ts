import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Aptos,
  AptosConfig,
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  InputGenerateTransactionPayloadData,
  AccountAuthenticator,
  Deserializer,
  SimpleTransaction,
  Network,
} from '@aptos-labs/ts-sdk';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  X402PaymentRequired,
  X402PaymentReceipt,
  X402PaymentHeader,
  X402VerificationResult,
  X402_DEFAULT_EXPIRY_MS,
  StablecoinSymbol,
} from '../../common/x402';

// Movement Network Configuration
interface MovementNetworkConfig {
  name: string;
  nodeUrl: string;
  faucetUrl?: string;
  chainId: number;
  isTestnet: boolean;
}

const MOVEMENT_TESTNET: MovementNetworkConfig = {
  name: 'Movement Testnet',
  nodeUrl: 'https://aptos.testnet.bardock.movementlabs.xyz/v1',
  faucetUrl: 'https://faucet.testnet.bardock.movementlabs.xyz',
  chainId: 250,
  isTestnet: true,
};

const MOVEMENT_MAINNET: MovementNetworkConfig = {
  name: 'Movement Mainnet',
  nodeUrl: 'https://mainnet.movementnetwork.xyz/v1',
  chainId: 126,
  isTestnet: false,
};

const MOVEMENT_LOCAL: MovementNetworkConfig = {
  name: 'Movement Local',
  nodeUrl: 'http://127.0.0.1:8080/v1',
  faucetUrl: 'http://127.0.0.1:8081',
  chainId: 4,
  isTestnet: true,
};

// Coin decimals
const MOVE_DECIMALS = 8;
const STABLECOIN_DECIMALS = 6;

/**
 * Validate Move address format (64 hex chars / 32 bytes).
 * Only accepts Move format addresses.
 */
function validateMoveAddress(address: string): string {
  // Remove 0x prefix if present
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;

  // Validate hex characters
  if (!/^[0-9a-fA-F]+$/.test(cleanAddress)) {
    throw new Error(`Invalid Move address: contains non-hex characters - ${address}`);
  }

  // Move addresses must be exactly 64 hex chars (32 bytes)
  if (cleanAddress.length !== 64) {
    throw new Error(
      `Invalid Move address: expected 64 hex chars, got ${cleanAddress.length} - ${address}`
    );
  }

  return `0x${cleanAddress}`;
}

// Native MOVE coin type
const MOVE_COIN_TYPE = '0x1::aptos_coin::AptosCoin';

// Stablecoin configuration
interface StablecoinConfig {
  symbol: string;
  name: string;
  coinType: string;
  decimals: number;
}

// Mainnet stablecoins (LayerZero bridged)
const MAINNET_STABLECOINS: Record<string, StablecoinConfig> = {
  USDC: {
    symbol: 'USDCe',
    name: 'USD Coin (LayerZero)',
    coinType: process.env.USDC_COIN_TYPE ||
      '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::usdc::USDC',
    decimals: STABLECOIN_DECIMALS,
  },
  USDT: {
    symbol: 'USDTe',
    name: 'Tether USD (LayerZero)',
    coinType: process.env.USDT_COIN_TYPE ||
      '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::usdt::USDT',
    decimals: STABLECOIN_DECIMALS,
  },
};

// Testnet stablecoins
const TESTNET_STABLECOINS: Record<string, StablecoinConfig> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Test)',
    coinType: process.env.TESTNET_USDC_COIN_TYPE || MOVE_COIN_TYPE,
    decimals: STABLECOIN_DECIMALS,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD (Test)',
    coinType: process.env.TESTNET_USDT_COIN_TYPE || MOVE_COIN_TYPE,
    decimals: STABLECOIN_DECIMALS,
  },
};

interface PaymentDataParams {
  paymentId: string;
  from: string;
  to: string;
  amount: string;
  coinType?: string; // Coin type for stablecoin payments (USDC, USDT, etc.)
  useStablecoin?: boolean; // Whether to use stablecoin for payment
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
  coinType?: string; // Coin type for stablecoin refunds
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
      network: Network.CUSTOM,
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
   * Get stablecoins for current network
   */
  getStablecoins(): Record<string, StablecoinConfig> {
    return this.networkConfig.isTestnet ? TESTNET_STABLECOINS : MAINNET_STABLECOINS;
  }

  /**
   * Get default payment stablecoin (USDC)
   */
  getPaymentStablecoin(): StablecoinConfig {
    return this.getStablecoins().USDC;
  }

  /**
   * Check if using stablecoin payments
   */
  isStablecoinEnabled(): boolean {
    return process.env.USE_STABLECOIN !== 'false';
  }

  /**
   * Get facilitator account address
   */
  getFacilitatorAddress(): string | null {
    return this.facilitatorAccount?.accountAddress.toString() || null;
  }

  /**
   * Generate payment data for Move transaction
   * Move uses coin::transfer with Fee Payer pattern
   * Facilitator pays gas fees, client executes transfer
   */
  async generatePaymentData(params: PaymentDataParams) {
    const { from, to, amount, paymentId, coinType, useStablecoin } = params;

    // Determine coin type and decimals
    const shouldUseStablecoin = useStablecoin ?? this.isStablecoinEnabled();
    const stablecoin = this.getPaymentStablecoin();
    const targetCoinType = coinType || (shouldUseStablecoin ? stablecoin.coinType : MOVE_COIN_TYPE);
    const isStablecoin = targetCoinType !== MOVE_COIN_TYPE;
    const decimals = isStablecoin ? STABLECOIN_DECIMALS : MOVE_DECIMALS;

    // Convert amount based on coin type
    const amountInSmallestUnit = this.parseAmountWithDecimals(amount, decimals);

    // Determine transfer function based on coin type
    const transferFunction = isStablecoin
      ? '0x1::coin::transfer' // Generic coin transfer with type argument
      : '0x1::aptos_account::transfer'; // Native MOVE transfer

    return {
      paymentId,
      network: this.networkConfig.name,
      moduleAddress: '0x1',
      function: transferFunction,
      recipient: to,
      amount: amountInSmallestUnit.toString(),
      amountFormatted: amount,
      coinType: targetCoinType,
      isStablecoin,
      stablecoinSymbol: isStablecoin ? stablecoin.symbol : 'MOVE',
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
   * @param address - Wallet address
   * @param coinType - Optional coin type (defaults to MOVE if not specified)
   */
  async getTokenBalance(address: string, coinType?: string): Promise<string> {
    try {
      const targetCoinType = coinType || MOVE_COIN_TYPE;
      const isStablecoin = targetCoinType !== MOVE_COIN_TYPE;
      const decimals = isStablecoin ? STABLECOIN_DECIMALS : MOVE_DECIMALS;

      const resources = await this.client.getAccountResources({
        accountAddress: AccountAddress.from(address),
      });

      const coinStore = resources.find(
        (r) => r.type === `0x1::coin::CoinStore<${targetCoinType}>`,
      );

      if (coinStore) {
        const balance = (coinStore.data as { coin: { value: string } }).coin.value;
        return this.formatAmountWithDecimals(BigInt(balance), decimals);
      }

      return '0';
    } catch (error) {
      return '0';
    }
  }

  /**
   * Get stablecoin balance for an address (convenience method)
   */
  async getStablecoinBalance(address: string, symbol: 'USDC' | 'USDT' = 'USDC'): Promise<string> {
    const stablecoins = this.getStablecoins();
    const stablecoin = stablecoins[symbol];
    return this.getTokenBalance(address, stablecoin?.coinType);
  }

  /**
   * Generate refund data
   */
  async generateRefundData(params: RefundDataParams) {
    const { from, to, amount, refundId, coinType } = params;

    // Determine coin type and decimals
    const stablecoin = this.getPaymentStablecoin();
    const targetCoinType = coinType || (this.isStablecoinEnabled() ? stablecoin.coinType : MOVE_COIN_TYPE);
    const isStablecoin = targetCoinType !== MOVE_COIN_TYPE;
    const decimals = isStablecoin ? STABLECOIN_DECIMALS : MOVE_DECIMALS;

    const amountInSmallestUnit = this.parseAmountWithDecimals(amount, decimals);

    // Determine transfer function based on coin type
    const transferFunction = isStablecoin
      ? '0x1::coin::transfer'
      : '0x1::aptos_account::transfer';

    return {
      refundId,
      network: this.networkConfig.name,
      moduleAddress: '0x1',
      function: transferFunction,
      from,
      recipient: to,
      amount: amountInSmallestUnit.toString(),
      amountFormatted: amount,
      coinType: targetCoinType,
      isStablecoin,
    };
  }

  /**
   * Process refund (if facilitator has funds)
   * Supports both native MOVE and stablecoin refunds
   */
  async processRefund(params: {
    refundId: string;
    to: string;
    amount: string;
    coinType?: string;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.facilitatorAccount) {
      return { success: false, error: 'Facilitator account not configured' };
    }

    try {
      // Determine coin type and decimals
      const stablecoin = this.getPaymentStablecoin();
      const targetCoinType = params.coinType || (this.isStablecoinEnabled() ? stablecoin.coinType : MOVE_COIN_TYPE);
      const isStablecoin = targetCoinType !== MOVE_COIN_TYPE;
      const decimals = isStablecoin ? STABLECOIN_DECIMALS : MOVE_DECIMALS;

      const amountInSmallestUnit = this.parseAmountWithDecimals(params.amount, decimals);

      let payload: InputGenerateTransactionPayloadData;

      if (isStablecoin) {
        // Stablecoin refund using coin::transfer with type argument
        payload = {
          function: '0x1::coin::transfer',
          typeArguments: [targetCoinType],
          functionArguments: [
            AccountAddress.from(params.to),
            amountInSmallestUnit,
          ],
        };
        this.logger.log(`💵 Processing stablecoin refund: ${targetCoinType}`);
      } else {
        // Native MOVE refund
        payload = {
          function: '0x1::aptos_account::transfer',
          functionArguments: [
            AccountAddress.from(params.to),
            amountInSmallestUnit,
          ],
        };
      }

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
   * Parse amount string to octas (8 decimals) - for native MOVE
   */
  private parseAmount(amount: string): bigint {
    return this.parseAmountWithDecimals(amount, MOVE_DECIMALS);
  }

  /**
   * Parse amount string with custom decimals
   */
  private parseAmountWithDecimals(amount: string, decimals: number): bigint {
    const num = parseFloat(amount);
    return BigInt(Math.floor(num * Math.pow(10, decimals)));
  }

  /**
   * Format octas to human-readable amount - for native MOVE
   */
  private formatAmount(octas: bigint): string {
    return this.formatAmountWithDecimals(octas, MOVE_DECIMALS);
  }

  /**
   * Format smallest unit to human-readable amount with custom decimals
   */
  private formatAmountWithDecimals(amount: bigint, decimals: number): string {
    return (Number(amount) / Math.pow(10, decimals)).toFixed(decimals);
  }

  /**
   * Get network info
   */
  getNetworkInfo() {
    const stablecoin = this.getPaymentStablecoin();

    return {
      name: this.networkConfig.name,
      nodeUrl: this.networkConfig.nodeUrl,
      chainId: this.networkConfig.chainId,
      isTestnet: this.networkConfig.isTestnet,
      facilitatorAddress: this.getFacilitatorAddress(),
      stablecoinEnabled: this.isStablecoinEnabled(),
      stablecoin: {
        symbol: stablecoin.symbol,
        name: stablecoin.name,
        coinType: stablecoin.coinType,
        decimals: stablecoin.decimals,
      },
      supportedStablecoins: Object.keys(this.getStablecoins()),
    };
  }

  // ==========================================
  // X402 Protocol Methods
  // ==========================================

  /**
   * Generate X402 Payment Required response
   * Used for HTTP 402 responses with full payment details
   */
  generateX402PaymentRequired(params: {
    paymentId: string;
    recipient: string;
    amount: string;
    currency?: StablecoinSymbol;
  }): X402PaymentRequired {
    const { paymentId, recipient, amount, currency = 'USDC' } = params;
    const stablecoins = this.getStablecoins();
    const stablecoin = stablecoins[currency] || stablecoins.USDC;

    // Convert amount to smallest unit
    const amountInSmallestUnit = this.parseAmountWithDecimals(amount, stablecoin.decimals);

    // Determine transfer function
    const isStablecoin = stablecoin.coinType !== MOVE_COIN_TYPE;
    const transferFunction = isStablecoin
      ? 'xstore::payment::pay'  // Use our contract for tracked payments
      : 'xstore::payment::pay_with_move';

    return {
      version: '1.0',
      network: {
        name: this.networkConfig.name,
        chainId: this.networkConfig.chainId.toString(),
        nodeUrl: this.networkConfig.nodeUrl,
      },
      payment: {
        paymentId,
        recipient,
        amount: amountInSmallestUnit.toString(),
        currency: currency,
        coinType: stablecoin.coinType,
        decimals: stablecoin.decimals,
      },
      transaction: {
        function: transferFunction,
        typeArguments: isStablecoin ? [stablecoin.coinType] : [],
        arguments: [paymentId, recipient, amountInSmallestUnit.toString()],
      },
      expiresAt: new Date(Date.now() + X402_DEFAULT_EXPIRY_MS).toISOString(),
      facilitator: {
        address: this.getFacilitatorAddress() || '',
        verifyEndpoint: '/api/x402/verify',
      },
    };
  }

  /**
   * Verify X402 payment from X-Payment header
   */
  async verifyX402Payment(paymentHeader: X402PaymentHeader): Promise<X402VerificationResult> {
    const { paymentId, payer, txHash, timestamp } = paymentHeader;

    try {
      // Check if payment is expired (allow 5 minutes for verification)
      const paymentAge = Date.now() - timestamp;
      if (paymentAge > X402_DEFAULT_EXPIRY_MS) {
        return {
          valid: false,
          paymentId,
          txHash,
          status: 'failed',
          error: 'Payment verification expired',
        };
      }

      // Verify transaction on-chain
      const txInfo = await this.client.getTransactionByHash({ transactionHash: txHash });

      if (!txInfo) {
        return {
          valid: false,
          paymentId,
          txHash,
          status: 'pending',
          error: 'Transaction not found on chain yet',
        };
      }

      // Check transaction success
      if ('success' in txInfo && !txInfo.success) {
        return {
          valid: false,
          paymentId,
          txHash,
          status: 'failed',
          error: 'Transaction failed on chain',
        };
      }

      // Generate receipt
      const receipt: X402PaymentReceipt = {
        paymentId,
        txHash,
        status: 'verified',
        block: 'version' in txInfo ? {
          height: Number(txInfo.version),
          timestamp: 'timestamp' in txInfo ? Number(txInfo.timestamp) : Date.now(),
        } : undefined,
        issuedAt: Date.now(),
      };

      this.logger.log(`X402 Payment verified: ${paymentId} (tx: ${txHash})`);

      return {
        valid: true,
        paymentId,
        txHash,
        status: 'success',
        receipt,
      };
    } catch (error) {
      this.logger.error(`X402 verification failed: ${error}`);
      return {
        valid: false,
        paymentId,
        txHash,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Generate X402 Payment Receipt
   */
  generateX402Receipt(params: {
    paymentId: string;
    txHash: string;
    status: 'verified' | 'pending' | 'failed';
    blockHeight?: number;
    blockTimestamp?: number;
  }): X402PaymentReceipt {
    return {
      paymentId: params.paymentId,
      txHash: params.txHash,
      status: params.status,
      block: params.blockHeight ? {
        height: params.blockHeight,
        timestamp: params.blockTimestamp || Date.now(),
      } : undefined,
      issuedAt: Date.now(),
    };
  }

  /**
   * Build Move transaction payload for stablecoin payment
   */
  buildStablecoinPaymentPayload(params: {
    paymentId: string;
    storeAddress: string;
    amount: string;
    coinType: string;
  }): InputGenerateTransactionPayloadData {
    const { paymentId, storeAddress, amount, coinType } = params;
    const amountBigInt = BigInt(amount);

    // Check if we should use the xstore payment module or direct transfer
    const paymentModuleAddress = process.env.PAYMENT_MODULE_ADDRESS;

    if (paymentModuleAddress) {
      // Use xstore payment contract for tracked payments
      return {
        function: `${paymentModuleAddress}::payment::pay`,
        typeArguments: [coinType],
        functionArguments: [
          paymentId,
          AccountAddress.from(storeAddress),
          amountBigInt,
        ],
      };
    } else {
      // Direct coin transfer
      return {
        function: '0x1::coin::transfer',
        typeArguments: [coinType],
        functionArguments: [
          AccountAddress.from(storeAddress),
          amountBigInt,
        ],
      };
    }
  }

  // ==========================================
  // X402 Fee Payer (Gas Sponsorship) Methods
  // ==========================================

  /**
   * Build a fee payer transaction for the client to sign
   * Client signs as sender, Facilitator will sign as fee payer
   */
  async buildFeePayerTransaction(params: {
    senderAddress: string;
    recipient: string;
    amount: string;
    coinType: string;
  }): Promise<{ transactionBytes: string; feePayerAddress: string }> {
    if (!this.facilitatorAccount) {
      throw new Error('Facilitator account not configured - cannot sponsor gas');
    }

    const { senderAddress, recipient, amount, coinType } = params;
    const isStablecoin = coinType !== MOVE_COIN_TYPE;

    // Validate Move addresses (must be 64 hex chars / 32 bytes)
    const validRecipient = validateMoveAddress(recipient);
    const validSender = validateMoveAddress(senderAddress);

    this.logger.debug(`Validated Move addresses: recipient=${validRecipient}, sender=${validSender}`);

    let payload: InputGenerateTransactionPayloadData;
    if (isStablecoin) {
      payload = {
        function: '0x1::coin::transfer',
        typeArguments: [coinType],
        functionArguments: [AccountAddress.from(validRecipient), BigInt(amount)],
      };
    } else {
      payload = {
        function: '0x1::aptos_account::transfer',
        functionArguments: [AccountAddress.from(validRecipient), BigInt(amount)],
      };
    }

    // Build transaction with fee payer
    const transaction = await this.client.transaction.build.simple({
      sender: AccountAddress.from(validSender),
      data: payload,
      withFeePayer: true,
    });

    // Serialize transaction for client
    const transactionBytes = Buffer.from(transaction.bcsToBytes()).toString('hex');

    return {
      transactionBytes,
      feePayerAddress: this.facilitatorAccount.accountAddress.toString(),
    };
  }

  /**
   * Co-sign and submit a fee payer transaction
   * Client has already signed as sender, Facilitator signs as fee payer
   */
  async submitSponsoredTransaction(params: {
    transactionBytes: string;
    senderAuthenticatorBytes: string;
    paymentId: string;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.facilitatorAccount) {
      return { success: false, error: 'Facilitator account not configured' };
    }

    try {
      const { transactionBytes, senderAuthenticatorBytes, paymentId } = params;

      // Deserialize transaction
      const txBytes = Buffer.from(transactionBytes, 'hex');
      const transaction = SimpleTransaction.deserialize(new Deserializer(txBytes));

      // Deserialize sender authenticator
      const authBytes = Buffer.from(senderAuthenticatorBytes, 'hex');
      const senderAuthenticator = AccountAuthenticator.deserialize(new Deserializer(authBytes));

      // Sign as fee payer
      const feePayerAuthenticator = this.client.transaction.signAsFeePayer({
        signer: this.facilitatorAccount,
        transaction,
      });

      this.logger.log(`💰 Sponsoring gas for payment ${paymentId}`);

      // Submit transaction with both signatures
      const pendingTx = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
        feePayerAuthenticator,
      });

      // Wait for confirmation
      const txResult = await this.client.waitForTransaction({
        transactionHash: pendingTx.hash,
      });

      this.logger.log(`✅ Sponsored transaction confirmed: ${txResult.hash}`);

      return {
        success: true,
        txHash: txResult.hash,
      };
    } catch (error) {
      this.logger.error(`❌ Sponsored transaction failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction submission failed',
      };
    }
  }

  /**
   * Get the Aptos client instance (for frontend transaction building)
   */
  getAptosClient(): Aptos {
    return this.client;
  }

  /**
   * Check if gas sponsorship is available
   * In development mode, skip balance check to allow testing without funding
   */
  async isGasSponsorshipAvailable(): Promise<{
    available: boolean;
    facilitatorAddress?: string;
    balance?: string;
  }> {
    if (!this.facilitatorAccount) {
      return { available: false };
    }

    // In development mode, skip balance check for easier testing
    // Check if NOT production (more robust than checking for exact 'development' string)
    const nodeEnv = this.configService.get<string>('NODE_ENV') || '';
    const isDev = nodeEnv !== 'production';
    this.logger.debug(`NODE_ENV check: "${nodeEnv}", isDev: ${isDev}`);
    if (isDev) {
      this.logger.debug('Development mode: skipping balance check for gas sponsorship');
      return {
        available: true,
        facilitatorAddress: this.facilitatorAccount.accountAddress.toString(),
        balance: '0 (dev mode)',
      };
    }

    const balanceInfo = await this.checkFacilitatorBalance();

    return {
      available: balanceInfo.hasBalance,
      facilitatorAddress: this.facilitatorAccount.accountAddress.toString(),
      balance: balanceInfo.balance,
    };
  }
}
