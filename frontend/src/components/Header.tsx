import type { MouseEvent } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, LogOut, History, Gauge, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDefaultAuthenticatedPath } from "@/lib/auth-navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const brandDestination = user ? getDefaultAuthenticatedPath(isAdmin) : "/";
  const currentAdminTab =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;

  const memberNavItems = [
    { to: "/dashboard" as const, label: "Scan", icon: Gauge, visible: !!user && !isAdmin },
    { to: "/history" as const, label: "History", icon: History, visible: !!user && !isAdmin },
  ];
  const adminNavItems = [
    {
      href: "/admin",
      label: "Admin",
      icon: LayoutDashboard,
      active: pathname === "/admin" && currentAdminTab !== "history",
    },
    {
      href: "/admin?tab=history",
      label: "History",
      icon: History,
      active: pathname === "/admin" && currentAdminTab === "history",
    },
  ];

  async function handleSignOut() {
    try {
      await signOut();
      window.location.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't sign you out right now.";
      toast.error(message);
    }
  }

  function handleBrandClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!user) return;
    event.preventDefault();
    window.location.assign(brandDestination);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link
          to={brandDestination}
          onClick={handleBrandClick}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>PhishGuard</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2">
          {user ? (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <span className="max-w-40 truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
                {isAdmin ? <Badge variant="outline">Admin</Badge> : null}
              </div>
              {memberNavItems
                .filter((item) => item.visible)
                .map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      buttonVariants({
                        variant: pathname === to ? "secondary" : "ghost",
                        size: "sm",
                      }),
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </Link>
                ))}
              {isAdmin
                ? adminNavItems.map(({ href, label, icon: Icon, active }) => (
                    <a
                      key={href}
                      href={href}
                      className={cn(
                        buttonVariants({
                          variant: active ? "secondary" : "ghost",
                          size: "sm",
                        }),
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {label}
                    </a>
                  ))
                : null}
              <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
