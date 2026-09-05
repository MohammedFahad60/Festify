"use client";

import React, { useEffect, useRef } from "react";

export function Button({ className = "", variant = "default", size = "default", isLoading=false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "outline"; size?: "default" | "sm" | "lg"; isLoading?: boolean }) {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none";
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
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={props.disabled || isLoading} {...props}>
      {isLoading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {props.children}
    </button>
  );
}

export function Card({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`} {...props}>{children}</div>;
}

export function Badge({ className = "", children, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "secondary" | "destructive" }) {
  const variants = {
    default: "bg-stone-900 text-white",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    secondary: "bg-stone-100 text-stone-700 border border-stone-200",
    destructive: "bg-red-50 text-red-700 border border-red-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`} {...props}>{children}</span>;
}

export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`shimmer rounded-xl ${className}`} {...props} aria-hidden="true" />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-1 disabled:opacity-50 transition-all" {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="flex min-h-[80px] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-1 disabled:opacity-50 transition-all" {...props} />;
}

export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-sm font-medium text-stone-700 ${className}`} {...props} />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in-up" role="status" aria-live="polite">
      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
        <span className="text-stone-400 text-xl" aria-hidden="true">◯</span>
      </div>
      <h3 className="font-semibold text-stone-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-stone-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="p-8 text-center animate-fade-in-up" role="alert">
      <p className="text-stone-700 mb-4">{message}</p>
      <div className="flex gap-2 justify-center">
        {onRetry && <Button onClick={onRetry}>Retry</Button>}
        <a href="/login"><Button variant="outline">Sign in</Button></a>
      </div>
    </Card>
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

export function Dialog({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-fade-in-up" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-desc" : undefined}
        className="relative bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-md p-6 animate-fade-in-up focus:outline-none"
      >
        <h2 id="dialog-title" className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p id="dialog-desc" className="text-sm text-stone-500 mt-1">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Alert({ variant = "info", children }: { variant?: "info" | "success" | "error" | "warning"; children: React.ReactNode }) {
  const styles = {
    info: "bg-stone-50 border-stone-200 text-stone-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    error: "bg-red-50 border-red-200 text-red-600",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
  };
  return <div role="alert" className={`text-sm rounded-xl border p-3 ${styles[variant]}`}>{children}</div>;
}
