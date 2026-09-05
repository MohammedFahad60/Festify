"use client";

import { useEffect, useState } from "react";
import { api, Festival } from "@/lib/api";
import { Card, Badge, Skeleton, EmptyState, Button } from "@/components/ui";

export default function HomePage() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await api.get<{ festivals: Festival[] }>("/api/festivals");
    if (res.success && res.data) setFestivals(res.data.festivals);
    else setError(res.message || "Failed to load festivals");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0,1,2,3,4,5].map(i => (
            <Card key={i} className={`p-0 overflow-hidden animate-fade-in-up stagger-${(i%6)+1}`}>
              <Skeleton className="h-48 w-full" />
              <div className="p-5 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Discover festivals</h1>
          <p className="text-stone-500 mt-1">Handpicked celebrations, updated weekly.</p>
        </div>
        <Card className="p-8 text-center">
          <p className="text-stone-600 mb-4">{error}</p>
          <Button onClick={load}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (festivals.length === 0) {
    return <EmptyState title="No festivals yet" description="Published festivals will appear here. Check back soon or refine your search." action={<Button onClick={load}>Refresh</Button>} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight animate-fade-in-up">Discover festivals</h1>
          <p className="text-stone-500 mt-1 animate-fade-in-up stagger-1">Handpicked celebrations, updated weekly.</p>
        </div>
        <div className="flex gap-2 animate-fade-in-up stagger-2">
          <Badge variant="secondary">{festivals.length} live</Badge>
          <Badge variant="success">PUBLISHED only</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {festivals.map((f, i) => (
          <a key={f.id} href={`/festivals/${f.id}`} className={`group animate-fade-in-up stagger-${(i%6)+1}`}>
            <Card className="overflow-hidden p-0 h-full flex flex-col group-hover:shadow-lg transition-all duration-200 group-active:scale-[0.98]">
              <div className="h-48 bg-stone-100 relative overflow-hidden">
                {f.banner ? (
                  <img src={f.banner} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-400">No image</div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge variant="success">PUBLISHED</Badge>
                  <Badge variant="secondary">{f.category?.name}</Badge>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-semibold leading-tight line-clamp-1 group-hover:text-stone-900">{f.name}</h3>
                <p className="text-sm text-stone-500 line-clamp-2 mt-1 flex-1">{f.description || "An unforgettable experience awaits."}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
                  <span>{f.venue?.city} • {new Date(f.startDate).toLocaleDateString()}</span>
                  <span className="font-medium text-stone-900 group-hover:underline">View →</span>
                </div>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
