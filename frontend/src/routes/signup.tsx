import { createFileRoute } from "@tanstack/react-router";
import { SignupPage } from "@/pages/SignupPage";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Sign up — PhishGuard" }],
  }),
  component: SignupPage,
});
