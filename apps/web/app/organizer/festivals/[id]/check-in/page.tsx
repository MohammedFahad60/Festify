"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, friendlyError } from "@/lib/api";
import { Card, Button, Input, Label, Badge, Alert } from "@/components/ui";

export default function CheckInPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"idle"|"validating"|"checking">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState<boolean>(false);

  const validate = async () => {
    if (!code.trim()) { setError("Please enter a ticket code."); return; }
    setMode("validating");
    setError(null);
    setResult(null);
    setCheckedIn(false);
    const res = await api.post<any>("/api/tickets/validate", { ticketCode: code.trim() });
    if (res.success) {
      setResult(res.data);
      if (!res.data.valid) {
        const reason = res.data.reason;
        let msg = "Ticket is not valid for entry.";
        if (reason === "TICKET_USED" || reason === "TICKET_ALREADY_USED") msg = "This ticket has already been used.";
        else if (reason === "TICKET_CANCELLED") msg = "This ticket was cancelled.";
        else if (reason === "ORDER_NOT_CONFIRMED") msg = "Order isn’t confirmed yet — payment required.";
        else if (reason === "PAYMENT_NOT_SUCCESSFUL") msg = "Payment not successful.";
        setError(msg);
      }
    } else {
      if (res.status===401) router.push("/login");
      setError(friendlyError(res.message, res.status));
      if (res.status===403) setError("You’re not authorized for this festival’s tickets (wrong organizer).");
      if (res.status===404) setError("Ticket not found — check the code.");
    }
    setMode("idle");
  };

  const checkIn = async () => {
    if (!code.trim()) { setError("Please enter a ticket code."); return; }
    setMode("checking");
    setError(null);
    const res = await api.post<{ ticket: any }>(`/api/tickets/${code.trim()}/check-in`);
    if (res.success) {
      setResult({ valid: true, ticket: (res.data as any)?.ticket, checkedIn: true });
      setCheckedIn(true);
    } else {
      if (res.status===401) router.push("/login");
      const msg = friendlyError(res.message, res.status);
      if (res.status===403) setError("You cannot check in tickets for another organizer’s festival.");
      else if (res.status===409 && msg.toLowerCase().includes("already been used")) setError("This ticket has already been checked in — cannot reuse.");
      else setError(msg);
    }
    setMode("idle");
  };

  const isLoading = mode !== "idle";

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in</h1>
        <p className="text-sm text-stone-500">Festival <span className="font-mono text-xs bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5">{params.id.slice(0,8)}…</span> — organizer only. Code is validated server-side.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="code">Ticket code</Label>
          <Input id="code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="FST-..." className="mt-1 font-mono tracking-widest" autoComplete="off" spellCheck={false} aria-describedby="code-help" />
          <p id="code-help" className="text-xs text-stone-500 mt-1">Enter or paste the attendee’s ticket code. Case-insensitive.</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={validate} isLoading={mode==="validating"} disabled={isLoading || !code.trim()} aria-label="Validate ticket">Validate</Button>
          <Button onClick={checkIn} isLoading={mode==="checking"} disabled={isLoading || !code.trim()} variant="outline" aria-label="Check in ticket">Check-in</Button>
          <Button variant="ghost" onClick={()=> { setCode(""); setResult(null); setError(null); setCheckedIn(false); }} disabled={isLoading}>Clear</Button>
        </div>

        {error && <Alert variant="error" ><span className="font-medium"> </span>{error}</Alert>}

        {result && (
          <div className="border rounded-xl p-4 bg-stone-50 space-y-3 animate-fade-in-up">
            <div className="flex flex-wrap gap-2">
              <Badge variant={result.valid ? "success" : "warning"}>{result.valid ? "VALID" : "INVALID"}</Badge>
              {checkedIn && <Badge variant="secondary">CHECKED IN ✓</Badge>}
              {result.ticket?.status && <Badge variant={result.ticket.status==="USED"?"secondary": result.ticket.status==="ACTIVE"?"success":"destructive"}>{result.ticket.status}</Badge>}
            </div>

            {result.ticket ? (
              <div className="text-sm space-y-1">
                <div className="font-medium">{result.ticket.ticketType?.name || result.ticket.ticketType?.name} • {result.ticket.ticketType?.festival?.name}</div>
                <div className="text-stone-600">Attendee: {result.ticket.user?.name || "—"} </div>
                <div className="text-stone-500 text-xs">Festival: {result.ticket.ticketType?.festival?.name} • {result.ticket.ticketType?.festival?.venue?.name}</div>
                <div className="font-mono text-xs bg-white border border-stone-200 rounded-lg px-2 py-1 inline-block">{result.ticket.ticketCode || code.toUpperCase()}</div>
                {checkedIn && <div className="text-emerald-700 font-medium">✓ Successfully checked in at {new Date().toLocaleTimeString()}. Don’t reuse.</div>}
              </div>
            ) : result.valid !== undefined ? (
              <div className="text-sm text-stone-600">
                {result.valid ? "Ready to check in." : `Reason: ${result.reason || "Unknown"}`}
              </div>
            ) : (
              <pre className="text-xs overflow-auto bg-white border rounded-lg p-3">{JSON.stringify(result, null, 2)}</pre>
            )}
          </div>
        )}

        <div className="text-xs text-stone-500 border-t pt-4">
          <div className="font-medium text-stone-700 mb-1">How it works</div>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Validate</strong> checks without changing status — safe to preview.</li>
            <li><strong>Check-in</strong> atomically marks <code className="bg-stone-100 px-1 rounded">ACTIVE → USED</code>. Second scan fails with 409.</li>
            <li>Only tickets with <strong>ACTIVE</strong> status and <strong>CONFIRMED</strong> order + successful payment are valid.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
