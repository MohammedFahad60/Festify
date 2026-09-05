"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Skeleton, Badge, Button, Alert, Dialog } from "@/components/ui";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [payLoading, setPayLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await api.get<{ order: any }>(`/api/orders/${params.id}`);
    if (res.success && res.data) setOrder(res.data.order);
    else {
      setError(friendlyError(res.message, res.status));
      setStatus(res.status);
      if (res.status === 401) setTimeout(()=> router.push(`/login?redirect=/orders/${params.id}` as any), 800);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const handlePay = async () => {
    setPayLoading(true);
    setActionErr(null);
    setActionMsg(null);
    const payRes = await api.post<{ payment: any }>(`/api/orders/${order.id}/payment`);
    if (!payRes.success) {
      setActionErr(friendlyError(payRes.message, payRes.status));
      if (payRes.status===401) router.push("/login");
      setPayLoading(false);
      return;
    }
    const pid = (payRes.data as any).payment.id;
    const succ = await api.post(`/api/payments/${pid}/test-success`);
    if (succ.success) {
      setActionMsg("Payment confirmed — tickets issued!");
      await load();
    } else {
      setActionErr(friendlyError(succ.message, succ.status));
    }
    setPayLoading(false);
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setActionErr(null);
    const res = await api.patch(`/api/orders/${order.id}/cancel`);
    if (res.success) {
      setActionMsg("Order cancelled. Inventory restored.");
      setShowCancel(false);
      await load();
    } else {
      setActionErr(friendlyError(res.message, res.status));
    }
    setCancelLoading(false);
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center animate-fade-in-up"><p className="mb-2 text-stone-700">{error}</p>{status===403 && <p className="text-sm text-stone-500 mb-4">This order belongs to another account.</p>}<div className="flex gap-2 justify-center"><Button onClick={load}>Retry</Button><a href="/orders"><Button variant="outline">Back to orders</Button></a></div></Card>;
  if (!order) return <Card className="p-8 text-center">Order not found</Card>;

  const isPending = order.status === "PENDING";
  const isConfirmed = order.status === "CONFIRMED";

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Order <span className="font-mono text-lg">{order.id.slice(0, 8)}…</span></h1>
        <Badge variant={isConfirmed ? "success" : isPending ? "warning" : "secondary"}>{order.status}</Badge>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid gap-3 text-sm">
          <div className="flex justify-between"><span className="text-stone-500">Festival</span><span className="font-medium">{order.festival?.name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Total</span><span className="font-medium">₹{order.totalAmount}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Created</span><span>{new Date(order.createdAt).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Updated</span><span>{new Date(order.updatedAt).toLocaleString()}</span></div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h3 className="font-medium text-sm">Items</h3>
          {order.items?.map((it: any) => (
            <div key={it.id} className="flex justify-between items-center border border-stone-200 rounded-xl p-3 text-sm">
              <span>{it.ticketType?.name || "Ticket"} × {it.quantity}</span>
              <span className="font-medium">₹{it.totalPrice} <span className="text-stone-400 font-normal">₹{it.unitPrice} each</span></span>
            </div>
          ))}
        </div>

        {order.tickets?.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-medium text-sm mb-2">Tickets ({order.tickets.length})</h3>
            <div className="grid gap-2">
              {order.tickets.map((t:any)=>(
                <a key={t.id} href={`/tickets/${t.id}`} className="flex justify-between items-center border rounded-xl p-3 hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">
                  <span className="font-mono text-sm">{t.ticketCode}</span>
                  <Badge variant={t.status==="ACTIVE"?"success":t.status==="USED"?"secondary":"warning"}>{t.status}</Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {isPending && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handlePay} isLoading={payLoading}>Pay now (test)</Button>
            <Button variant="outline" onClick={()=> setShowCancel(true)} disabled={cancelLoading || payLoading}>Cancel order</Button>
          </div>
        )}
        {isConfirmed && (
          <Alert variant="success">Order confirmed — your tickets are above. Present the code at entry.</Alert>
        )}
        {order.status==="CANCELLED" && <Alert variant="warning">This order was cancelled. Tickets, if any, are no longer valid.</Alert>}
        {actionMsg && <Alert variant="success">{actionMsg}</Alert>}
        {actionErr && <Alert variant="error">{actionErr}</Alert>}
      </Card>

      <Dialog open={showCancel} onClose={()=> setShowCancel(false)} title="Cancel order?" description="This will restore ticket inventory. This cannot be undone if the order has no successful payment.">
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={()=> setShowCancel(false)} disabled={cancelLoading}>Keep order</Button>
          <Button variant="default" isLoading={cancelLoading} onClick={handleCancel}>Yes, cancel</Button>
        </div>
      </Dialog>
    </div>
  );
}
