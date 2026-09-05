"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Skeleton, Badge, EmptyState, Button } from "@/components/ui";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await api.get<{ orders: any[] }>("/api/orders");
    if (res.success && res.data) setOrders(res.data.orders);
    else setError(res.message || "Failed to load orders");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (error) return <Card className="p-8 text-center"><p className="text-stone-600 mb-4">{error}</p><div className="flex gap-2 justify-center"><Button onClick={load}>Retry</Button><a href="/login"><Button variant="outline">Sign in</Button></a></div></Card>;
  if (orders.length === 0) return <EmptyState title="No orders yet" description="Your tickets will appear here after purchase." action={<a href="/"><Button>Explore festivals</Button></a>} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
      <div className="space-y-4">
        {orders.map((o, i) => (
          <a key={o.id} href={`/orders/${o.id}`}>
            <Card className={`p-5 flex justify-between items-center hover:shadow-md transition-shadow animate-fade-in-up stagger-${(i%6)+1}`}>
              <div>
                <div className="font-medium">{o.festival?.name || "Festival"}</div>
                <div className="text-sm text-stone-500">{new Date(o.createdAt).toLocaleDateString()} • ₹{o.totalAmount}</div>
              </div>
              <Badge variant={o.status === "CONFIRMED" ? "success" : o.status === "PENDING" ? "warning" : "secondary"}>{o.status}</Badge>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
