import { supabase } from "@/integrations/supabase/client";

export type Verdict = "phishing" | "legit";

export type ScanResult = {
  result: Verdict;
  confidence: number;
};

export type HistoryItem = {
  id?: string;
  user_id?: string;
  user_email?: string;
  url: string;
  result: Verdict;
  confidence: number;
  created_at?: string;
};

export type HistoryResponse = {
  items: HistoryItem[];
  total: number;
  pagination?: {
    limit: number;
    offset: number;
  };
};

export type AdminAnalytics = {
  overview: {
    total_scans: number;
    unique_users: number;
    phishing_count: number;
    legit_count: number;
    avg_confidence: number;
  };
  activity: Array<{
    date: string;
    total: number;
    phishing: number;
    legit: number;
  }>;
  top_risky_urls: Array<{
    url: string;
    count: number;
    result: Verdict;
    last_seen?: string;
  }>;
  recent_scans: HistoryItem[];
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getApiBaseUrl() {
  const rawBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_FLASK_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.FLASK_API_BASE_URL;

  if (!rawBaseUrl) {
    throw new ApiError(
      "Missing backend URL. Set VITE_API_BASE_URL (or VITE_FLASK_API_BASE_URL) to your Flask API base URL.",
      500,
    );
  }

  return rawBaseUrl.replace(/\/+$/, "");
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toVerdict(value: unknown): Verdict {
  return value === "phishing" ? "phishing" : "legit";
}

function normalizeHistoryItem(value: unknown): HistoryItem {
  const record = asObject(value) ?? {};
  return {
    id: toString(record.id) || undefined,
    user_id: toString(record.user_id) || undefined,
    user_email: toString(record.user_email ?? record.email) || undefined,
    url: toString(record.url),
    result: toVerdict(record.result),
    confidence: toNumber(record.confidence),
    created_at: toString(record.created_at) || undefined,
  };
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }

  return session.access_token;
}

async function parseApiError(response: Response) {
  let message = `Request failed with status ${response.status}`;

  try {
    const body = await response.clone().json();
    const record = asObject(body);
    const errorRecord = asObject(record?.error);
    message =
      toString(errorRecord?.message) ||
      toString(record?.message) ||
      toString(record?.error) ||
      message;
  } catch {
    const text = (await response.text()).trim();
    if (text) message = text;
  }

  return new ApiError(message, response.status);
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = await getAccessToken();
  const url = new URL(`${getApiBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) throw await parseApiError(response);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function scanUrl(url: string) {
  const payload = await request<unknown>("/scan", {
    method: "POST",
    body: { url },
  });
  const record = asObject(payload) ?? {};
  return {
    result: toVerdict(record.result),
    confidence: toNumber(record.confidence),
  } satisfies ScanResult;
}

export async function fetchHistory(
  params: {
    search?: string;
    result?: Verdict;
    sort?: string;
    limit?: number;
  } = {},
) {
  const payload = await request<unknown>("/history", {
    query: {
      search: params.search,
      result: params.result,
      sort: params.sort,
      limit: params.limit ?? 500,
    },
  });
  const record = asObject(payload) ?? {};
  const items = Array.isArray(record.items) ? record.items.map(normalizeHistoryItem) : [];

  return {
    items,
    total: toNumber(record.total, items.length),
    pagination: asObject(record.pagination)
      ? {
          limit: toNumber(asObject(record.pagination)?.limit, 0),
          offset: toNumber(asObject(record.pagination)?.offset, 0),
        }
      : undefined,
  } satisfies HistoryResponse;
}

export async function fetchAdminAnalytics(range: "7d" | "30d" | "90d") {
  const payload = await request<unknown>("/admin/stats", {
    query: { range },
  });
  const record = asObject(payload) ?? {};
  const overview = asObject(record.overview) ?? {};

  return {
    overview: {
      total_scans: toNumber(overview.total_scans),
      unique_users: toNumber(overview.unique_users),
      phishing_count: toNumber(overview.phishing_count),
      legit_count: toNumber(overview.legit_count),
      avg_confidence: toNumber(overview.avg_confidence),
    },
    activity: Array.isArray(record.activity)
      ? record.activity.map((item) => {
          const entry = asObject(item) ?? {};
          return {
            date: toString(entry.date),
            total: toNumber(entry.total),
            phishing: toNumber(entry.phishing),
            legit: toNumber(entry.legit),
          };
        })
      : [],
    top_risky_urls: Array.isArray(record.top_risky_urls)
      ? record.top_risky_urls.map((item) => {
          const entry = asObject(item) ?? {};
          return {
            url: toString(entry.url),
            count: toNumber(entry.count),
            result: toVerdict(entry.result),
            last_seen: toString(entry.last_seen) || undefined,
          };
        })
      : [],
    recent_scans: Array.isArray(record.recent_scans)
      ? record.recent_scans.map(normalizeHistoryItem)
      : [],
  } satisfies AdminAnalytics;
}
