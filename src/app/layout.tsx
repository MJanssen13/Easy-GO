import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

// Mesma tipografia do LabFlow (apps da mesma família): IBM Plex Sans no corpo e
// títulos, IBM Plex Mono nas caixas de prontuário.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Easy-GO",
    template: "%s · Easy-GO",
  },
  description:
    "Plataforma clínica de Obstetrícia e Ginecologia: pré-parto, pré-natal, PSGO, puerpério e onco-ginecologia.",
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Easy-GO", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#e11d74",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
