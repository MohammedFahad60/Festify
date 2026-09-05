"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Festival } from "@/lib/api";
import { Card, Badge, Skeleton, Button } from "@/components/ui";

export default function FestivalDetail() {
  const params = useParams<{ id: string }>();
  const [festival, setFestival] = useState<Festival | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await api.get<{ festival: Festival }>(`/api/festivals/${params.id}`);
    if (res.success && res.data) setFestival(res.data.festival);
    else setError(res.message || "Not found");
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-8 w-1/2" /></div>;
  if (error) return <Card className="p-8 text-center"><p className="text-stone-600 mb-4">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (!festival) return <Card className="p-8 text-center">Festival not found</Card>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="h-72 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200">
        {festival.banner ? <img src={festival.banner} alt={festival.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-400">No banner</div>}
      </div>
      <div>
        <div className="flex gap-2 mb-2"><Badge variant="success">{festival.status}</Badge><Badge variant="secondary">{festival.category?.name}</Badge></div>
        <h1 className="text-3xl font-semibold tracking-tight">{festival.name}</h1>
        <p className="text-stone-600 mt-2">{festival.description}</p>
        <p className="text-sm text-stone-500 mt-3">{festival.venue?.name} • {new Date(festival.startDate).toLocaleDateString()} → {new Date(festival.endDate).toLocaleDateString()}</p>
      </div>
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Ticket types</h3>
        {festival.ticketTypes && festival.ticketTypes.length > 0 ? (
          <div className="space-y-3">
            {festival.ticketTypes.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between border border-stone-200 rounded-xl p-4">
                <div><div className="font-medium">{t.name}</div><div className="text-sm text-stone-500">₹{t.price} • {t.quantity - t.soldQuantity} left</div></div>
                <Button size="sm">Buy</Button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-stone-500">No tickets available</p>}
      </Card>
    </div>
  );
}
