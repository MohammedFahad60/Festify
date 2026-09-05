"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Button, Input, Label, Skeleton } from "@/components/ui";

export default function TicketManagementPage() {
  const params = useParams<{ id: string }>();
  const [festival, setFestival] = useState<any>(null);
  const [form, setForm] = useState({ name: "", price: 500, quantity: 100, saleStart: "", saleEnd: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ festival: any }>(`/api/festivals/organizer/${params.id}`).then(r=> { if(r.success && r.data) setFestival((r.data as any).festival); });
  }, [params.id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post(`/api/festivals/${params.id}/ticket-types`, {
      name: form.name,
      price: Number(form.price),
      quantity: Number(form.quantity),
      saleStart: form.saleStart ? new Date(form.saleStart).toISOString() : new Date().toISOString(),
      saleEnd: form.saleEnd ? new Date(form.saleEnd).toISOString() : new Date(Date.now()+ 30*86400000).toISOString(),
    });
    setMsg(res.success ? "Created" : (res.message || "Failed"));
  };

  if (!festival) return <Skeleton className="h-32 w-full" />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ticket types — {festival.name}</h1>
      <Card className="p-6">
        <h3 className="font-medium mb-4">Existing</h3>
        {festival.ticketTypes?.length ? festival.ticketTypes.map((t:any)=><div key={t.id} className="border rounded-xl p-3 mb-2 flex justify-between"><span>{t.name} • ₹{t.price} • {t.soldQuantity}/{t.quantity}</span><span className="text-xs bg-stone-100 rounded-full px-2 py-1">{t.status}</span></div>) : <p className="text-sm text-stone-500">No ticket types</p>}
      </Card>
      <Card className="p-6">
        <h3 className="font-medium mb-4">Create ticket type</h3>
        <form onSubmit={create} className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Price</Label><Input type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})} className="mt-1" /></div><div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:Number(e.target.value)})} className="mt-1" /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Sale start</Label><Input type="datetime-local" value={form.saleStart} onChange={e=>setForm({...form,saleStart:e.target.value})} className="mt-1" /></div><div><Label>Sale end</Label><Input type="datetime-local" value={form.saleEnd} onChange={e=>setForm({...form,saleEnd:e.target.value})} className="mt-1" /></div></div>
          {msg && <p className="text-sm p-3 rounded-xl bg-stone-50 border">{msg}</p>}
          <Button type="submit">Create</Button>
        </form>
      </Card>
    </div>
  );
}
