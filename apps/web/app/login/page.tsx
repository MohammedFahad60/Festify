"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Button, Input, Label, Alert, Skeleton } from "@/components/ui";

export const dynamic = "force-dynamic";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await api.post("/api/auth/login", { email, password });
    if (res.success) {
      setSuccess(true);
      setTimeout(() => router.push(redirect as any), 600);
    } else {
      setError(friendlyError(res.message, res.status));
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <Card className="p-8 animate-fade-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-stone-500 mt-1">Sign in to continue to Festify</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" aria-describedby={error ? "login-error" : undefined} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
          </div>
          {error && <Alert variant="error"><span id="login-error">{error}</span></Alert>}
          {success && <Alert variant="success">Login successful — redirecting to {redirect === "/" ? "Explore" : redirect}...</Alert>}
          <Button type="submit" isLoading={loading} className="w-full">
            Sign in
          </Button>
          <p className="text-xs text-center text-stone-500">Demo: use your seeded attendee / organizer / admin account.</p>
          <p className="text-xs text-center text-stone-500">No account? <a href="#" className="underline hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded">Create one</a></p>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-md mx-auto mt-8" />}>
      <LoginInner />
    </Suspense>
  );
}
