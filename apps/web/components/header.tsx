"use client";
import { useState } from "react";
import { Button } from "./ui";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-stone-200">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xl">
          <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">F</div>
          <span className="font-semibold tracking-tight">Festify</span>
          <span className="hidden sm:inline text-xs font-medium text-stone-500 border border-stone-200 rounded-full px-2 py-0.5 ml-2">MVP</span>
        </a>
        <nav className="hidden md:flex items-center gap-2 text-sm" aria-label="Primary">
          <a href="/" className="px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">Explore</a>
          <a href="/orders" className="px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">Orders</a>
          <a href="/organizer" className="px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">Organize</a>
          <a href="/admin" className="px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">Admin</a>
          <a href="/login" className="ml-2 bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">Sign in</a>
        </nav>
        <button
          className="md:hidden p-2 rounded-xl hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="sr-only">Menu</span>
          <div className="w-5 h-5 flex flex-col justify-center gap-1">
            <span className={`block h-0.5 bg-stone-900 transition-all ${open ? "rotate-45 translate-y-1.5" : ""}`} />
            <span className={`block h-0.5 bg-stone-900 transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 bg-stone-900 transition-all ${open ? "-rotate-45 -translate-y-1.5" : ""}`} />
          </div>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-stone-200 bg-white/95 backdrop-blur-xl animate-fade-in-up">
          <nav className="px-6 py-4 flex flex-col gap-1" aria-label="Mobile">
            <a href="/" onClick={()=>setOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-stone-100 font-medium">Explore</a>
            <a href="/orders" onClick={()=>setOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-stone-100">Orders</a>
            <a href="/organizer" onClick={()=>setOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-stone-100">Organize</a>
            <a href="/admin" onClick={()=>setOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-stone-100">Admin</a>
            <a href="/login" onClick={()=>setOpen(false)} className="mt-2">
              <Button className="w-full">Sign in</Button>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
