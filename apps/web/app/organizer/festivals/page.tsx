"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Skeleton, Button, EmptyState, Badge } from "@/components/ui";

export default function OrganizerFestivalsPage() {
  const router = useRouter();
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await api.get<{ festivals: any[] }>("/api/festivals/organizer");
    if (res.success && res.data) setFestivals(res.data.festivals);
    else {
      setError(friendlyError(res.message, res.status));
      if (res.status===401) router.push("/login?redirect=/organizer/festivals" as any);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center animate-fade-in-up"><p className="text-stone-700 mb-4">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (festivals.length === 0) return <EmptyState title="No festivals" description="You haven't created any festivals yet." action={<a href="/organizer/festivals/new"><Button>Create festival</Button></a>} />;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-semibold tracking-tight">Your festivals</h1><a href="/organizer/festivals/new"><Button>New</Button></a></div>
      <div className="space-y-3">
        {festivals.map((f: any, i:number) => (
          <a key={f.id} href={`/organizer/festivals/${f.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-2xl">
            <Card className={`p-4 flex justify-between items-center hover:shadow-md transition-shadow animate-fade-in-up stagger-${(i%6)+1}`}>
              <div><div className="font-medium">{f.name}</div><div className="text-sm text-stone-500">{new Date(f.startDate).toLocaleDateString()} → {new Date(f.endDate).toLocaleDateString()}</div></div>
              <Badge variant={f.status==="PUBLISHED"?"success":"secondary"}>{f.status}</Badge>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
