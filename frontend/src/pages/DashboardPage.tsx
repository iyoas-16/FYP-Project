import { useState, type FormEvent } from "react";
import { Search, Loader2, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { ApiError, scanUrl, type ScanResult } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { ResultDisplay } from "@/components/ResultDisplay";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DashboardPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const nextUrl = url.trim();
      const response = await scanUrl(nextUrl);
      setSubmittedUrl(nextUrl);
      setResult(response);
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "We couldn't complete that scan.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setError(null);
    setResult(null);
    setSubmittedUrl("");
    setUrl("");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <ProtectedRoute>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Scan a suspicious URL</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Submit links to the Flask detection API with your authenticated Supabase session.
                Results are stored in your account history automatically.
              </p>
            </div>
            <Card className="border-border/60 bg-card/50 px-4 py-3 shadow-card">
              <div className="flex items-center gap-3 text-sm">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">API-only detection flow</p>
                  <p className="text-muted-foreground">
                    Prediction and persistence now run exclusively on the backend.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-border/60 bg-card/60 p-6 shadow-card">
            <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="https://example.com/login"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={busy}
                  className="h-11 pl-10"
                />
              </div>
              <Button
                type="submit"
                disabled={busy || !url.trim()}
                size="lg"
                className="shadow-glow"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Run scan"
                )}
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1">Server-side validation</span>
              <span className="rounded-full bg-muted px-3 py-1">ML prediction response</span>
              <span className="rounded-full bg-muted px-3 py-1">Stored in your account history</span>
            </div>
          </Card>

          {error ? (
            <Alert variant="destructive" className="mt-6 border-destructive/40 bg-destructive/5">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Scan failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? (
            <div className="mt-6 space-y-4">
              {result.warning ? (
                <Alert className="border-warning/40 bg-warning/10 text-warning">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Scan saved partially</AlertTitle>
                  <AlertDescription>{result.warning}</AlertDescription>
                </Alert>
              ) : null}
              <ResultDisplay url={submittedUrl} result={result} />
              <div className="flex justify-center">
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Check another URL
                </Button>
              </div>
            </div>
          ) : null}
        </ProtectedRoute>
      </main>
    </div>
  );
}
