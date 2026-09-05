"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Skeleton, Button, EmptyState, Alert, Dialog, Badge } from "@/components/ui";

export default function AdminFestivalsPage() {
  const router = useRouter();
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [actionId, setActionId] = useState<string|null>(null);
  const [msg, setMsg] = useState<string|null>(null);
  const [pending, setPending] = useState<{id:string, type:"approve"|"reject"}|null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    const res = await api.get<{ festivals: any[] }>("/api/admin/festivals/submitted");
    if (res.success && res.data) setFestivals(res.data.festivals);
    else {
      setError(friendlyError(res.message, res.status));
      if (res.status===401) router.push("/login?redirect=/admin/festivals" as any);
      if (res.status===403) setError("Admin access required.");
    }
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const act = async () => {
    if (!pending) return;
    setActionId(pending.id);
    const res = await api.patch(`/api/admin/festivals/${pending.id}/${pending.type}`);
    if (res.success) {
      setMsg(`Festival ${pending.type}d. Organizer can now publish if approved.`);
      await load();
    } else setError(friendlyError(res.message, res.status));
    setActionId(null);
    setPending(null);
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center animate-fade-in-up"><p className="text-stone-700 mb-2">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (festivals.length===0) return <EmptyState title="No submitted festivals" description="All caught up — submitted festivals will appear here for review." action={<Button onClick={load} variant="outline">Refresh</Button>} />;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">Submitted festivals</h1>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>
      {msg && <Alert variant="success">{msg}</Alert>}
      <div className="space-y-3">
        {festivals.map((f:any)=>(
          <Card key={f.id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{f.name}</div>
              <div className="text-sm text-stone-500 truncate">{f.organizer?.organizationName || "Organizer"} • {new Date(f.startDate).toLocaleDateString()} → {new Date(f.endDate).toLocaleDateString()}</div>
              <Badge variant="warning" className="mt-1">{f.status}</Badge>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" isLoading={actionId===f.id && pending?.type==="approve"} disabled={!!actionId} onClick={()=> setPending({id:f.id, type:"approve"})}>Approve</Button>
              <Button size="sm" variant="outline" isLoading={actionId===f.id && pending?.type==="reject"} disabled={!!actionId} onClick={()=> setPending({id:f.id, type:"reject"})}>Reject</Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!pending} onClose={()=> setPending(null)} title={pending?.type==="approve" ? "Approve festival?" : "Reject festival?"} description={pending?.type==="approve" ? "Organizer will be able to publish this festival." : "This festival will be marked as rejected."}>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={()=> setPending(null)}>Cancel</Button>
          <Button onClick={act} isLoading={!!actionId}>{pending?.type==="approve" ? "Approve" : "Reject"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
