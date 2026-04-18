import { useEffect, useMemo, useState } from "react";
import { Download, Search, Loader2, RefreshCw, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, fetchHistory, type HistoryItem, type Verdict } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const verdictMeta = {
  phishing: {
    label: "Phishing",
    icon: ShieldX,
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  legit: {
    label: "Legitimate",
    icon: ShieldCheck,
    cls: "border-success/40 bg-success/10 text-success",
  },
} as const;

const PAGE_SIZE = 25;
const EXPORT_PAGE_SIZE = 100;

export function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Verdict>("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"newest" | "oldest" | "confidence_desc" | "confidence_asc">(
    "newest",
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter, sort]);

  useEffect(() => {
    if (authLoading || !user) return;

    let active = true;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const offset = (page - 1) * PAGE_SIZE;
        const response = await fetchHistory({
          search: debouncedSearch || undefined,
          result: filter === "all" ? undefined : filter,
          sort,
          limit: PAGE_SIZE,
          offset,
        });

        if (!active) return;
        const pageCount = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
        if (response.total > 0 && page > pageCount) {
          setPage(pageCount);
          return;
        }
        setRows(response.items);
        setTotal(response.total);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError || err instanceof Error ? err.message : "Failed to load history.",
        );
        setRows([]);
        setTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [authLoading, debouncedSearch, filter, page, reloadKey, sort, user]);

  const overview = useMemo(() => {
    const phishing = rows.filter((row) => row.result === "phishing").length;
    const legit = rows.filter((row) => row.result === "legit").length;
    const avgConfidence =
      rows.length > 0 ? Math.round((rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length) * 100) : 0;

    return {
      phishing,
      legit,
      total,
      avgConfidence,
    };
  }, [rows, total]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRow = total === 0 ? 0 : startRow + rows.length - 1;

  async function exportCsv() {
    setExporting(true);
    setError(null);

    try {
      const allRows: HistoryItem[] = [];
      let offset = 0;
      let expectedTotal = total;

      do {
        const response = await fetchHistory({
          search: debouncedSearch || undefined,
          result: filter === "all" ? undefined : filter,
          sort,
          limit: EXPORT_PAGE_SIZE,
          offset,
        });
        allRows.push(...response.items);
        expectedTotal = response.total;
        offset += response.items.length;
        if (response.items.length === 0) break;
      } while (offset < expectedTotal);

      const header = ["URL", "Result", "Confidence", "Date"];
      const lines = [header.join(",")];
      for (const row of allRows) {
        const cells = [
          `"${row.url.replace(/"/g, '""')}"`,
          row.result,
          `${Math.round(row.confidence * 100)}%`,
          row.created_at ? new Date(row.created_at).toISOString() : "",
        ];
        lines.push(cells.join(","));
      }

      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `phishguard-history-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error ? err.message : "Failed to export history.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <ProtectedRoute>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Scan history</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Review every backend scan, sort by risk, and export evidence for follow-up.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setReloadKey((value) => value + 1)}
                disabled={loading || exporting}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => void exportCsv()} disabled={!total || loading || exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total scans", value: overview.total },
              { label: "Phishing alerts", value: overview.phishing },
              { label: "Legitimate results", value: overview.legit },
              { label: "Avg. confidence", value: `${overview.avgConfidence}%` },
            ].map((item) => (
              <Card key={item.label} className="border-border/60 bg-card/60 p-4 shadow-card">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              </Card>
            ))}
          </div>

          <Card className="border-border/60 bg-card/60 p-4 shadow-card">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search URL..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
                <SelectTrigger className="lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  <SelectItem value="phishing">Phishing</SelectItem>
                  <SelectItem value="legit">Legitimate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
                <SelectTrigger className="lg:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="confidence_desc">Highest confidence</SelectItem>
                  <SelectItem value="confidence_asc">Lowest confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/5">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>History unavailable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {loading || authLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading history...
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {total === 0
                  ? "No scans yet — run your first URL check from the dashboard."
                  : "No results match your filters."}
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[55%]">URL</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const meta = verdictMeta[row.result];
                      const Icon = meta.icon;

                      return (
                        <TableRow key={row.id ?? `${row.url}-${row.created_at}`}>
                          <TableCell className="max-w-xs font-mono text-xs">
                            <span className="block truncate">{row.url}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={meta.cls}>
                              <Icon className="mr-1 h-3 w-3" />
                              {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">{Math.round(row.confidence * 100)}%</TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex flex-col gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Showing {startRow}-{endRow} of {total} scans
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={page <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      disabled={page >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </ProtectedRoute>
      </main>
    </div>
  );
}
