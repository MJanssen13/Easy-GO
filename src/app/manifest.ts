import type { MetadataRoute } from "next";

/** App instalável (tela inicial do celular / computador). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Easy-GO · Obstetrícia e Ginecologia",
    short_name: "Easy-GO",
    description: "Pré-parto, puerpério, onco, PSGO e pré-natal — HC-UFTM.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f6f9",
    theme_color: "#e11d74",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Pré-Parto", url: "/pre-parto" },
      { name: "Cronograma", url: "/pre-parto/cronograma" },
      { name: "Pré-Natal", url: "/pre-natal" },
    ],
  };
}
