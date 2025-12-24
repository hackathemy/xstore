import { defineChain } from 'viem'

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
