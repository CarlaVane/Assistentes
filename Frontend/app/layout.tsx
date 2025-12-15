import type React from "react"
import type { Metadata } from "next"
import { Poppins, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

const _poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
})

const _inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Assistente Médico - Sistema de Triagem",
  description: "Sistema de triagem de sintomas para pacientes e médicos",
  generator: "Assistente Médico WebApp (Next.js)",
  icons: {
    // Use the single PNG placed in `public/` as the primary icon.
    icon: [
      {
        url: "/image.png",
        type: "image/png",
        sizes: "any",
      },
    ],
    // Provide the same PNG for Apple touch and shortcut/fallbacks.
    apple: [
      {
        url: "/image.png",
        sizes: "180x180",
      },
    ],
    shortcut: "/image.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt">
      <body className={`font-sans antialiased ${_poppins.variable} ${_inter.variable}`}>
  {children}
  <Toaster position="top-right" />
  <Analytics />
      </body>
    </html>
  )
}
