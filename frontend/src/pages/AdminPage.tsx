import { useEffect, useMemo, useState } from "react";
import {
  Activity,
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
import { fetchAdminAnalytics, type AdminAnalytics, type Verdict } from "@/services/api";
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
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return;

    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchAdminAnalytics(range);
        if (!active) return;
        setData(response);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load admin analytics.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [authLoading, isAdmin, range, reloadKey, user]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <ProtectedRoute requireAdmin>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin analytics</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor scan volume, threat distribution, and high-risk URLs from the Flask backend.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                <p className="text-sm text-muted-foreground">Daily scan volume split by result.</p>
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
                      <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="verdict" />} />
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
        </ProtectedRoute>
      </main>
    </div>
  );
}
