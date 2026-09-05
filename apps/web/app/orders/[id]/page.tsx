"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Skeleton, Badge, Button } from "@/components/ui";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await api.get<{ order: any }>(`/api/orders/${params.id}`);
    if (res.success && res.data) setOrder(res.data.order);
    else setError(res.message || "Not found");
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center"><p className="mb-4">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (!order) return <Card className="p-8 text-center">Order not found</Card>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order {order.id.slice(0, 8)}…</h1>
        <Badge variant={order.status === "CONFIRMED" ? "success" : order.status === "PENDING" ? "warning" : "secondary"}>{order.status}</Badge>
      </div>
      <Card className="p-6 space-y-4">
        <div className="flex justify-between text-sm"><span className="text-stone-500">Festival</span><span className="font-medium">{order.festival?.name}</span></div>
        <div className="flex justify-between text-sm"><span className="text-stone-500">Total</span><span className="font-medium">₹{order.totalAmount}</span></div>
        <div className="flex justify-between text-sm"><span className="text-stone-500">Created</span><span>{new Date(order.createdAt).toLocaleString()}</span></div>
        {order.items?.map((it: any) => (
          <div key={it.id} className="border-t pt-3 text-sm flex justify-between"><span>{it.ticketType?.name} × {it.quantity}</span><span>₹{it.totalPrice}</span></div>
        ))}
        {order.status === "PENDING" && (
          <div className="flex gap-2 pt-4">
            <Button onClick={async () => {
              const p = await api.post(`/api/orders/${order.id}/payment`);
              if (p.success) window.location.reload();
            }}>Pay now</Button>
            <Button variant="outline" onClick={async () => {
              const c = await api.patch(`/api/orders/${order.id}/cancel`);
              if (c.success) window.location.reload();
            }}>Cancel</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
