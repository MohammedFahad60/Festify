"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Skeleton, Button, EmptyState } from "@/components/ui";
export default function AdminFestivalsPage() {
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const load = async () => {
    setLoading(true);
    const res = await api.get<{ festivals: any[] }>("/api/admin/festivals/submitted");
    if (res.success && res.data) setFestivals(res.data.festivals);
    else setError(res.message || "Failed");
    setLoading(false);
  };
  useEffect(()=>{load();},[]);
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center"><p>{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (festivals.length===0) return <EmptyState title="No submitted festivals" description="All caught up." />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Submitted festivals</h1>
      {festivals.map((f:any)=><Card key={f.id} className="p-4 flex justify-between items-center"><div><div className="font-medium">{f.name}</div><div className="text-sm text-stone-500">{f.organizer?.organizationName} • {new Date(f.startDate).toLocaleDateString()}</div></div><div className="flex gap-2"><Button size="sm" onClick={async()=>{await api.patch(`/api/admin/festivals/${f.id}/approve`); load();}}>Approve</Button><Button size="sm" variant="outline" onClick={async()=>{await api.patch(`/api/admin/festivals/${f.id}/reject`); load();}}>Reject</Button></div></Card>)}
    </div>
  );
}
