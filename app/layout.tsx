import type { Metadata } from "next"
import { Bricolage_Grotesque, Hanken_Grotesk, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-src", axes: ["opsz"], display: "swap" })
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-src", display: "swap" })

export const metadata: Metadata = { title: "IDESIE CRM", description: "CRM de IDESIE Business & Tech School" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          toastOptions={{
            classNames: {
              toast: "!rounded-2xl !border-0 !bg-ink !text-white !shadow-2xl !font-sans",
              description: "!text-white/60",
              closeButton: "!bg-ink !text-white/70 !border-white/10",
            },
          }}
        />
      </body>
    </html>
  )
}
