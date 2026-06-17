import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Easy-GO",
    template: "%s · Easy-GO",
  },
  description:
    "Plataforma clínica de Obstetrícia e Ginecologia: pré-parto, pré-natal, PSGO, puerpério e onco-ginecologia.",
};

export const viewport: Viewport = {
  themeColor: "#0a8bc2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
