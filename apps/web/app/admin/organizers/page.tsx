"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Skeleton, Button, EmptyState, Alert, Dialog } from "@/components/ui";

export default function AdminOrganizersPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [actionId, setActionId] = useState<string|null>(null);
  const [msg, setMsg] = useState<string|null>(null);
  const [pendingAction, setPendingAction] = useState<{id:string, type:"approve"|"reject"}|null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    const res = await api.get<{ organizers: any[] }>("/api/admin/organizers/pending");
    if (res.success && res.data) setOrgs(res.data.organizers);
    else {
      setError(friendlyError(res.message, res.status));
      if (res.status===401) router.push("/login?redirect=/admin/organizers" as any);
      if (res.status===403) setError("Admin access required.");
    }
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const act = async () => {
    if (!pendingAction) return;
    setActionId(pendingAction.id);
    const res = await api.patch(`/api/admin/organizers/${pendingAction.id}/${pendingAction.type}`);
    if (res.success) {
      setMsg(`Organizer ${pendingAction.type}d.`);
      await load();
    } else {
      setError(friendlyError(res.message, res.status));
    }
    setActionId(null);
    setPendingAction(null);
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center animate-fade-in-up"><p className="text-stone-700 mb-2">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (orgs.length===0) return <EmptyState title="No pending organizers" description="All caught up — new applications will appear here." action={<Button onClick={load} variant="outline">Refresh</Button>} />;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">Pending organizers</h1>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>
      {msg && <Alert variant="success">{msg}</Alert>}
      <div className="space-y-3">
        {orgs.map((o:any)=>(
          <Card key={o.id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{o.organizationName}</div>
              <div className="text-sm text-stone-500 truncate">{o.user?.email} • {o.verificationStatus}</div>
              {o.description && <div className="text-xs text-stone-400 line-clamp-2">{o.description}</div>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" isLoading={actionId===o.id && pendingAction?.type==="approve"} disabled={!!actionId} onClick={()=> setPendingAction({id:o.id, type:"approve"})}>Approve</Button>
              <Button size="sm" variant="outline" isLoading={actionId===o.id && pendingAction?.type==="reject"} disabled={!!actionId} onClick={()=> setPendingAction({id:o.id, type:"reject"})}>Reject</Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!pendingAction} onClose={()=> setPendingAction(null)} title={pendingAction?.type==="approve" ? "Approve organizer?" : "Reject organizer?"} description={pendingAction?.type==="approve" ? "This organizer will be able to create festivals." : "The applicant will be notified and cannot create festivals."}>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={()=> setPendingAction(null)}>Cancel</Button>
          <Button onClick={act} isLoading={!!actionId}>{pendingAction?.type==="approve" ? "Approve" : "Reject"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
