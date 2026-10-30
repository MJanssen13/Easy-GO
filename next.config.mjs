// Fuso do hospital também no build/servidor local (ver src/instrumentation.ts).
process.env.TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Foundation phase: don't fail the build on lint; types are still checked by `next build`.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Foto da CTG vai comprimida (~150–350 KB) no corpo da Server Action;
    // o limite padrão (1 MB) fica apertado para fotos grandes.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
