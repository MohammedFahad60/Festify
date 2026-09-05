"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Festival, friendlyError } from "@/lib/api";
import { Card, Badge, Skeleton, Button, Alert } from "@/components/ui";

type TicketType = {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  quantity: number;
  soldQuantity: number;
  saleStart: string;
  saleEnd: string;
  maxPerUser?: number | null;
  status: string;
};

export default function FestivalDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [festival, setFestival] = useState<Festival | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [orderLoading, setOrderLoading] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setStatusCode(undefined);
    const res = await api.get<{ festival: Festival }>(`/api/festivals/${params.id}`);
    if (res.success && res.data) setFestival(res.data.festival);
    else {
      setError(friendlyError(res.message, res.status));
      setStatusCode(res.status);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const getAvailability = (t: TicketType) => {
    const available = t.quantity - (t.soldQuantity || 0);
    const now = new Date();
    const saleStart = new Date(t.saleStart);
    const saleEnd = new Date(t.saleEnd);
    const inSaleWindow = now >= saleStart && now <= saleEnd;
    const notStarted = now < saleStart;
    const ended = now > saleEnd;
    const soldOut = available <= 0;
    const inactive = t.status !== "ACTIVE";
    return { available, inSaleWindow, notStarted, ended, soldOut, inactive };
  };

  const handleQty = (id: string, delta: number, max: number) => {
    setQty((prev) => {
      const cur = prev[id] ?? 1;
      const next = Math.min(Math.max(1, cur + delta), max);
      return { ...prev, [id]: next };
    });
  };

  const createOrder = async (ticket: TicketType) => {
    const quantity = qty[ticket.id] ?? 1;
    const { available, inSaleWindow, soldOut, inactive } = getAvailability(ticket);
    if (soldOut || inactive || !inSaleWindow) return;
    if (quantity > available) {
      setOrderError(`Only ${available} tickets left.`);
      return;
    }
    setOrderLoading(ticket.id);
    setOrderError(null);
    setOrderResult(null);
    setPaymentResult(null);
    setPaymentError(null);
    const res = await api.post<{ order: any }>(`/api/orders`, {
      festivalId: festival!.id,
      items: [{ ticketTypeId: ticket.id, quantity }],
    });
    if (res.success && res.data) {
      setOrderResult(res.data.order);
    } else {
      if (res.status === 401) router.push("/login");
      setOrderError(friendlyError(res.message, res.status));
    }
    setOrderLoading(null);
  };

  const handlePay = async () => {
    if (!orderResult) return;
    setPaymentLoading(true);
    setPaymentError(null);
    const payRes = await api.post<{ payment: any }>(`/api/orders/${orderResult.id}/payment`);
    if (!payRes.success || !payRes.data) {
      if (payRes.status === 401) router.push("/login");
      setPaymentError(friendlyError(payRes.message, payRes.status));
      setPaymentLoading(false);
      return;
    }
    const paymentId = payRes.data.payment.id;
    // dev test-success
    const successRes = await api.post<{ payment: any }>(`/api/payments/${paymentId}/test-success`);
    if (successRes.success && successRes.data) {
      setPaymentResult(successRes.data.payment);
      // refresh order to CONFIRMED
      const orderRes = await api.get<{ order: any }>(`/api/orders/${orderResult.id}`);
      if (orderRes.success && orderRes.data) setOrderResult(orderRes.data.order);
    } else {
      if (successRes.status === 401) router.push("/login");
      setPaymentError(friendlyError(successRes.message, successRes.status));
    }
    setPaymentLoading(false);
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-8 w-1/2" /><Skeleton className="h-32 w-full" /></div>;
  if (error) {
    return (
      <Card className="p-8 text-center animate-fade-in-up">
        <p className="text-stone-700 mb-2">{error}</p>
        {statusCode === 401 && <p className="text-sm text-stone-500 mb-4">Please sign in to view festivals.</p>}
        {statusCode === 404 && <p className="text-sm text-stone-500 mb-4">This festival may have been removed or unpublished.</p>}
        <div className="flex gap-2 justify-center">
          <Button onClick={load}>Retry</Button>
          {statusCode === 401 && <a href="/login"><Button variant="outline">Sign in</Button></a>}
        </div>
      </Card>
    );
  }
  if (!festival) return <Card className="p-8 text-center">Festival not found</Card>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="h-72 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200 relative">
        {festival.banner ? <img src={festival.banner} alt={festival.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-400 bg-gradient-to-br from-stone-100 to-stone-200">No banner</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-3xl font-semibold tracking-tight drop-shadow">{festival.name}</h1>
          <p className="text-sm opacity-90">{festival.venue?.name} • {new Date(festival.startDate).toLocaleDateString()} → {new Date(festival.endDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={festival.status === "PUBLISHED" ? "success" : "secondary"}>{festival.status}</Badge>
        <Badge variant="secondary">{festival.category?.name}</Badge>
        <Badge variant="secondary">{festival.venue?.city}</Badge>
      </div>

      <p className="text-stone-700 leading-relaxed">{festival.description || "An unforgettable experience awaits — secure your spot before tickets sell out."}</p>

      <Card className="p-6">
        <h3 className="font-semibold tracking-tight mb-1">Ticket types</h3>
        <p className="text-sm text-stone-500 mb-4">Prices are final and confirmed on the server. Quantity limits are enforced at purchase.</p>
        {festival.ticketTypes && festival.ticketTypes.length > 0 ? (
          <div className="space-y-3">
            {(festival.ticketTypes as any as TicketType[]).map((t) => {
              const { available, inSaleWindow, notStarted, ended, soldOut, inactive } = getAvailability(t);
              const q = qty[t.id] ?? 1;
              const max = t.maxPerUser ? Math.min(available, t.maxPerUser) : available;
              const disabled = soldOut || inactive || !inSaleWindow || festival.status !== "PUBLISHED";
              let reason = "";
              if (festival.status !== "PUBLISHED") reason = "Festival not published";
              else if (soldOut) reason = "Sold out";
              else if (inactive) reason = "Unavailable";
              else if (notStarted) reason = `Sales start ${new Date(t.saleStart).toLocaleDateString()}`;
              else if (ended) reason = "Sales ended";
              return (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between border border-stone-200 rounded-xl p-4 gap-4 hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {t.name}
                      {t.maxPerUser && <span className="text-xs bg-stone-100 border border-stone-200 rounded-full px-2 py-0.5">max {t.maxPerUser}/person</span>}
                    </div>
                    <div className="text-sm text-stone-600">₹{t.price} • {available} of {t.quantity} left {t.soldQuantity > 0 && <span className="text-stone-400">({t.soldQuantity} sold)</span>}</div>
                    {t.description && <div className="text-xs text-stone-500 mt-1 line-clamp-2">{t.description}</div>}
                    <div className="text-xs text-stone-400 mt-1">Sale: {new Date(t.saleStart).toLocaleDateString()} → {new Date(t.saleEnd).toLocaleDateString()}</div>
                    {reason && <div className="text-xs text-amber-700 mt-1">{reason}</div>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 border border-stone-200 rounded-xl p-1">
                      <button aria-label="Decrease quantity" onClick={() => handleQty(t.id, -1, max)} disabled={disabled || q <= 1} className="w-8 h-8 rounded-lg hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">−</button>
                      <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">{q}</span>
                      <button aria-label="Increase quantity" onClick={() => handleQty(t.id, 1, max)} disabled={disabled || q >= max} className="w-8 h-8 rounded-lg hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">+</button>
                    </div>
                    <Button size="sm" isLoading={orderLoading === t.id} disabled={disabled || !!orderLoading} onClick={() => createOrder(t)} aria-label={`Buy ${t.name}`}>
                      Buy
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-stone-500">No tickets available for this festival yet.</p>}
        {orderError && <Alert variant="error" ><span className="font-medium">Couldn’t create order: </span>{orderError}</Alert>}
        {orderResult && (
          <div className="mt-6 border-t pt-6 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Order created</h4>
              <Badge variant={orderResult.status === "PENDING" ? "warning" : orderResult.status === "CONFIRMED" ? "success" : "secondary"}>{orderResult.status}</Badge>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500">Order</span><span className="font-mono text-xs">{orderResult.id.slice(0, 8)}…</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Total</span><span className="font-medium">₹{orderResult.totalAmount}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Items</span><span>{orderResult.items?.map((i:any)=>`${i.ticketType?.name||'Ticket'} × ${i.quantity}`).join(", ")}</span></div>
            </div>
            {!paymentResult && orderResult.status === "PENDING" && (
              <div className="flex gap-2">
                <Button onClick={handlePay} isLoading={paymentLoading}>Pay now (test)</Button>
                <a href={`/orders/${orderResult.id}`}><Button variant="outline">View order</Button></a>
              </div>
            )}
            {paymentError && <Alert variant="error">{paymentError}</Alert>}
            {paymentResult && (
              <Alert variant="success">
                <div className="font-medium">Payment confirmed — your tickets are ready!</div>
                <div className="text-xs mt-1">Order is now {orderResult.status}. <a href={`/orders/${orderResult.id}`} className="underline hover:text-emerald-800">View order details</a> or <a href="/orders" className="underline">see all orders</a>.</div>
              </Alert>
            )}
            {orderResult.status === "CONFIRMED" && !paymentResult && (
              <Alert variant="success">Order confirmed. <a href={`/orders/${orderResult.id}`} className="underline">View tickets</a></Alert>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
