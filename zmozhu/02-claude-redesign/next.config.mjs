/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Статичний експорт: після `npm run build` готовий сайт лежить у `out/`
  // і його можна викласти на будь-який хостинг (Vercel, Netlify, Cloudflare Pages, звичайний nginx).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
