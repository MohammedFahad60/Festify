export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type FetchOptions = RequestInit & { params?: Record<string, string> };

async function request<T>(path: string, opts: FetchOptions = {}): Promise<{ success: boolean; data?: T; message?: string; errors?: unknown; status?: number }> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, status: res.status, message: json.message || `Request failed: ${res.status}`, ...json };
  }
  return { success: true, status: res.status, ...json };
}

export const api = {
  get: <T>(path: string, opts?: FetchOptions) => request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: FetchOptions) => request<T>(path, { ...opts, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, opts?: FetchOptions) => request<T>(path, { ...opts, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string, opts?: FetchOptions) => request<T>(path, { ...opts, method: "DELETE" }),
};

export function friendlyError(message?: string, status?: number) {
  if (!message) return "Something went wrong. Please try again.";
  const lower = message.toLowerCase();
  if (lower.includes("not authenticated") || status === 401) return "Please sign in to continue.";
  if (lower.includes("forbidden") || lower.includes("not have permission") || status === 403) return "You don’t have permission to do that.";
  if (lower.includes("festival is not published")) return "This festival isn’t available for purchase yet.";
  if (lower.includes("festival has already ended")) return "This festival has ended.";
  if (lower.includes("sales are not currently active")) return "Ticket sales aren’t active right now.";
  if (lower.includes("maximum tickets per user")) return "You’ve reached the purchase limit for this ticket type.";
  if (lower.includes("not enough tickets")) return "Not enough tickets left — try a smaller quantity.";
  if (lower.includes("order has already been")) return "This order has already been processed.";
  if (lower.includes("payment has already been completed")) return "This payment is already completed.";
  if (lower.includes("ticket has already been used")) return "This ticket has already been checked in.";
  if (lower.includes("ticket has been cancelled")) return "This ticket was cancelled.";
  if (lower.includes("order is not confirmed")) return "Order isn’t confirmed yet.";
  if (lower.includes("only pending orders can be")) return "Only pending orders can be changed.";
  if (lower.includes("insufficient")) return message;
  return message;
}

export type Festival = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  banner: string | null;
  startDate: string;
  endDate: string;
  status: string;
  category: { name: string; slug: string };
  venue: { name: string; city: string; state: string };
  organizer: { organizationName: string };
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: string | number;
    quantity: number;
    soldQuantity: number;
    status?: string;
    saleStart?: string;
    saleEnd?: string;
    maxPerUser?: number | null;
  }>;
};

export type Order = {
  id: string;
  status: string;
  totalAmount: string | number;
  createdAt: string;
  festival?: { name: string };
  items?: Array<{ id: string; quantity: number; unitPrice: string; totalPrice: string; ticketType?: { name: string } }>;
  payments?: Array<{ status: string }>;
  tickets?: Array<{ id: string; ticketCode: string; status: string }>;
};
