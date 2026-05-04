import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/pages/HistoryPage";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Scan history — PhishGuard" }] }),
  component: HistoryPage,
});
