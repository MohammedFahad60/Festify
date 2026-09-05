"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Skeleton, Button, EmptyState, Badge, Alert } from "@/components/ui";

export default function OrganizerDashboard() {
  const router = useRouter();
  const [festivals, setFestivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    setError(null);
    setStatus(undefined);
    const res = await api.get<{ festivals: any[] }>("/api/festivals/organizer");
    if (res.success && res.data) setFestivals(res.data.festivals);
    else {
      setError(friendlyError(res.message, res.status));
      setStatus(res.status);
      if (res.status===401) setTimeout(()=> router.push("/login?redirect=/organizer" as any), 900);
      if (res.status===403) setError("Organizer access required. Your account may not be approved as an organizer.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (error) return (
    <Card className="p-8 text-center animate-fade-in-up">
      <p className="text-stone-700 mb-2">{error}</p>
      {status===401 && <Alert variant="warning">Redirecting to sign in…</Alert>}
      <div className="flex gap-2 justify-center mt-4">
        <Button onClick={load}>Retry</Button>
        <a href="/organizer/festivals/new"><Button variant="outline">Create festival</Button></a>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizer</h1>
          <p className="text-sm text-stone-500">Your festivals and lifecycle actions.</p>
        </div>
        <a href="/organizer/festivals/new"><Button>Create festival</Button></a>
      </div>
      {festivals.length === 0 ? <EmptyState title="No festivals" description="Create your first festival to get started. You’ll be able to manage tickets and check-in once it’s published." action={<a href="/organizer/festivals/new"><Button>Create festival</Button></a>} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {festivals.map((f: any, i: number) => (
            <a key={f.id} href={`/organizer/festivals/${f.id}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-2xl">
              <Card className={`p-5 hover:shadow-md transition-all hover:-translate-y-0.5 animate-fade-in-up stagger-${(i%6)+1}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-sm text-stone-500">{f.status} • {new Date(f.startDate).toLocaleDateString()}</div>
                  </div>
                  <Badge variant={f.status==="PUBLISHED"?"success": f.status==="DRAFT"?"secondary": f.status==="APPROVED"?"success": f.status==="REJECTED"?"destructive":"warning"}>{f.status}</Badge>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
