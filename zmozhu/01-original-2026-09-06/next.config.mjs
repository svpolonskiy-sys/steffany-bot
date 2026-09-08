/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  distDir: process.env.NEXT_BUILD_DIR || ".next",
};

export default nextConfig;
