import type { Metadata, Viewport } from "next";
import { Montserrat, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Tipografia inspirada na Medway: Montserrat (títulos, geométrica e marcante),
// Inter (corpo, algarismos precisos p/ dados clínicos) e IBM Plex Mono (prontuário).
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const inter = Inter({
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
      className={`${montserrat.variable} ${inter.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
