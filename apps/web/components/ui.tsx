"use client";

import React from "react";

export function Button({ className = "", variant = "default", size = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "outline"; size?: "default" | "sm" | "lg" }) {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  const variants = {
    default: "bg-stone-900 text-white hover:bg-stone-800 shadow-sm hover:shadow-md",
    ghost: "hover:bg-stone-100 text-stone-700",
    outline: "border border-stone-200 bg-white hover:bg-stone-50 text-stone-900",
  };
  const sizes = {
    default: "h-10 px-5 py-2 text-sm",
    sm: "h-8 px-3 text-xs rounded-lg",
    lg: "h-11 px-8 text-sm",
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function Card({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`} {...props}>{children}</div>;
}

export function Badge({ className = "", children, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "secondary" }) {
  const variants = {
    default: "bg-stone-900 text-white",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    secondary: "bg-stone-100 text-stone-700 border border-stone-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`} {...props}>{children}</span>;
}

export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`shimmer rounded-xl ${className}`} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent disabled:opacity-50 transition-all" {...props} />;
}

export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-sm font-medium text-stone-700 ${className}`} {...props} />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in-up">
      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
        <span className="text-stone-400 text-xl">◯</span>
      </div>
      <h3 className="font-semibold text-stone-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-stone-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className={`p-6 animate-fade-in-up stagger-${(i % 6) + 1}`}>
          <Skeleton className="h-40 w-full mb-4" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      ))}
    </div>
  );
}
