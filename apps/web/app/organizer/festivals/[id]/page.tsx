"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Skeleton, Badge, Button, Alert } from "@/components/ui";

export default function OrganizerFestivalDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [festival, setFestival] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    const res = await api.get<{ festival: any }>(`/api/festivals/organizer/${params.id}`);
    if (res.success && res.data) setFestival(res.data.festival);
    else {
      setError(friendlyError(res.message, res.status));
      if (res.status===401) router.push("/login");
      if (res.status===403) setError("You don’t own this festival or lack organizer privileges.");
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [params.id]);

  const act = async (path: string, key: string, success: string) => {
    setActionLoading(key);
    setMsg(null); setErr(null);
    const res = await api.patch(path);
    if (res.success) { setMsg(success); await load(); }
    else setErr(friendlyError(res.message, res.status));
    setActionLoading(null);
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center animate-fade-in-up"><p className="mb-4 text-stone-700">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (!festival) return <Card className="p-8 text-center">Not found</Card>;

  const canEdit = ["DRAFT","REJECTED"].includes(festival.status);
  const canSubmit = festival.status === "DRAFT";
  const canPublish = festival.status === "APPROVED";

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{festival.name}</h1>
          <p className="text-stone-500 text-sm">{festival.status} • {new Date(festival.startDate).toLocaleDateString()} → {new Date(festival.endDate).toLocaleDateString()}</p>
        </div>
        <Badge variant={festival.status==="PUBLISHED"?"success": festival.status==="DRAFT"?"secondary": festival.status==="APPROVED"?"success": festival.status==="REJECTED"?"destructive":"warning"}>{festival.status}</Badge>
      </div>
      <Card className="p-6 space-y-4">
        <p className="text-stone-700 leading-relaxed">{festival.description || "No description yet."}</p>
        <div className="text-sm text-stone-500 space-y-1 border-t pt-4">
          <div><span className="text-stone-400">Category:</span> {festival.category?.name || "—"}</div>
          <div><span className="text-stone-400">Venue:</span> {festival.venue?.name} • {festival.venue?.city}</div>
          <div><span className="text-stone-400">Organizer:</span> {festival.organizer?.organizationName}</div>
        </div>
        {msg && <Alert variant="success">{msg}</Alert>}
        {err && <Alert variant="error">{err}</Alert>}
        <div className="flex flex-wrap gap-2">
          {canEdit ? <a href={`/organizer/festivals/${festival.id}/edit`}><Button variant="outline">Edit</Button></a> : <Button variant="outline" disabled title="Only DRAFT or REJECTED can be edited">Edit</Button>}
          {canSubmit && <Button isLoading={actionLoading==="submit"} onClick={()=> act(`/api/festivals/${festival.id}/submit`, "submit", "Submitted for review — admin will approve.")}>Submit for review</Button>}
          {canPublish && <Button isLoading={actionLoading==="publish"} onClick={()=> act(`/api/festivals/${festival.id}/publish`, "publish", "Published — visible to attendees!")}>Publish</Button>}
          <a href={`/organizer/festivals/${festival.id}/tickets`}><Button variant="ghost">Tickets</Button></a>
          <a href={`/organizer/festivals/${festival.id}/check-in`}><Button variant="ghost">Check-in</Button></a>
        </div>
        {!canSubmit && !canPublish && <p className="text-xs text-stone-500">Lifecycle: DRAFT → SUBMITTED → APPROVED → PUBLISHED. Admin approves after submission.</p>}
      </Card>
    </div>
  );
}
