/**
 * Movement Network Configuration (Move Native)
 * Aptos-compatible Move VM based network
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// ===========================================
// Movement Network (Move Native)
// ===========================================

export interface MovementNetworkConfig {
  name: string;
  nodeUrl: string;
  faucetUrl?: string;
  explorerUrl: string;
  chainId: number;
  isTestnet: boolean;
}

// Movement Testnet (Bardock)
export const MOVEMENT_TESTNET: MovementNetworkConfig = {
  name: 'Movement Testnet',
  nodeUrl: 'https://aptos.testnet.bardock.movementlabs.xyz/v1',
  faucetUrl: 'https://faucet.testnet.bardock.movementlabs.xyz',
  explorerUrl: 'https://explorer.movementlabs.xyz/?network=bardock+testnet',
  chainId: 250,
  isTestnet: true,
};

// Movement Mainnet
export const MOVEMENT_MAINNET: MovementNetworkConfig = {
  name: 'Movement Mainnet',
  nodeUrl: 'https://mainnet.movementnetwork.xyz/v1',
  explorerUrl: 'https://explorer.movementlabs.xyz/?network=mainnet',
  chainId: 126,
  isTestnet: false,
};

// Local Development (Movement local node)
export const MOVEMENT_LOCAL: MovementNetworkConfig = {
  name: 'Movement Local',
  nodeUrl: 'http://127.0.0.1:8080/v1',
  faucetUrl: 'http://127.0.0.1:8081',
  explorerUrl: 'http://localhost:8080',
  chainId: 4,
  isTestnet: true,
};

// Get active network based on environment
export function getActiveNetwork(): MovementNetworkConfig {
  const env = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  switch (env) {
    case 'mainnet':
      return MOVEMENT_MAINNET;
    case 'local':
      return MOVEMENT_LOCAL;
    case 'testnet':
    default:
      return MOVEMENT_TESTNET;
  }
}

// Create Aptos client for Movement network
export function createMovementClient(network?: MovementNetworkConfig): Aptos {
  const activeNetwork = network || getActiveNetwork();

  const config = new AptosConfig({
    fullnode: activeNetwork.nodeUrl,
    faucet: activeNetwork.faucetUrl,
  });

  return new Aptos(config);
}

// Native MOVE coin type
export const MOVE_COIN_TYPE = '0x1::aptos_coin::AptosCoin';

// ===========================================
// Stablecoin Configuration
// Movement uses LayerZero bridged tokens (USDCe, USDTe)
// ===========================================

export interface StablecoinConfig {
  symbol: string;
  name: string;
  coinType: string;
  decimals: number;
  logoUrl?: string;
}

// Stablecoin addresses on Movement Network
// These are LayerZero bridged tokens from Ethereum
// Format: {deployer_address}::{module}::{CoinType}

// Movement Mainnet Stablecoins (LayerZero bridged)
export const MAINNET_STABLECOINS: Record<string, StablecoinConfig> = {
  USDC: {
    symbol: 'USDCe',
    name: 'USD Coin (LayerZero)',
    // LayerZero USDC on Movement Mainnet
    coinType: process.env.NEXT_PUBLIC_USDC_COIN_TYPE ||
      '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::usdc::USDC',
    decimals: 6,
  },
  USDT: {
    symbol: 'USDTe',
    name: 'Tether USD (LayerZero)',
    // LayerZero USDT on Movement Mainnet
    coinType: process.env.NEXT_PUBLIC_USDT_COIN_TYPE ||
      '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::usdt::USDT',
    decimals: 6,
  },
};

// Movement Testnet Stablecoins (may differ from mainnet)
export const TESTNET_STABLECOINS: Record<string, StablecoinConfig> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Test)',
    // Test USDC on Bardock Testnet - configure via env
    coinType: process.env.NEXT_PUBLIC_TESTNET_USDC_COIN_TYPE ||
      '0x1::aptos_coin::AptosCoin', // Fallback to native MOVE for testing
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD (Test)',
    coinType: process.env.NEXT_PUBLIC_TESTNET_USDT_COIN_TYPE ||
      '0x1::aptos_coin::AptosCoin', // Fallback to native MOVE for testing
    decimals: 6,
  },
};

// Get stablecoins for current network
export function getStablecoins(): Record<string, StablecoinConfig> {
  const network = getActiveNetwork();
  return network.isTestnet ? TESTNET_STABLECOINS : MAINNET_STABLECOINS;
}

// Get default payment stablecoin (USDC)
export function getPaymentStablecoin(): StablecoinConfig {
  const stablecoins = getStablecoins();
  return stablecoins.USDC;
}

// Get coin type for a stablecoin symbol
export function getStablecoinType(symbol: 'USDC' | 'USDT'): string {
  const stablecoins = getStablecoins();
  return stablecoins[symbol]?.coinType || MOVE_COIN_TYPE;
}

// Parse stablecoin amount (6 decimals for USDC/USDT)
export function parseStablecoinAmount(amount: number | string, decimals: number = 6): bigint {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(num * Math.pow(10, decimals)));
}

// Format stablecoin amount
export function formatStablecoinAmount(amount: bigint | string, decimals: number = 6): string {
  const num = typeof amount === 'string' ? BigInt(amount) : amount;
  return (Number(num) / Math.pow(10, decimals)).toFixed(2);
}

// Format address to standard format (0x + 64 hex chars)
export function formatMoveAddress(address: string): string {
  const clean = address.toLowerCase().replace('0x', '');
  return '0x' + clean.padStart(64, '0');
}

// Shorten address for display
export function shortenMoveAddress(address: string): string {
  const formatted = formatMoveAddress(address);
  return `${formatted.slice(0, 6)}...${formatted.slice(-4)}`;
}

// Convert MOVE amount (8 decimals)
export const MOVE_DECIMALS = 8;

export function parseMoveAmount(amount: number | string): bigint {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(num * Math.pow(10, MOVE_DECIMALS)));
}

export function formatMoveAmount(amount: bigint | string): string {
  const num = typeof amount === 'string' ? BigInt(amount) : amount;
  return (Number(num) / Math.pow(10, MOVE_DECIMALS)).toFixed(MOVE_DECIMALS);
}
