"use client";
import { Card, Button } from "@/components/ui";
export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <a href="/admin/organizers"><Card className="p-6 hover:shadow-md transition-shadow"><div className="font-medium">Organizers</div><div className="text-sm text-stone-500">Review pending organizer applications</div><Button size="sm" className="mt-3">Review</Button></Card></a>
        <a href="/admin/festivals"><Card className="p-6 hover:shadow-md transition-shadow"><div className="font-medium">Festivals</div><div className="text-sm text-stone-500">Review submitted festivals</div><Button size="sm" className="mt-3">Review</Button></Card></a>
      </div>
    </div>
  );
}
