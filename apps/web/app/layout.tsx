import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Festify — Discover & Celebrate",
  description: "Premium festival discovery and ticketing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-stone-50 text-stone-900">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-stone-900 text-white px-3 py-2 rounded-xl text-sm z-50">Skip to content</a>
        <Header />
        <main id="main" className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 mt-12 py-8">
          <div className="mx-auto max-w-7xl px-6 text-sm text-stone-500 flex flex-col sm:flex-row justify-between gap-2">
            <span>© {new Date().getFullYear()} Festify — Crafted for celebration</span>
            <span className="flex gap-4"><a href="/" className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded">Privacy</a><a href="/" className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded">Terms</a></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
