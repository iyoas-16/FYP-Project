import { ShieldCheck, ShieldX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ScanResult } from "@/services/api";

const verdictConfig = {
  phishing: {
    label: "Phishing",
    icon: ShieldX,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
  legit: {
    label: "Legitimate",
    icon: ShieldCheck,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
} satisfies Record<
  ScanResult["result"],
  { label: string; icon: typeof ShieldX; color: string; bg: string; border: string }
>;

export function ResultDisplay({ url, result }: { url: string; result: ScanResult }) {
  const cfg = verdictConfig[result.result];
  const Icon = cfg.icon;
  const pct = Math.round((result.confidence ?? 0) * 100);

  return (
    <Card className={`overflow-hidden border ${cfg.border} ${cfg.bg} shadow-card`}>
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-background/40 ${cfg.color}`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</h3>
            <p className="mt-1 break-all text-sm text-muted-foreground">{url}</p>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} />
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          {result.result === "phishing"
            ? "The backend classified this URL as phishing. Avoid visiting or sharing it until it has been verified."
            : "The backend classified this URL as legitimate based on the current model output."}
        </p>
      </div>
    </Card>
  );
}
