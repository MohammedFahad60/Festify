"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Skeleton, Button, EmptyState } from "@/components/ui";

export default function OrganizerDashboard() {
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await api.get<{ festivals: any[] }>("/api/festivals/organizer");
    if (res.success && res.data) setFestivals(res.data.festivals);
    else setError(res.message || "Failed to load");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="grid gap-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (error) return <Card className="p-8 text-center"><p className="mb-4">{error}</p><Button onClick={load}>Retry</Button></Card>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Organizer</h1>
        <a href="/organizer/festivals/new"><Button>Create festival</Button></a>
      </div>
      {festivals.length === 0 ? <EmptyState title="No festivals" description="Create your first festival to get started." action={<a href="/organizer/festivals/new"><Button>Create</Button></a>} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {festivals.map((f: any, i: number) => (
            <a key={f.id} href={`/organizer/festivals/${f.id}`}>
              <Card className={`p-5 hover:shadow-md transition-shadow animate-fade-in-up stagger-${(i%6)+1}`}>
                <div className="font-medium">{f.name}</div>
                <div className="text-sm text-stone-500">{f.status} • {new Date(f.startDate).toLocaleDateString()}</div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
