/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    // When running on Vercel or cloud deployments, bypass local loopback rewrites
    // so requests to /api/:path* are served directly by Next.js App Router API routes
    if (process.env.VERCEL || (!process.env.BACKEND_URL && process.env.NODE_ENV === 'production')) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL || 'http://127.0.0.1:5001/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/socket.io/:path*` : 'http://127.0.0.1:5001/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
