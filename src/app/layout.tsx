import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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
};

export const viewport: Viewport = {
  themeColor: "#00205b",
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
      <body>{children}</body>
    </html>
  );
}
