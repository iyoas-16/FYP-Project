import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/pages/HistoryPage";

export const Route = createFileRoute("/history")({
<<<<<<< HEAD
  head: () => ({ meta: [{ title: "History — PhishGuard" }] }),
=======
  head: () => ({ meta: [{ title: "Scan history — PhishGuard" }] }),
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
  component: HistoryPage,
});
