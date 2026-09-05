"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Button, Input, Label, Badge } from "@/components/ui";

export default function CheckInPage() {
  const params = useParams<{ id: string }>();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    setLoading(true);
    setError(null);
    const res = await api.post("/api/tickets/validate", { ticketCode: code });
    if (res.success) setResult(res.data);
    else setError(res.message || "Invalid");
    setLoading(false);
  };

  const checkIn = async () => {
    setLoading(true);
    const res = await api.post<{ ticket: any }>(`/api/tickets/${code}/check-in`);
    if (res.success) setResult({ valid: true, ticket: (res.data as any)?.ticket, checkedIn: true });
    else setError(res.message || "Check-in failed");
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Check-in</h1>
      <p className="text-sm text-stone-500">Festival {params.id.slice(0,8)}… — organizer only</p>
      <Card className="p-6 space-y-4">
        <div><Label>Ticket code</Label><Input value={code} onChange={e=>setCode(e.target.value)} placeholder="FST-..." className="mt-1 font-mono" /></div>
        <div className="flex gap-2"><Button onClick={validate} disabled={loading || !code}>{loading ? "..." : "Validate"}</Button><Button onClick={checkIn} disabled={loading || !code} variant="outline">{loading ? "..." : "Check-in"}</Button></div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
        {result && (
          <div className="border rounded-xl p-4 bg-stone-50">
            <div className="flex gap-2 mb-2"><Badge variant={result.valid ? "success" : "warning"}>{result.valid ? "VALID" : "INVALID"}</Badge>{result.checkedIn && <Badge>USED</Badge>}</div>
            <pre className="text-xs overflow-auto">{JSON.stringify(result.ticket || result, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}
