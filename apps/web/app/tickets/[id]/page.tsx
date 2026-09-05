"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Skeleton, Badge, Button } from "@/components/ui";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await api.get<{ ticket: any }>(`/api/tickets/${params.id}`);
      if (res.success && res.data) setTicket(res.data.ticket);
      else setError(res.message || "Not found");
      setLoading(false);
    };
    load();
  }, [params.id]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Card className="p-8 text-center"><p className="mb-4">{error}</p><a href="/orders"><Button>Back to orders</Button></a></Card>;
  if (!ticket) return <Card className="p-8 text-center">Ticket not found</Card>;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in-up">
      <Card className="p-8 text-center">
        <Badge variant={ticket.status === "ACTIVE" ? "success" : ticket.status === "USED" ? "secondary" : "warning"} className="mb-4">{ticket.status}</Badge>
        <div className="text-2xl font-mono tracking-widest font-semibold bg-stone-900 text-white rounded-xl py-4 px-6 inline-block">{ticket.ticketCode}</div>
        <div className="mt-4 text-sm text-stone-600">
          <div>{ticket.ticketType?.name}</div>
          <div>{ticket.ticketType?.festival?.name} • {ticket.ticketType?.festival?.venue?.name}</div>
        </div>
        <div className="mt-6 text-xs text-stone-500">Present this code at entrance. Organizer will scan to check in.</div>
      </Card>
    </div>
  );
}
