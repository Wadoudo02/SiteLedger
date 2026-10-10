import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { NavLinkList, NavLinks } from "@/components/NavLinks";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SiteLedger",
  description: "Building invoices, read, checked and filed by property and month.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500" />
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-600 text-white shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
                  <path d="M3 11 12 4l9 7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 10v9h14v-9" strokeLinejoin="round" />
                  <path d="M9 14h6M9 17h4" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-lg font-semibold tracking-tight">
                Site<span className="text-orange-700">Ledger</span>
              </span>
            </Link>
            <Suspense fallback={<NavLinkList />}>
              <NavLinks />
            </Suspense>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200 py-5 text-center text-xs text-stone-500">
          Invoices are read by Claude. Every check and every figure is calculated in code.
        </footer>
      </body>
    </html>
  );
}
