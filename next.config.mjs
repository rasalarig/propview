/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', '@anthropic-ai/sdk', 'openai'],
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
