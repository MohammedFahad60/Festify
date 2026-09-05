"use client";
import { Card, Button, Badge } from "@/components/ui";
export default function AdminDashboard() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-stone-500">Review organizers and festival submissions.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <a href="/admin/organizers" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-2xl">
          <Card className="p-6 hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 text-sm">◉</div>
              <Badge variant="warning">Pending</Badge>
            </div>
            <div className="font-medium">Organizers</div>
            <div className="text-sm text-stone-500 mt-1">Review pending organizer applications — approve or reject.</div>
            <Button size="sm" className="mt-4">Review organizers</Button>
          </Card>
        </a>
        <a href="/admin/festivals" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-2xl">
          <Card className="p-6 hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 text-sm">◎</div>
              <Badge variant="success">Submitted</Badge>
            </div>
            <div className="font-medium">Festivals</div>
            <div className="text-sm text-stone-500 mt-1">Review submitted festivals — approve to allow publishing.</div>
            <Button size="sm" className="mt-4">Review festivals</Button>
          </Card>
        </a>
      </div>
    </div>
  );
}
