import { Injectable, Logger } from '@nestjs/common';
import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  InputEntryFunctionData,
} from '@aptos-labs/ts-sdk';

// TUSDC coin type - deployed to Movement testnet
const TUSDC_COIN_TYPE = process.env.TESTNET_USDC_COIN_TYPE ||
  '0x60a2f32cde9ddf5b3e73e207f124642390ef839d8b76d05d009235b0dc4b20ce::tusdc::TUSDC';
const TUSDC_MODULE_ADDRESS = '0x60a2f32cde9ddf5b3e73e207f124642390ef839d8b76d05d009235b0dc4b20ce';
const TUSDC_MODULE_NAME = 'tusdc';
const MOVEMENT_NODE_URL = process.env.MOVEMENT_NODE_URL || 'https://testnet.movementnetwork.xyz/v1';

// Faucet configuration
const FAUCET_AMOUNT_TUSDC = 100; // 100 TUSDC per request
const FAUCET_AMOUNT_SMALLEST = FAUCET_AMOUNT_TUSDC * 1_000_000; // 6 decimals

export interface FaucetResult {
  success: boolean;
  txHash?: string;
  amount?: string;
  error?: string;
}

@Injectable()
export class FaucetService {
  private readonly logger = new Logger(FaucetService.name);
  private aptos: Aptos;
  private signerAccount: Account | null = null;

  constructor() {
    // Initialize Aptos SDK with Movement Network configuration
    const aptosConfig = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: MOVEMENT_NODE_URL,
    });
    this.aptos = new Aptos(aptosConfig);

    // Initialize signer account from private key
    const privateKey = process.env.MOVEMENT_SIGNER_PRIVATE_KEY;
    if (privateKey) {
      try {
        const ed25519Key = new Ed25519PrivateKey(privateKey);
        this.signerAccount = Account.fromPrivateKey({ privateKey: ed25519Key });
        this.logger.log(`Faucet signer initialized: ${this.signerAccount.accountAddress.toString()}`);
      } catch (error) {
        this.logger.error(`Failed to initialize signer account: ${error}`);
      }
    } else {
      this.logger.warn('MOVEMENT_SIGNER_PRIVATE_KEY not set. Faucet mint will not work.');
    }
  }

  /**
   * Request TUSDC tokens from faucet
   * Uses Aptos SDK to mint TUSDC to recipient with auto-registration
   */
  async requestTokens(recipientAddress: string): Promise<FaucetResult> {
    try {
      if (!this.signerAccount) {
        return {
          success: false,
          error: 'Faucet signer not configured',
        };
      }

      // Validate address format (64 hex chars)
      const cleanAddress = recipientAddress.startsWith('0x')
        ? recipientAddress.slice(2)
        : recipientAddress;

      if (!/^[0-9a-fA-F]{64}$/.test(cleanAddress)) {
        return {
          success: false,
          error: `Invalid Move address format. Expected 64 hex characters, got ${cleanAddress.length}`,
        };
      }

      const formattedAddress = `0x${cleanAddress}`;

      this.logger.log(`🚰 Faucet request: ${FAUCET_AMOUNT_TUSDC} TUSDC to ${formattedAddress}`);

      // Try to call mint_to which should auto-register if available
      // If that fails, try the standard mint function
      try {
        // First attempt: Use mint_to (auto-registers recipient)
        const transaction = await this.aptos.transaction.build.simple({
          sender: this.signerAccount.accountAddress,
          data: {
            function: `${TUSDC_MODULE_ADDRESS}::${TUSDC_MODULE_NAME}::mint_to`,
            functionArguments: [formattedAddress, FAUCET_AMOUNT_SMALLEST],
          } as InputEntryFunctionData,
        });

        const pendingTx = await this.aptos.signAndSubmitTransaction({
          signer: this.signerAccount,
          transaction,
        });

        const committedTx = await this.aptos.waitForTransaction({
          transactionHash: pendingTx.hash,
        });

        if (committedTx.success) {
          this.logger.log(`✅ Faucet mint_to successful: ${pendingTx.hash}`);
          return {
            success: true,
            txHash: pendingTx.hash,
            amount: `${FAUCET_AMOUNT_TUSDC} TUSDC`,
          };
        } else {
          throw new Error(`Transaction failed: ${(committedTx as any).vm_status || 'Unknown error'}`);
        }
      } catch (mintToError) {
        // mint_to not available, try standard mint
        this.logger.debug(`mint_to failed, trying standard mint: ${mintToError}`);

        const transaction = await this.aptos.transaction.build.simple({
          sender: this.signerAccount.accountAddress,
          data: {
            function: `${TUSDC_MODULE_ADDRESS}::${TUSDC_MODULE_NAME}::mint`,
            functionArguments: [formattedAddress, FAUCET_AMOUNT_SMALLEST],
          } as InputEntryFunctionData,
        });

        const pendingTx = await this.aptos.signAndSubmitTransaction({
          signer: this.signerAccount,
          transaction,
        });

        const committedTx = await this.aptos.waitForTransaction({
          transactionHash: pendingTx.hash,
        });

        if (committedTx.success) {
          this.logger.log(`✅ Faucet mint successful: ${pendingTx.hash}`);
          return {
            success: true,
            txHash: pendingTx.hash,
            amount: `${FAUCET_AMOUNT_TUSDC} TUSDC`,
          };
        } else {
          // Check if the error is about CoinStore not registered
          const vmStatus = (committedTx as any).vm_status || '';
          if (vmStatus.includes('ECOIN_STORE_NOT_PUBLISHED')) {
            return {
              success: false,
              error: 'Account not registered for TUSDC. Please register your account first by calling the register endpoint.',
            };
          }
          throw new Error(`Transaction failed: ${vmStatus || 'Unknown error'}`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Faucet mint failed: ${error}`);
      const errorMessage = error instanceof Error ? error.message : 'Faucet request failed';

      // Provide helpful error message for CoinStore registration
      if (errorMessage.includes('ECOIN_STORE_NOT_PUBLISHED')) {
        return {
          success: false,
          error: 'Account not registered for TUSDC. The recipient account needs to register for the TUSDC coin type first.',
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get faucet info
   */
  getFaucetInfo() {
    return {
      tokenName: 'Test USD Coin',
      tokenSymbol: 'TUSDC',
      coinType: TUSDC_COIN_TYPE,
      decimals: 6,
      amountPerRequest: `${FAUCET_AMOUNT_TUSDC} TUSDC`,
      network: 'Movement Testnet',
      nodeUrl: MOVEMENT_NODE_URL,
      signerConfigured: !!this.signerAccount,
    };
  }

  /**
   * Check TUSDC balance for an address
   */
  async getBalance(address: string): Promise<string> {
    try {
      const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
      const formattedAddress = `0x${cleanAddress}`;

      // Use view function to get balance
      const [balance] = await this.aptos.view({
        payload: {
          function: `${TUSDC_MODULE_ADDRESS}::${TUSDC_MODULE_NAME}::balance`,
          functionArguments: [formattedAddress],
        },
      });

      if (balance !== undefined) {
        return (Number(balance) / 1_000_000).toFixed(6);
      }

      return '0';
    } catch (error) {
      this.logger.debug(`Could not get balance for ${address}: ${error}`);
      return '0';
    }
  }
}
