import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/pages/AdminPage";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin dashboard — PhishGuard" }] }),
  component: AdminPage,
});
