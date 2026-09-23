// Fuso do hospital também no build/servidor local (ver src/instrumentation.ts).
process.env.TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Foundation phase: don't fail the build on lint; types are still checked by `next build`.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Server Actions are stable in Next 15; keep typed routes off for now.
  },
};

export default nextConfig;
