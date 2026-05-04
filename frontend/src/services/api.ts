import { supabase } from "@/integrations/supabase/client";

export type Prediction = "phishing" | "safe";

export type PredictionResponse = {
  prediction: Prediction;
  result: "phishing" | "legit";
  confidence: number | null;
  modelName: string | null;
  modelVersion: string | null;
};

export type HistorySort = "newest" | "oldest" | "confidence_desc" | "confidence_asc";

export type HistoryItem = {
  id?: string;
  userId?: string;
  userEmail?: string | null;
  url: string;
  result: "phishing" | "legit";
  confidence: number | null;
  created_at?: string;
};

export type HistoryResponse = {
  items: HistoryItem[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
  };
};

export type HistoryFilters = {
  limit: number;
  offset: number;
  search: string;
  result: "" | "phishing" | "legit";
  sort: HistorySort;
};

export type AdminLog = {
  id?: string;
  user_id?: string;
  user_email?: string | null;
  input: string;
  prediction: Prediction;
  created_at?: string;
};

export type AdminUser = {
  id?: string;
  email?: string | null;
  role: "user" | "admin";
  created_at?: string;
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

  if (rawBaseUrl) {
    return rawBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:5000`;
  }

  throw new ApiError("Missing backend URL. Set VITE_API_BASE_URL to your Flask API base URL.", 500);
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toPrediction(value: unknown): Prediction {
  return value === "phishing" ? "phishing" : "safe";
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
    if (text) {
      message = text;
    }
  }

  return new ApiError(message, response.status);
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = await getAccessToken();
  const url = new URL(`${getApiBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
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

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

export async function predictUrl(url: string) {
  const payload = await request<unknown>("/predict", {
    method: "POST",
    body: { url },
  });
  const record = asObject(payload) ?? {};

  return {
    prediction: toPrediction(record.prediction),
    result: record.result === "phishing" ? "phishing" : "legit",
    confidence: typeof record.confidence === "number" ? record.confidence : null,
    modelName: toString(record.model_name) || null,
    modelVersion: toString(record.model_version) || null,
  } satisfies PredictionResponse;
}

export async function fetchHistory(filters: HistoryFilters): Promise<HistoryResponse> {
  const payload = await request<unknown>("/history", {
    query: {
      limit: filters.limit,
      offset: filters.offset,
      search: filters.search || undefined,
      result: filters.result || undefined,
      sort: filters.sort,
    },
  });
  const record = asObject(payload) ?? {};
  const items = Array.isArray(record.items) ? record.items : [];
  const pagination = asObject(record.pagination) ?? {};

  return {
    items: items.map((value) => {
      const entry = asObject(value) ?? {};
      return {
        id: toString(entry.id) || undefined,
        userId: toString(entry.user_id) || undefined,
        userEmail: toString(entry.user_email) || undefined,
        url: toString(entry.url),
        result: entry.result === "phishing" ? "phishing" : "legit",
        confidence: typeof entry.confidence === "number" ? entry.confidence : null,
        created_at: toString(entry.created_at) || undefined,
      } satisfies HistoryItem;
    }),
    total: typeof record.total === "number" ? record.total : 0,
    pagination: {
      limit: typeof pagination.limit === "number" ? pagination.limit : filters.limit,
      offset: typeof pagination.offset === "number" ? pagination.offset : filters.offset,
    },
  };
}

export async function fetchAdminLogs(limit = 100) {
  const payload = await request<unknown>("/admin/logs", {
    query: { limit },
  });
  const record = asObject(payload) ?? {};
  const logs = Array.isArray(record.logs) ? record.logs : [];

  return logs.map((value) => {
    const entry = asObject(value) ?? {};
    return {
      id: toString(entry.id) || undefined,
      user_id: toString(entry.user_id) || undefined,
      user_email: toString(entry.user_email) || undefined,
      input: toString(entry.input),
      prediction: toPrediction(entry.prediction),
      created_at: toString(entry.created_at) || undefined,
    } satisfies AdminLog;
  });
}

export async function fetchAdminUsers(limit = 100) {
  const payload = await request<unknown>("/admin/users", {
    query: { limit },
  });
  const record = asObject(payload) ?? {};
  const users = Array.isArray(record.users) ? record.users : [];

  return users.map((value) => {
    const entry = asObject(value) ?? {};
    return {
      id: toString(entry.id) || undefined,
      email: toString(entry.email) || undefined,
      role: entry.role === "admin" ? "admin" : "user",
      created_at: toString(entry.created_at) || undefined,
    } satisfies AdminUser;
  });
}
