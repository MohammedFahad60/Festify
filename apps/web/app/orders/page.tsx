"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Skeleton, Badge, EmptyState, Button, Alert } from "@/components/ui";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    setError(null);
    setStatus(undefined);
    const res = await api.get<{ orders: any[] }>("/api/orders");
    if (res.success && res.data) setOrders(res.data.orders);
    else {
      setError(friendlyError(res.message, res.status));
      setStatus(res.status);
      if (res.status === 401) setTimeout(() => router.push("/login?redirect=/orders" as any), 1200);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (error) return (
    <Card className="p-8 text-center animate-fade-in-up">
      <p className="text-stone-700 mb-2">{error}</p>
      {status === 401 && <Alert variant="warning">Redirecting to sign in…</Alert>}
      <div className="flex gap-2 justify-center mt-4">
        <Button onClick={load}>Retry</Button>
        <a href="/login"><Button variant="outline">Sign in</Button></a>
      </div>
    </Card>
  );
  if (orders.length === 0) return <EmptyState title="No orders yet" description="Your tickets will appear here after purchase. Published festivals are ready to explore." action={<a href="/"><Button>Explore festivals</Button></a>} />;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
        <Badge variant="secondary">{orders.length} total</Badge>
      </div>
      <div className="space-y-3">
        {orders.map((o, i) => (
          <a key={o.id} href={`/orders/${o.id}`} className={`block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-2xl animate-fade-in-up stagger-${(i%6)+1}`}>
            <Card className="p-5 flex justify-between items-center hover:shadow-md transition-shadow">
              <div className="min-w-0">
                <div className="font-medium truncate">{o.festival?.name || "Festival"}</div>
                <div className="text-sm text-stone-500">{new Date(o.createdAt).toLocaleDateString()} • ₹{o.totalAmount} • {o.items?.length || 0} items</div>
              </div>
              <Badge variant={o.status === "CONFIRMED" ? "success" : o.status === "PENDING" ? "warning" : "secondary"}>{o.status}</Badge>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
