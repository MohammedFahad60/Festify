"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Button, Input, Label, Skeleton, Alert, Badge } from "@/components/ui";

export default function TicketManagementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [festival, setFestival] = useState<any>(null);
  const [form, setForm] = useState({ name: "", price: 500, quantity: 100, maxPerUser: "", saleStart: "", saleEnd: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const r = await api.get<{ festival: any }>(`/api/festivals/organizer/${params.id}`);
    if (r.success && r.data) setFestival((r.data as any).festival);
    else if (r.status===401) router.push("/login");
  };
  useEffect(() => { load(); }, [params.id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Ticket name is required."); return; }
    if (form.price <= 0) { setErr("Price must be greater than 0."); return; }
    if (form.quantity <= 0 || !Number.isInteger(form.quantity)) { setErr("Quantity must be a positive integer."); return; }
    if (form.saleStart && form.saleEnd && new Date(form.saleEnd) <= new Date(form.saleStart)) { setErr("Sale end must be after sale start."); return; }
    setSaving(true); setMsg(null); setErr(null);
    const res = await api.post(`/api/festivals/${params.id}/ticket-types`, {
      name: form.name.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
      maxPerUser: form.maxPerUser ? Number(form.maxPerUser) : undefined,
      saleStart: form.saleStart ? new Date(form.saleStart).toISOString() : new Date().toISOString(),
      saleEnd: form.saleEnd ? new Date(form.saleEnd).toISOString() : new Date(Date.now()+ 30*86400000).toISOString(),
    });
    if (res.success) {
      setMsg("Ticket type created.");
      setForm({ name: "", price: 500, quantity: 100, maxPerUser: "", saleStart: "", saleEnd: "" });
      await load();
    } else {
      setErr(friendlyError(res.message, res.status));
    }
    setSaving(false);
  };

  if (!festival) return <Skeleton className="h-32 w-full" />;
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ticket types — {festival.name}</h1>
        <p className="text-sm text-stone-500">Inventory is managed server-side; soldQuantity updates atomically on purchase.</p>
      </div>
      <Card className="p-6">
        <h3 className="font-medium mb-4">Existing ticket types</h3>
        {festival.ticketTypes?.length ? (
          <div className="space-y-2">
            {festival.ticketTypes.map((t:any)=>(
              <div key={t.id} className="border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-medium flex gap-2 items-center">{t.name} <Badge variant={t.status==="ACTIVE"?"success":"secondary"}>{t.status}</Badge></div>
                  <div className="text-sm text-stone-600">₹{t.price} • {t.soldQuantity}/{t.quantity} sold • {t.quantity - t.soldQuantity} left</div>
                  <div className="text-xs text-stone-500">Sale: {new Date(t.saleStart).toLocaleDateString()} → {new Date(t.saleEnd).toLocaleDateString()} {t.maxPerUser ? `• max ${t.maxPerUser}/person` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-stone-900" style={{ width: `${Math.min(100, (t.soldQuantity / Math.max(1, t.quantity))*100)}%` }} />
                  </div>
                  <div className="text-xs text-stone-500 mt-1">{Math.round((t.soldQuantity / Math.max(1, t.quantity))*100)}% sold</div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-stone-500">No ticket types yet — create one below.</p>}
      </Card>
      <Card className="p-6">
        <h3 className="font-medium mb-1">Create ticket type</h3>
        <p className="text-xs text-stone-500 mb-4">Price in INR. Quantity is total inventory. Sale window controls purchase eligibility.</p>
        <form onSubmit={create} className="space-y-3" noValidate>
          <div><Label htmlFor="tt-name">Name *</Label><Input id="tt-name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="General Admission" className="mt-1" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label htmlFor="price">Price (₹) *</Label><Input id="price" type="number" min={1} step="1" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})} required className="mt-1" /></div>
            <div><Label htmlFor="qty">Quantity *</Label><Input id="qty" type="number" min={1} step="1" value={form.quantity} onChange={e=>setForm({...form,quantity:Number(e.target.value)})} required className="mt-1" /></div>
            <div><Label htmlFor="max">Max per user</Label><Input id="max" type="number" min={1} placeholder="Unlimited" value={form.maxPerUser} onChange={e=>setForm({...form,maxPerUser:e.target.value})} className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label htmlFor="saleStart">Sale start</Label><Input id="saleStart" type="datetime-local" value={form.saleStart} onChange={e=>setForm({...form,saleStart:e.target.value})} className="mt-1" /></div>
            <div><Label htmlFor="saleEnd">Sale end</Label><Input id="saleEnd" type="datetime-local" value={form.saleEnd} onChange={e=>setForm({...form,saleEnd:e.target.value})} className="mt-1" /></div>
          </div>
          {err && <Alert variant="error">{err}</Alert>}
          {msg && <Alert variant="success">{msg}</Alert>}
          <Button type="submit" isLoading={saving}>Create ticket type</Button>
        </form>
      </Card>
    </div>
  );
}
