/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // Proxy Movement RPC requests to avoid CORS issues
  async rewrites() {
    return [
      {
        source: '/movement-rpc/:path*',
        destination: 'https://testnet.movementnetwork.xyz/v1/:path*',
      },
      {
        source: '/movement-mainnet/:path*',
        destination: 'https://mainnet.movementnetwork.xyz/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
