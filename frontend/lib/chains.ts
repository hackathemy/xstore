import { defineChain } from 'viem'

// ===========================================
// Movement Network Chains (MEVM - EVM Compatible)
// ===========================================
// Movement Network는 Move VM 기반 L2이지만,
// MEVM 레이어를 통해 EVM 호환성을 제공합니다.
// Solidity 컨트랙트와 EVM 툴체인 사용 가능.

// Local Development (Hardhat)
export const hardhatLocal = defineChain({
  id: 31337,
  name: 'Local Development',
  network: 'hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  testnet: true,
})

// Movement Network Mainnet
export const movement = defineChain({
  id: 3073,
  name: 'Movement',
  network: 'movement',
  nativeCurrency: {
    decimals: 18,
    name: 'Move',
    symbol: 'MOVE',
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.movementnetwork.xyz/v1'],
    },
    public: {
      http: ['https://mainnet.movementnetwork.xyz/v1'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Movement Explorer',
      url: 'https://explorer.movementlabs.xyz',
    },
  },
})

// Movement Testnet (optional)
export const movementTestnet = defineChain({
  id: 30732,
  name: 'Movement Testnet',
  network: 'movement-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Move',
    symbol: 'MOVE',
  },
  rpcUrls: {
    default: {
      http: ['https://mevm.testnet.imola.movementlabs.xyz'],
    },
    public: {
      http: ['https://mevm.testnet.imola.movementlabs.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Movement Explorer',
      url: 'https://explorer.movementlabs.xyz',
    },
  },
  testnet: true,
})
