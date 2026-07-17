const nextConfig = {
  transpilePackages: ['@ultimate-pos/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
