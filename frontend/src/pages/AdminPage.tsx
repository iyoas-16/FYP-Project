<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarClock,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchAdminAnalyticsWithOptions,
  getCachedAdminAnalytics,
  type AdminAnalytics,
  type Verdict,
} from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const verdictMeta: Record<
  Verdict,
  { label: string; tone: string; color: string; icon: typeof ShieldX }
> = {
  phishing: {
    label: "Phishing",
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
    color: "#ef4444",
    icon: ShieldX,
  },
  legit: {
    label: "Legitimate",
    tone: "border-success/30 bg-success/10 text-success",
    color: "#22c55e",
    icon: ShieldCheck,
  },
};

export function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [section, setSection] = useState<"overview" | "history">(() => {
    if (typeof window === "undefined") return "overview";
    return new URLSearchParams(window.location.search).get("tab") === "history"
      ? "history"
      : "overview";
  });
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<AdminAnalytics | null>(() =>
    getCachedAdminAnalytics("30d", { includeAuthHistory: false }),
  );
  const [loading, setLoading] = useState(
    () => !getCachedAdminAnalytics("30d", { includeAuthHistory: false }),
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const includeAuthHistory = section === "history";
  const lastHandledReloadKey = useRef(0);

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return;

    let active = true;
    const cached = getCachedAdminAnalytics(range, { includeAuthHistory });

    async function loadAnalytics() {
      if (cached) {
        setData(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchAdminAnalyticsWithOptions(range, {
          includeAuthHistory,
          forceRefresh: reloadKey > lastHandledReloadKey.current,
        });
        if (!active) return;
        lastHandledReloadKey.current = reloadKey;
        setData(response);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load admin analytics.");
        if (!cached) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [authLoading, includeAuthHistory, isAdmin, range, reloadKey, user]);

  const flaggedCount = useMemo(() => data?.overview.phishing_count ?? 0, [data]);
  const threatRate = useMemo(() => {
    const total = data?.overview.total_scans ?? 0;
    return total > 0 ? Math.round((flaggedCount / total) * 100) : 0;
  }, [data, flaggedCount]);
  const pieData = useMemo(
    () =>
      [
        {
          verdict: "phishing" as const,
          count: data?.overview.phishing_count ?? 0,
          fill: verdictMeta.phishing.color,
        },
        {
          verdict: "legit" as const,
          count: data?.overview.legit_count ?? 0,
          fill: verdictMeta.legit.color,
        },
      ].filter((item) => item.count > 0),
    [data],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncSectionFromLocation = () => {
      setSection(
        new URLSearchParams(window.location.search).get("tab") === "history"
          ? "history"
          : "overview",
      );
    };

    window.addEventListener("popstate", syncSectionFromLocation);
    return () => window.removeEventListener("popstate", syncSectionFromLocation);
  }, []);

  function handleSectionChange(value: string) {
    const nextSection = value === "history" ? "history" : "overview";
    setSection(nextSection);
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (nextSection === "history") {
      url.searchParams.set("tab", "history");
    } else {
      url.searchParams.delete("tab");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }
=======
import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock3, Shield, Sparkles, TrendingUp, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAdminStats, type AdminRange, type AdminStatsResponse } from "@/services/api";

const RANGE_OPTIONS: Array<{ value: AdminRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function formatTimestamp(value?: string) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDay(value?: string) {
  if (!value) return "-";

  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatConfidence(value?: number | null) {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "-";
}

function getVerdictClasses(result: "phishing" | "legit") {
  return result === "phishing"
    ? "border-destructive/20 bg-destructive/10 text-destructive"
    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
}

export function AdminPage() {
  const [range, setRange] = useState<AdminRange>("30d");
  const [adminData, setAdminData] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = useCallback(async (nextRange: AdminRange) => {
    setLoading(true);
    setError(null);

    try {
      setAdminData(await fetchAdminStats(nextRange));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData(range);
  }, [loadAdminData, range]);

  const summary = adminData?.summary;
  const overview = adminData?.overview;
  const users = adminData?.users ?? [];
  const activity = adminData?.activity ?? [];
  const topRiskyUrls = adminData?.topRiskyUrls ?? [];
  const recentScans = adminData?.recentScans ?? [];
  const maxDailyTotal = activity.reduce((largest, item) => Math.max(largest, item.total), 0);

  const heroStats = [
    {
      label: "Users",
      value: summary?.totalUsers ?? 0,
      hint: `${summary?.adminUsers ?? 0} admins`,
      icon: Users,
    },
    {
      label: "Scans",
      value: overview?.totalScans ?? 0,
      hint: `${overview?.uniqueUsers ?? 0} active users`,
      icon: Activity,
    },
    {
      label: "Threats found",
      value: overview?.phishingCount ?? 0,
      hint: `${overview?.legitCount ?? 0} legit scans`,
      icon: AlertTriangle,
    },
    {
      label: "Avg confidence",
      value: formatConfidence(overview?.avgConfidence),
      hint: `Updated for ${RANGE_OPTIONS.find((option) => option.value === range)?.label ?? range}`,
      icon: TrendingUp,
    },
  ];
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <ProtectedRoute requireAdmin>
<<<<<<< HEAD
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin analytics</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor scan volume, threat distribution, high-risk URLs, and authentication
                history.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={section} onValueChange={handleSectionChange}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={range} onValueChange={(value) => setRange(value as typeof range)}>
                <TabsList>
                  <TabsTrigger value="7d">7 days</TabsTrigger>
                  <TabsTrigger value="30d">30 days</TabsTrigger>
                  <TabsTrigger value="90d">90 days</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                onClick={() => setReloadKey((value) => value + 1)}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {error ? (
            <Alert variant="destructive" className="mb-6 border-destructive/40 bg-destructive/5">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Admin data unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {section === "overview" ? (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Total scans",
                    value: data?.overview.total_scans ?? 0,
                    icon: Activity,
                    hint: `${range} monitoring window`,
                  },
                  {
                    label: "Phishing detections",
                    value: flaggedCount,
                    icon: ShieldAlert,
                    hint: `${threatRate}% threat rate`,
                  },
                  {
                    label: "Unique users",
                    value: data?.overview.unique_users ?? 0,
                    icon: Users,
                    hint: "Authenticated accounts",
                  },
                  {
                    label: "Avg. confidence",
                    value: `${Math.round((data?.overview.avg_confidence ?? 0) * 100)}%`,
                    icon: ShieldCheck,
                    hint: "Model confidence",
                  },
                ].map((item) => (
                  <Card key={item.label} className="border-border/60 bg-card/60 p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                      </div>
                      <div className="rounded-full bg-primary/10 p-3 text-primary">
                        <item.icon className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{item.hint}</p>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
                <Card className="border-border/60 bg-card/60 p-5 shadow-card">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">Threat activity</h2>
                    <p className="text-sm text-muted-foreground">
                      Daily scan volume split by result.
                    </p>
                  </div>
                  {loading || (authLoading && !data) ? (
                    <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading analytics...
                    </div>
                  ) : (
                    <ChartContainer
                      className="h-[320px] w-full"
                      config={{
                        phishing: { label: "Phishing", color: verdictMeta.phishing.color },
                        legit: { label: "Legitimate", color: verdictMeta.legit.color },
                      }}
                    >
                      <AreaChart data={data?.activity ?? []} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={24}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="phishing"
                          stackId="1"
                          stroke="var(--color-phishing)"
                          fill="var(--color-phishing)"
                          fillOpacity={0.25}
                        />
                        <Area
                          type="monotone"
                          dataKey="legit"
                          stackId="1"
                          stroke="var(--color-legit)"
                          fill="var(--color-legit)"
                          fillOpacity={0.25}
                        />
                      </AreaChart>
                    </ChartContainer>
                  )}
                </Card>

                <Card className="border-border/60 bg-card/60 p-5 shadow-card">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">Result mix</h2>
                    <p className="text-sm text-muted-foreground">
                      Share of phishing and legitimate scans.
                    </p>
                  </div>
                  {loading || (authLoading && !data) ? (
                    <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading breakdown...
                    </div>
                  ) : (
                    <>
                      <ChartContainer
                        className="mx-auto h-[260px] max-w-[280px]"
                        config={{
                          phishing: { label: "Phishing", color: verdictMeta.phishing.color },
                          legit: { label: "Legitimate", color: verdictMeta.legit.color },
                        }}
                      >
                        <PieChart>
                          <ChartTooltip
                            content={<ChartTooltipContent hideLabel nameKey="verdict" />}
                          />
                          <Pie
                            data={pieData}
                            dataKey="count"
                            nameKey="verdict"
                            innerRadius={56}
                            outerRadius={92}
                            paddingAngle={3}
                          />
                        </PieChart>
                      </ChartContainer>
                      <div className="mt-4 grid gap-2">
                        {pieData.map((item) => {
                          const meta = verdictMeta[item.verdict];
                          const Icon = meta.icon;

                          return (
                            <div
                              key={item.verdict}
                              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" style={{ color: meta.color }} />
                                <span className="text-sm">{meta.label}</span>
                              </div>
                              <span className="text-sm font-medium tabular-nums">{item.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </Card>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Card className="border-border/60 bg-card/60 p-5 shadow-card">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Top risky URLs</h2>
                      <p className="text-sm text-muted-foreground">
                        Most frequently flagged links from the backend.
                      </p>
                    </div>
                    <Badge variant="outline">{data?.top_risky_urls.length ?? 0} URLs</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Flags</TableHead>
                        <TableHead>Last seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.top_risky_urls ?? []).slice(0, 8).map((row) => {
                        const meta = verdictMeta[row.result];
                        const Icon = meta.icon;

                        return (
                          <TableRow key={`${row.url}-${row.last_seen}`}>
                            <TableCell className="max-w-xs font-mono text-xs">
                              <span className="block truncate">{row.url}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={meta.tone}>
                                <Icon className="mr-1 h-3 w-3" />
                                {meta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="tabular-nums">{row.count}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.last_seen ? new Date(row.last_seen).toLocaleString() : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!loading && (data?.top_risky_urls.length ?? 0) === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No flagged URLs reported for this range.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Card>

                <Card className="border-border/60 bg-card/60 p-5 shadow-card">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Recent scans</h2>
                      <p className="text-sm text-muted-foreground">
                        Latest activity across authenticated users.
                      </p>
                    </div>
                    <Badge variant="outline">{data?.recent_scans.length ?? 0} rows</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.recent_scans ?? []).slice(0, 8).map((row) => {
                        const meta = verdictMeta[row.result];
                        const Icon = meta.icon;

                        return (
                          <TableRow key={row.id ?? `${row.url}-${row.created_at}`}>
                            <TableCell className="max-w-xs font-mono text-xs">
                              <span className="block truncate">{row.url}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={meta.tone}>
                                <Icon className="mr-1 h-3 w-3" />
                                {meta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[140px] truncate text-muted-foreground">
                              {row.user_email ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!loading && (data?.recent_scans.length ?? 0) === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No recent activity available.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </>
          ) : (
            <Card className="border-border/60 bg-card/60 p-5 shadow-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Authentication history</h2>
                  <p className="text-sm text-muted-foreground">
                    Signup and last sign-in activity from Supabase Auth.
                  </p>
                </div>
                <Badge variant="outline">{data?.auth_history.length ?? 0} users</Badge>
              </div>

              {loading || (authLoading && !data) ? (
                <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading history...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Signup Timestamp</TableHead>
                      <TableHead>Last Sign-in Timestamp</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.auth_history ?? []).map((entry) => (
                      <TableRow key={entry.id ?? entry.email}>
                        <TableCell className="font-medium">{entry.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            {entry.signup_timestamp
                              ? new Date(entry.signup_timestamp).toLocaleString()
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.last_sign_in_timestamp
                            ? new Date(entry.last_sign_in_timestamp).toLocaleString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.is_admin ? "Admin" : "User"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && (data?.auth_history.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No authentication history is available.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}
=======
          <div className="space-y-6">
            <Card className="overflow-hidden border-border/60 bg-gradient-hero shadow-card">
              <CardContent className="p-0">
                <div className="grid gap-8 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
                  <div className="space-y-5">
                    <Badge variant="secondary" className="w-fit bg-card/70 backdrop-blur">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Platform control center
                    </Badge>
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Admin overview
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                        A cleaner snapshot of user access, phishing trends, and recent platform
                        activity.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {RANGE_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          variant={range === option.value ? "default" : "outline"}
                          size="sm"
                          className={range === option.value ? "shadow-glow" : "bg-background/70"}
                          onClick={() => setRange(option.value)}
                          disabled={loading}
                        >
                          {option.label}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="bg-background/50"
                        onClick={() => void loadAdminData(range)}
                        disabled={loading}
                      >
                        {loading ? "Refreshing..." : "Refresh"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {heroStats.map(({ label, value, hint, icon: Icon }) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">{label}</p>
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                        </div>
                        <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {error ? (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="p-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            ) : null}

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <Card className="border-border/60 shadow-card">
                    <CardHeader>
                      <CardTitle>Daily activity</CardTitle>
                      <CardDescription>
                        Simple per-day scan volume with phishing vs legit mix.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {activity.length > 0 ? (
                          activity.map((item) => {
                            const phishingWidth =
                              item.total > 0 ? `${(item.phishing / item.total) * 100}%` : "0%";
                            const legitWidth =
                              item.total > 0 ? `${(item.legit / item.total) * 100}%` : "0%";
                            const totalWidth =
                              maxDailyTotal > 0 ? `${(item.total / maxDailyTotal) * 100}%` : "0%";

                            return (
                              <div key={item.date} className="space-y-2 rounded-xl bg-muted/40 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium">{formatDay(item.date)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.total} total scans
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{item.phishing} phishing</span>
                                    <span>{item.legit} legit</span>
                                  </div>
                                </div>
                                <div className="h-2 rounded-full bg-background">
                                  <div
                                    className="flex h-2 overflow-hidden rounded-full"
                                    style={{ width: totalWidth }}
                                  >
                                    <div
                                      className="h-full bg-destructive/80"
                                      style={{ width: phishingWidth }}
                                    />
                                    <div
                                      className="h-full bg-emerald-500/80"
                                      style={{ width: legitWidth }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {loading ? "Loading activity..." : "No daily activity in this range."}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="border-border/60 shadow-card">
                      <CardHeader>
                        <CardTitle>Top risky URLs</CardTitle>
                        <CardDescription>The URLs most often flagged as phishing.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {topRiskyUrls.length > 0 ? (
                          topRiskyUrls.slice(0, 5).map((item, index) => (
                            <div
                              key={`${item.url}-${item.lastSeen ?? "never"}`}
                              className="space-y-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                  {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="break-all text-sm font-medium">{item.url}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.count} alerts • last seen {formatTimestamp(item.lastSeen)}
                                  </p>
                                </div>
                              </div>
                              {index < Math.min(topRiskyUrls.length, 5) - 1 ? <Separator /> : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {loading
                              ? "Loading risky URLs..."
                              : "No phishing URLs found in this range."}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-card">
                      <CardHeader>
                        <CardTitle>Access snapshot</CardTitle>
                        <CardDescription>
                          Quick view of current admin access and sign-in activity.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl bg-muted/40 p-4">
                          <p className="text-sm text-muted-foreground">Admin accounts</p>
                          <p className="mt-2 text-2xl font-semibold">{summary?.adminUsers ?? 0}</p>
                        </div>
                        <div className="rounded-2xl bg-muted/40 p-4">
                          <p className="text-sm text-muted-foreground">Standard accounts</p>
                          <p className="mt-2 text-2xl font-semibold">
                            {summary?.standardUsers ?? 0}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-muted/40 p-4 sm:col-span-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock3 className="h-4 w-4" />
                            Latest sign-in
                          </div>
                          <p className="mt-2 font-medium">
                            {formatTimestamp(summary?.mostRecentSignIn)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history">
                <Card className="border-border/60 shadow-card">
                  <CardHeader>
                    <CardTitle>Recent scan history</CardTitle>
                    <CardDescription>
                      The latest activity across the platform for the selected range.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[420px] pr-4">
                      <div className="space-y-3">
                        {recentScans.length > 0 ? (
                          recentScans.map((scan) => (
                            <div
                              key={
                                scan.id ?? `${scan.url}-${scan.created_at ?? scan.userId ?? "scan"}`
                              }
                              className="rounded-2xl border border-border/60 bg-card/50 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="break-all font-medium">{scan.url}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {scan.userEmail ?? scan.userId ?? "Unknown user"}
                                  </p>
                                </div>
                                <Badge className={getVerdictClasses(scan.result)}>
                                  {scan.result === "phishing" ? "Phishing" : "Legit"}
                                </Badge>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span>Confidence: {formatConfidence(scan.confidence)}</span>
                                <span>Scanned: {formatTimestamp(scan.created_at)}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {loading
                              ? "Loading recent history..."
                              : "No recent scan history in this range."}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card className="border-border/60 shadow-card">
                  <CardHeader>
                    <CardTitle>User access</CardTitle>
                    <CardDescription>
                      Simple profiles with role, provider, and sign-in status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="rounded-full">
                        {users.length} accounts
                      </Badge>
                      <span>Admins and standard users in one simple view.</span>
                    </div>

                    <ScrollArea className="h-[520px] pr-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        {users.length > 0 ? (
                          users.map((user) => (
                            <div
                              key={user.id ?? user.email ?? "user-card"}
                              className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition-colors hover:bg-card/80"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                                  {(user.email ?? user.id ?? "U").slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1 space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="break-all font-semibold">
                                        {user.email ?? user.id ?? "Unknown user"}
                                      </p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {user.lastSignInTimestamp
                                          ? "Recently active"
                                          : "No recent sign-in"}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={user.role === "admin" ? "default" : "secondary"}
                                      className="rounded-full capitalize"
                                    >
                                      {user.role}
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {(user.providers.length > 0 ? user.providers : ["email"]).map(
                                      (provider) => (
                                        <Badge
                                          key={`${user.id ?? user.email}-${provider}`}
                                          variant="outline"
                                          className="rounded-full capitalize"
                                        >
                                          {provider}
                                        </Badge>
                                      ),
                                    )}
                                    <Badge
                                      variant="outline"
                                      className={
                                        user.emailConfirmedTimestamp
                                          ? "rounded-full border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                                          : "rounded-full border-border/60 text-muted-foreground"
                                      }
                                    >
                                      {user.emailConfirmedTimestamp ? "Verified" : "Pending"}
                                    </Badge>
                                  </div>

                                  <div className="grid gap-3 rounded-xl bg-muted/30 p-3 text-sm sm:grid-cols-2">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Signed up</p>
                                      <p className="mt-1 font-medium">
                                        {formatTimestamp(user.signupTimestamp)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Last sign-in</p>
                                      <p className="mt-1 font-medium">
                                        {formatTimestamp(user.lastSignInTimestamp)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {loading ? "Loading users..." : "No user activity available."}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="border-border/60 bg-card/60 shadow-card">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <p className="font-medium">Admin workspace</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Designed to keep the most important analytics visible without overwhelming the
                    page.
                  </p>
                </div>
                <Badge variant="outline">{users.length} tracked accounts</Badge>
              </CardContent>
            </Card>
          </div>
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
        </ProtectedRoute>
      </main>
    </div>
  );
}
