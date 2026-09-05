"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Button, Input, Label, Alert } from "@/components/ui";

export default function NewFestivalPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", categoryId: "", venueId: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Please enter a festival name."); return; }
    if (!form.startDate || !form.endDate) { setError("Please choose start and end dates."); return; }
    const sd = new Date(form.startDate);
    const ed = new Date(form.endDate);
    if (ed <= sd) { setError("End date must be after start date."); return; }
    setLoading(true);
    setError(null);
    setMsg(null);
    let catId = form.categoryId;
    let venId = form.venueId;
    try {
      if (!catId) {
        const cats = await api.get<{ categories: any[] }>("/api/catalog/categories");
        if (!cats.success || !cats.data?.categories?.length) throw new Error("No categories available — please ask an admin to seed categories.");
        catId = cats.data.categories[0].id;
      }
      if (!venId) {
        const vens = await api.get<{ venues: any[] }>("/api/catalog/venues");
        if (!vens.success || !vens.data?.venues?.length) throw new Error("No venues available — please ask an admin to seed venues.");
        venId = vens.data.venues[0].id;
      }
      const res = await api.post<{ festival: any }>("/api/festivals", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        categoryId: catId,
        venueId: venId,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      if (res.success && res.data) {
        setMsg("Festival created as DRAFT.");
        setTimeout(()=> router.push((`/organizer/festivals/${(res.data as any).festival.id}` as any)), 700);
      } else {
        setError(friendlyError(res.message, res.status));
        if (res.status===401) router.push("/login");
      }
    } catch (err:any) {
      setError(err.message || "Failed to create festival");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create festival</h1>
        <p className="text-sm text-stone-500">Starts as DRAFT — you’ll submit for review after adding details.</p>
      </div>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="name">Festival name *</Label>
            <Input id="name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required placeholder="Summer Sounds 2026" className="mt-1" aria-describedby="name-help" />
            <p id="name-help" className="text-xs text-stone-500 mt-1">Unique slug is generated from the name.</p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="A celebration of music and culture" className="mt-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label htmlFor="start">Start date *</Label><Input id="start" type="datetime-local" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required className="mt-1" /></div>
            <div><Label htmlFor="end">End date *</Label><Input id="end" type="datetime-local" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} required className="mt-1" /></div>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          {msg && <Alert variant="success">{msg} Redirecting…</Alert>}
          <Button type="submit" isLoading={loading} className="w-full">Create DRAFT</Button>
        </form>
      </Card>
    </div>
  );
}
