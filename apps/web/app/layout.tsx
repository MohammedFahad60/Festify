import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Festify — Discover & Celebrate",
  description: "Premium festival discovery and ticketing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-stone-50 text-stone-900">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-stone-200">
          <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center text-white font-bold text-sm">F</div>
              <span className="font-semibold tracking-tight">Festify</span>
              <span className="hidden sm:inline text-xs font-medium text-stone-500 border border-stone-200 rounded-full px-2 py-0.5 ml-2">MVP</span>
            </a>
            <nav className="hidden md:flex items-center gap-2 text-sm">
              <a href="/" className="px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Explore</a>
              <a href="/orders" className="px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Orders</a>
              <a href="/organizer" className="px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Organize</a>
              <a href="/admin" className="px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Admin</a>
              <a href="/login" className="ml-2 bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm">Sign in</a>
            </nav>
            <a href="/login" className="md:hidden bg-stone-900 text-white px-3 py-2 rounded-xl text-sm">Sign in</a>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 mt-12 py-8">
          <div className="mx-auto max-w-7xl px-6 text-sm text-stone-500 flex flex-col sm:flex-row justify-between gap-2">
            <span>© {new Date().getFullYear()} Festify — Crafted for celebration</span>
            <span className="flex gap-4"><a href="/" className="hover:text-stone-900 transition-colors">Privacy</a><a href="/" className="hover:text-stone-900 transition-colors">Terms</a></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
