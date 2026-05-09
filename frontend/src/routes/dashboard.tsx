import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/pages/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Scan URL — PhishGuard" }] }),
  component: DashboardPage,
});
