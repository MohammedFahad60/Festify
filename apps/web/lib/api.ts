export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type FetchOptions = RequestInit & { params?: Record<string, string> };

async function request<T>(path: string, opts: FetchOptions = {}): Promise<{ success: boolean; data?: T; message?: string; errors?: unknown }> {
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
    return { success: false, message: json.message || `Request failed: ${res.status}`, ...json };
  }
  return json;
}

export const api = {
  get: <T>(path: string, opts?: FetchOptions) => request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: FetchOptions) => request<T>(path, { ...opts, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, opts?: FetchOptions) => request<T>(path, { ...opts, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string, opts?: FetchOptions) => request<T>(path, { ...opts, method: "DELETE" }),
};

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
  ticketTypes?: Array<{ id: string; name: string; price: string | number; quantity: number; soldQuantity: number }>;
};
