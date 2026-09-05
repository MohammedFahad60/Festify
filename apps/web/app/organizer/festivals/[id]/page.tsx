"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Skeleton, Badge, Button } from "@/components/ui";

export default function OrganizerFestivalDetail() {
  const params = useParams<{ id: string }>();
  const [festival, setFestival] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    const res = await api.get<{ festival: any }>(`/api/festivals/organizer/${params.id}`);
    if (res.success && res.data) setFestival(res.data.festival);
    else setError(res.message || "Not found");
    setLoading(false);
  };
  useEffect(() => { load(); }, [params.id]);
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center"><p className="mb-4">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (!festival) return <Card className="p-8 text-center">Not found</Card>;
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-start">
        <div><h1 className="text-2xl font-semibold">{festival.name}</h1><p className="text-stone-500">{festival.status} • {new Date(festival.startDate).toLocaleDateString()}</p></div>
        <Badge variant="secondary">{festival.status}</Badge>
      </div>
      <Card className="p-6 space-y-4">
        <p className="text-stone-700">{festival.description}</p>
        <div className="flex flex-wrap gap-2">
          <a href={`/organizer/festivals/${festival.id}/edit`}><Button variant="outline">Edit</Button></a>
          {festival.status === "DRAFT" && <Button onClick={async()=>{const r=await api.patch(`/api/festivals/${festival.id}/submit`); if(r.success) window.location.reload()}}>Submit for review</Button>}
          {festival.status === "APPROVED" && <Button onClick={async()=>{const r=await api.patch(`/api/festivals/${festival.id}/publish`); if(r.success) window.location.reload()}}>Publish</Button>}
          <a href={`/organizer/festivals/${festival.id}/tickets`}><Button variant="ghost">Tickets</Button></a>
          <a href={`/organizer/festivals/${festival.id}/check-in`}><Button variant="ghost">Check-in</Button></a>
        </div>
      </Card>
    </div>
  );
}
