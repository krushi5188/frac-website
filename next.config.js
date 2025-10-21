/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for hosting
  images: {
    unoptimized: true, // Required for static export
  },
}

module.exports = nextConfig
