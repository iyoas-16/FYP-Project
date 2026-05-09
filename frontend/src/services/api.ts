import { supabase } from "@/integrations/supabase/client";

<<<<<<< HEAD
export type Verdict = "phishing" | "legit";

export type ScanResult = {
  result: Verdict;
  confidence: number;
  warning?: string;
};

export type HistoryItem = {
  id?: string;
  user_id?: string;
  user_email?: string;
  url: string;
  result: Verdict;
  confidence: number;
=======
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
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
  created_at?: string;
};

export type HistoryResponse = {
  items: HistoryItem[];
  total: number;
<<<<<<< HEAD
  pagination?: {
=======
  pagination: {
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
    limit: number;
    offset: number;
  };
};

<<<<<<< HEAD
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
  auth_history: Array<{
    id?: string;
    email: string;
    signup_timestamp?: string;
    last_sign_in_timestamp?: string;
    is_admin: boolean;
  }>;
};

type FetchAdminAnalyticsOptions = {
  includeAuthHistory?: boolean;
  forceRefresh?: boolean;
};

type CachedAdminAnalytics = {
  data: AdminAnalytics;
  cachedAt: number;
};

const ADMIN_ANALYTICS_CACHE_TTL_MS = 60_000;
const adminAnalyticsCache = new Map<string, CachedAdminAnalytics>();
=======
export type HistoryFilters = {
  limit: number;
  offset: number;
  search: string;
  result: "" | "phishing" | "legit";
  sort: HistorySort;
};

export type AdminRange = "7d" | "30d" | "90d";

export type AdminUser = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  role: "admin" | "standard";
  signupTimestamp?: string;
  lastSignInTimestamp?: string;
  emailConfirmedTimestamp?: string;
  providers: string[];
};

export type AdminDirectoryResponse = {
  users: AdminUser[];
  summary: {
    totalUsers: number;
    adminUsers: number;
    standardUsers: number;
    mostRecentSignIn?: string;
  };
};

export type AdminOverview = {
  totalScans: number;
  phishingCount: number;
  legitCount: number;
  uniqueUsers: number;
  avgConfidence: number;
};

export type AdminActivityItem = {
  date: string;
  total: number;
  phishing: number;
  legit: number;
};

export type AdminRiskyUrl = {
  url: string;
  count: number;
  result: "phishing";
  lastSeen?: string;
};

export type AdminStatsResponse = AdminDirectoryResponse & {
  range: AdminRange;
  overview: AdminOverview;
  activity: AdminActivityItem[];
  topRiskyUrls: AdminRiskyUrl[];
  recentScans: HistoryItem[];
};
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786

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

<<<<<<< HEAD
  throw new ApiError(
    "Missing backend URL. Set VITE_API_BASE_URL (or VITE_FLASK_API_BASE_URL) to your Flask API base URL.",
    500,
  );
=======
  throw new ApiError("Missing backend URL. Set VITE_API_BASE_URL to your Flask API base URL.", 500);
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

<<<<<<< HEAD
function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

=======
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

<<<<<<< HEAD
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
=======
function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function toPrediction(value: unknown): Prediction {
  return value === "phishing" ? "phishing" : "safe";
}

function normalizeHistoryItem(value: unknown): HistoryItem {
  const entry = asObject(value) ?? {};
  return {
    id: toString(entry.id) || undefined,
    userId: toString(entry.user_id) || undefined,
    userEmail: toString(entry.user_email || entry.email) || undefined,
    url: toString(entry.url),
    result: entry.result === "phishing" ? "phishing" : "legit",
    confidence:
      typeof entry.confidence === "number"
        ? entry.confidence
        : typeof entry.confidence_score === "number"
          ? entry.confidence_score
          : null,
    created_at: toString(entry.created_at) || undefined,
  } satisfies HistoryItem;
}

function normalizeAdminUser(value: unknown): AdminUser {
  const entry = asObject(value) ?? {};
  return {
    id: toString(entry.id) || undefined,
    email: toString(entry.email) || undefined,
    phone: toString(entry.phone) || undefined,
    role: entry.is_admin === true ? "admin" : "standard",
    signupTimestamp: toString(entry.signup_timestamp) || undefined,
    lastSignInTimestamp: toString(entry.last_sign_in_timestamp) || undefined,
    emailConfirmedTimestamp: toString(entry.email_confirmed_timestamp) || undefined,
    providers: toStringArray(entry.providers),
  } satisfies AdminUser;
}

function summarizeAdminUsers(users: AdminUser[]) {
  const adminUsers = users.filter((user) => user.role === "admin").length;
  const mostRecentSignIn = users
    .map((user) => user.lastSignInTimestamp)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0];

  return {
    totalUsers: users.length,
    adminUsers,
    standardUsers: users.length - adminUsers,
    mostRecentSignIn,
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
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
<<<<<<< HEAD
    if (text) message = text;
=======
    if (text) {
      message = text;
    }
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
  }

  return new ApiError(message, response.status);
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = await getAccessToken();
<<<<<<< HEAD
  return requestWithHeaders<T>(path, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

async function requestPublic<T>(path: string, options: RequestOptions = {}) {
  return requestWithHeaders<T>(path, {
    ...options,
    headers: {
      Accept: "application/json",
    },
  });
}

async function requestWithHeaders<T>(
  path: string,
  options: RequestOptions & { headers?: Record<string, string> } = {},
) {
  const url = new URL(`${getApiBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
=======
  const url = new URL(`${getApiBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
<<<<<<< HEAD
      ...options.headers,
=======
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

<<<<<<< HEAD
  if (!response.ok) throw await parseApiError(response);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function signUpUser(email: string, password: string) {
  const payload = await requestPublic<unknown>("/auth/signup", {
    method: "POST",
    body: { email, password },
  });
  const record = asObject(payload) ?? {};
  const user = asObject(record.user) ?? {};

  return {
    user: {
      id: toString(user.id) || undefined,
      email: toString(user.email) || email,
    },
  };
}

export async function scanUrl(url: string) {
  const payload = await request<unknown>("/scan", {
=======
  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

export async function predictUrl(url: string) {
  const payload = await request<unknown>("/predict", {
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
    method: "POST",
    body: { url },
  });
  const record = asObject(payload) ?? {};
<<<<<<< HEAD
  return {
    result: toVerdict(record.result),
    confidence: toNumber(record.confidence),
    warning: toString(record.warning) || undefined,
  } satisfies ScanResult;
}

export async function fetchHistory(
  params: {
    search?: string;
    result?: Verdict;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const payload = await request<unknown>("/history", {
    query: {
      search: params.search,
      result: params.result,
      sort: params.sort,
      limit: params.limit ?? 25,
      offset: params.offset ?? 0,
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
  return fetchAdminAnalyticsWithOptions(range);
}

function createAdminAnalyticsCacheKey(range: "7d" | "30d" | "90d", includeAuthHistory: boolean) {
  return `${range}:${includeAuthHistory ? "history" : "overview"}`;
}

export function getCachedAdminAnalytics(
  range: "7d" | "30d" | "90d",
  options: Pick<FetchAdminAnalyticsOptions, "includeAuthHistory"> = {},
) {
  const includeAuthHistory = options.includeAuthHistory ?? false;
  const cached = adminAnalyticsCache.get(createAdminAnalyticsCacheKey(range, includeAuthHistory));

  if (!cached) return null;
  if (Date.now() - cached.cachedAt > ADMIN_ANALYTICS_CACHE_TTL_MS) {
    adminAnalyticsCache.delete(createAdminAnalyticsCacheKey(range, includeAuthHistory));
    return null;
  }

  return cached.data;
}

export async function fetchAdminAnalyticsWithOptions(
  range: "7d" | "30d" | "90d",
  options: FetchAdminAnalyticsOptions = {},
) {
  const includeAuthHistory = options.includeAuthHistory ?? false;
  const cacheKey = createAdminAnalyticsCacheKey(range, includeAuthHistory);

  if (!options.forceRefresh) {
    const cached = getCachedAdminAnalytics(range, { includeAuthHistory });
    if (cached) return cached;
  }

  const payload = await request<unknown>("/admin/stats", {
    query: { range, include_auth_history: includeAuthHistory ? "true" : "false" },
  });
  const record = asObject(payload) ?? {};
  const overview = asObject(record.overview) ?? {};

  const normalized = {
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
    auth_history: Array.isArray(record.auth_history)
      ? record.auth_history.map((item) => {
          const entry = asObject(item) ?? {};
          return {
            id: toString(entry.id) || undefined,
            email: toString(entry.email),
            signup_timestamp: toString(entry.signup_timestamp) || undefined,
            last_sign_in_timestamp: toString(entry.last_sign_in_timestamp) || undefined,
            is_admin: Boolean(entry.is_admin),
          };
        })
      : [],
  } satisfies AdminAnalytics;

  adminAnalyticsCache.set(cacheKey, { data: normalized, cachedAt: Date.now() });
  return normalized;
=======

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
    items: items.map(normalizeHistoryItem),
    total: typeof record.total === "number" ? record.total : 0,
    pagination: {
      limit: typeof pagination.limit === "number" ? pagination.limit : filters.limit,
      offset: typeof pagination.offset === "number" ? pagination.offset : filters.offset,
    },
  };
}

export async function fetchAdminStats(range: AdminRange = "30d"): Promise<AdminStatsResponse> {
  const payload = await request<unknown>("/admin/stats", {
    query: {
      range,
      include_auth_history: "true",
    },
  });
  const record = asObject(payload) ?? {};
  const overview = asObject(record.overview) ?? {};
  const users = Array.isArray(record.auth_history)
    ? record.auth_history.map(normalizeAdminUser)
    : [];
  const activity = Array.isArray(record.activity) ? record.activity : [];
  const topRiskyUrls = Array.isArray(record.top_risky_urls) ? record.top_risky_urls : [];
  const recentScans = Array.isArray(record.recent_scans) ? record.recent_scans : [];

  return {
    range,
    users,
    summary: summarizeAdminUsers(users),
    overview: {
      totalScans: typeof overview.total_scans === "number" ? overview.total_scans : 0,
      phishingCount: typeof overview.phishing_count === "number" ? overview.phishing_count : 0,
      legitCount: typeof overview.legit_count === "number" ? overview.legit_count : 0,
      uniqueUsers: typeof overview.unique_users === "number" ? overview.unique_users : 0,
      avgConfidence: typeof overview.avg_confidence === "number" ? overview.avg_confidence : 0,
    },
    activity: activity.map((value) => {
      const entry = asObject(value) ?? {};
      return {
        date: toString(entry.date),
        total: typeof entry.total === "number" ? entry.total : 0,
        phishing: typeof entry.phishing === "number" ? entry.phishing : 0,
        legit: typeof entry.legit === "number" ? entry.legit : 0,
      } satisfies AdminActivityItem;
    }),
    topRiskyUrls: topRiskyUrls.map((value) => {
      const entry = asObject(value) ?? {};
      return {
        url: toString(entry.url),
        count: typeof entry.count === "number" ? entry.count : 0,
        result: "phishing",
        lastSeen: toString(entry.last_seen) || undefined,
      } satisfies AdminRiskyUrl;
    }),
    recentScans: recentScans.map(normalizeHistoryItem),
  };
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
}
