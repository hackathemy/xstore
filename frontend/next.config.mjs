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
  // Proxy API requests to backend server
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
      // Backend API proxy
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
