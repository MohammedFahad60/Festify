"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Skeleton, Button, EmptyState } from "@/components/ui";
export default function AdminOrganizersPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const load = async () => {
    setLoading(true);
    const res = await api.get<{ organizers: any[] }>("/api/admin/organizers/pending");
    if (res.success && res.data) setOrgs(res.data.organizers);
    else setError(res.message || "Failed");
    setLoading(false);
  };
  useEffect(()=>{load();},[]);
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center"><p>{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (orgs.length===0) return <EmptyState title="No pending organizers" description="All caught up." />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pending organizers</h1>
      {orgs.map((o:any)=><Card key={o.id} className="p-4 flex justify-between items-center"><div><div className="font-medium">{o.organizationName}</div><div className="text-sm text-stone-500">{o.user?.email} • {o.verificationStatus}</div></div><div className="flex gap-2"><Button size="sm" onClick={async()=>{await api.patch(`/api/admin/organizers/${o.id}/approve`); load();}}>Approve</Button><Button size="sm" variant="outline" onClick={async()=>{await api.patch(`/api/admin/organizers/${o.id}/reject`); load();}}>Reject</Button></div></Card>)}
    </div>
  );
}
