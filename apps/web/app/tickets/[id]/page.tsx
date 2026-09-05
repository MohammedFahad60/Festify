"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Skeleton, Badge, Button, Alert } from "@/components/ui";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      const res = await api.get<{ ticket: any }>(`/api/tickets/${params.id}`);
      if (res.success && res.data) setTicket(res.data.ticket);
      else {
        setError(friendlyError(res.message, res.status));
        setStatus(res.status);
        if (res.status===401) setTimeout(()=> router.push(`/login?redirect=/tickets/${params.id}` as any), 800);
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return (
    <Card className="p-8 text-center animate-fade-in-up">
      <p className="mb-2 text-stone-700">{error}</p>
      {status===403 && <p className="text-sm text-stone-500 mb-4">This ticket belongs to another account.</p>}
      {status===404 && <p className="text-sm text-stone-500 mb-4">Check the ticket link or order.</p>}
      <div className="flex gap-2 justify-center">
        <a href="/orders"><Button variant="outline">Back to orders</Button></a>
        <a href="/login"><Button>Sign in</Button></a>
      </div>
    </Card>
  );
  if (!ticket) return <Card className="p-8 text-center">Ticket not found</Card>;

  const isActive = ticket.status === "ACTIVE";
  const isUsed = ticket.status === "USED";
  const festival = ticket.ticketType?.festival;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in-up">
      <Card className="p-8 text-center">
        <div className="flex justify-center mb-4">
          <Badge variant={isActive ? "success" : isUsed ? "secondary" : "warning"}>{ticket.status}</Badge>
        </div>
        <div className="text-[11px] tracking-widest text-stone-400 mb-2">TICKET CODE</div>
        <div className="text-2xl font-mono tracking-widest font-semibold bg-stone-900 text-white rounded-xl py-4 px-6 inline-block select-all" aria-label={`Ticket code ${ticket.ticketCode}`}>
          {ticket.ticketCode}
        </div>
        <div className="mt-6 space-y-1 text-sm">
          <div className="font-medium">{ticket.ticketType?.name}</div>
          <div className="text-stone-600">{festival?.name} • {festival?.venue?.name}</div>
          <div className="text-stone-500 text-xs">{festival && new Date(festival.startDate).toLocaleDateString()} → {festival && new Date(festival.endDate).toLocaleDateString()}</div>
        </div>
        {ticket.order && (
          <div className="mt-4 text-xs">
            <span className="text-stone-500">Order </span>
            <a href={`/orders/${ticket.order.id}`} className="font-mono underline hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded">{ticket.order.id.slice(0,8)}…</a>
            <span className="ml-2"><Badge variant={ticket.order.status==="CONFIRMED"?"success":"warning"}>{ticket.order.status}</Badge></span>
          </div>
        )}
        <div className="mt-6 text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl p-3">
          Present this code at entrance. Organizer will scan to check in. Keep it private.
        </div>
        {!isActive && isUsed && <Alert variant="warning" ><span className="font-medium">This ticket has been used.</span> It cannot be checked in again.</Alert>}
        {ticket.status==="CANCELLED" && <Alert variant="error">This ticket was cancelled and is no longer valid.</Alert>}
        {ticket.order?.status !== "CONFIRMED" && <Alert variant="warning">Order not confirmed — payment may still be pending. Ticket is not yet valid for entry.</Alert>}
      </Card>
      <Card className="p-6">
        <h3 className="font-medium mb-2">Ticket details</h3>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between"><dt className="text-stone-500">Ticket ID</dt><dd className="font-mono text-xs">{ticket.id.slice(0,8)}…</dd></div>
          <div className="flex justify-between"><dt className="text-stone-500">Status</dt><dd>{ticket.status}</dd></div>
          <div className="flex justify-between"><dt className="text-stone-500">Created</dt><dd>{new Date(ticket.createdAt).toLocaleString()}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
