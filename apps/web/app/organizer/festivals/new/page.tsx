"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, Button, Input, Label } from "@/components/ui";

export default function NewFestivalPage() {
  const [form, setForm] = useState({ name: "", description: "", categoryId: "", venueId: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    // For MVP, assume category/venue are selected via known IDs; placeholder uses first available from catalog
    // If empty, fetch catalog first
    let catId = form.categoryId;
    let venId = form.venueId;
    if (!catId) {
      const cats = await api.get<{ categories: any[] }>("/api/catalog/categories");
      catId = cats.data?.categories[0]?.id || "";
    }
    if (!venId) {
      const vens = await api.get<{ venues: any[] }>("/api/catalog/venues");
      venId = vens.data?.venues[0]?.id || "";
    }
    const res = await api.post("/api/festivals", {
      name: form.name,
      description: form.description,
      categoryId: catId,
      venueId: venId,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    });
    if (res.success) setMsg("Festival created as DRAFT. Go to Organizer dashboard to submit.");
    else setError(res.message || "Failed");
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Create festival</h1>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required placeholder="Summer Sounds 2026" className="mt-1" /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="A celebration of music" className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start date</Label><Input type="datetime-local" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required className="mt-1" /></div>
            <div><Label>End date</Label><Input type="datetime-local" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} required className="mt-1" /></div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
          {msg && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{msg}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating..." : "Create DRAFT"}</Button>
        </form>
      </Card>
    </div>
  );
}
