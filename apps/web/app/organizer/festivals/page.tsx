"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Skeleton, Button, EmptyState, Badge } from "@/components/ui";

export default function OrganizerFestivalsPage() {
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    const res = await api.get<{ festivals: any[] }>("/api/festivals/organizer");
    if (res.success && res.data) setFestivals(res.data.festivals);
    else setError(res.message || "Failed");
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center"><p>{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (festivals.length === 0) return <EmptyState title="No festivals" description="You haven't created any festivals yet." action={<a href="/organizer/festivals/new"><Button>Create festival</Button></a>} />;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-semibold">Your festivals</h1><a href="/organizer/festivals/new"><Button>New</Button></a></div>
      <div className="space-y-3">
        {festivals.map((f: any) => (
          <a key={f.id} href={`/organizer/festivals/${f.id}`}><Card className="p-4 flex justify-between items-center hover:shadow-md transition-shadow"><div><div className="font-medium">{f.name}</div><div className="text-sm text-stone-500">{new Date(f.startDate).toLocaleDateString()}</div></div><Badge variant="secondary">{f.status}</Badge></Card></a>
        ))}
      </div>
    </div>
  );
}
