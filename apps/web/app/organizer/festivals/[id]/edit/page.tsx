"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Button, Input, Label, Skeleton, Alert } from "@/components/ui";

export default function EditFestivalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [festival, setFestival] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ festival: any }>(`/api/festivals/organizer/${params.id}`).then(res => {
      if (res.success && res.data) {
        setFestival(res.data.festival);
        setForm({ name: res.data.festival.name, description: res.data.festival.description || "" });
      } else {
        setErr(friendlyError(res.message, res.status));
        if (res.status===401) router.push("/login");
      }
      setLoading(false);
    });
  }, [params.id, router]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Name is required."); return; }
    setSaving(true);
    setErr(null); setMsg(null);
    const res = await api.patch(`/api/festivals/${params.id}`, { name: form.name.trim(), description: form.description.trim() || undefined });
    if (res.success) {
      setMsg("Saved. Redirecting…");
      setTimeout(()=> router.push(`/organizer/festivals/${params.id}` as any), 700);
    } else setErr(friendlyError(res.message, res.status));
    setSaving(false);
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!festival) return <Card className="p-8 text-center animate-fade-in-up">{err ? <Alert variant="error">{err}</Alert> : "Not found"}</Card>;
  if (!["DRAFT","REJECTED"].includes(festival.status)) return (
    <Card className="p-8 text-center animate-fade-in-up">
      <p className="text-stone-700 mb-2">Only <strong>DRAFT</strong> or <strong>REJECTED</strong> festivals can be edited.</p>
      <p className="text-sm text-stone-500 mb-4">Current status: <span className="font-medium">{festival.status}</span></p>
      <a href={`/organizer/festivals/${params.id}`}><Button>Back to festival</Button></a>
    </Card>
  );

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-semibold tracking-tight">Edit festival</h1>
      <p className="text-sm text-stone-500">Keep the slug consistent — it’s derived from the name only on creation.</p>
      <Card className="p-6">
        <form onSubmit={save} className="space-y-4" noValidate>
          <div><Label htmlFor="name">Name *</Label><Input id="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required className="mt-1" /></div>
          <div><Label htmlFor="desc">Description</Label><Input id="desc" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1" /></div>
          {err && <Alert variant="error">{err}</Alert>}
          {msg && <Alert variant="success">{msg}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" isLoading={saving}>Save</Button>
            <a href={`/organizer/festivals/${params.id}`}><Button type="button" variant="outline">Cancel</Button></a>
          </div>
        </form>
      </Card>
    </div>
  );
}
