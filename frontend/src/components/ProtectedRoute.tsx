import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShieldAlert, UserLock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function GuardShell({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg border-border/60 bg-card/70 p-8 text-center shadow-card">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </Card>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, isAdmin, loading, isSigningOut } = useAuth();

  useEffect(() => {
    if (loading || isSigningOut || user || typeof window === "undefined") return;

    const redirect = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [isSigningOut, loading, user]);

  if (loading || isSigningOut) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <GuardShell
        icon={<Loader2 className="h-6 w-6 animate-spin" />}
        title={isSigningOut ? "Signing you out" : "Redirecting to sign in"}
        description={
          isSigningOut
            ? "Taking you back to the landing page."
            : "Please log in to continue to your phishing detection workspace."
        }
      />
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <GuardShell
        icon={<UserLock className="h-6 w-6" />}
        title="Admin access required"
        description="This area is reserved for platform administrators with analytics access."
        action={
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}

export function InlineErrorState({ message }: { message: string }) {
  return (
    <GuardShell
      icon={<ShieldAlert className="h-6 w-6" />}
      title="We hit an API issue"
      description={message}
    />
  );
}
