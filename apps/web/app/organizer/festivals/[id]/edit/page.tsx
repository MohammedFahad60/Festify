"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Button, Input, Label, Skeleton } from "@/components/ui";

export default function EditFestivalPage() {
  const params = useParams<{ id: string }>();
  const [festival, setFestival] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ festival: any }>(`/api/festivals/organizer/${params.id}`).then(res => {
      if (res.success && res.data) {
        setFestival(res.data.festival);
        setForm({ name: res.data.festival.name, description: res.data.festival.description || "" });
      }
      setLoading(false);
    });
  }, [params.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await api.patch(`/api/festivals/${params.id}`, form);
    setMsg(res.success ? "Saved" : (res.message || "Failed"));
    setSaving(false);
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!festival) return <Card className="p-8 text-center">Not found</Card>;
  if (!["DRAFT","REJECTED"].includes(festival.status)) return <Card className="p-8 text-center"><p>Only DRAFT or REJECTED can be edited. Current: {festival.status}</p><a href={`/organizer/festivals/${params.id}`}><Button className="mt-4">Back</Button></a></Card>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit festival</h1>
      <Card className="p-6">
        <form onSubmit={save} className="space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1" /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1" /></div>
          {msg && <p className="text-sm p-3 rounded-xl bg-stone-50 border">{msg}</p>}
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </form>
      </Card>
    </div>
  );
}
