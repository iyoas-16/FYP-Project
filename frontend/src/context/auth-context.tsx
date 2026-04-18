import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  isSigningOut: boolean;
  signOut: (redirectTo?: string) => Promise<void>;
};

function readIsAdmin(user: User | null) {
  if (!user) return false;

  const roles = new Set<string>();
  const appMetadata = user.app_metadata;

  if (typeof user.role === "string") roles.add(user.role.toLowerCase());
  if (typeof appMetadata?.role === "string") roles.add(appMetadata.role.toLowerCase());
  if (Array.isArray(appMetadata?.roles)) {
    for (const role of appMetadata.roles) {
      if (typeof role === "string") roles.add(role.toLowerCase());
    }
  }

  return roles.has("admin") || roles.has("service_role");
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncSession(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) setIsSigningOut(false);
      setLoading(false);
    }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      void syncSession(nextSession);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOut(redirectTo = "/") {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setSession(null);
    if (typeof window !== "undefined") {
      window.location.replace(redirectTo);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: readIsAdmin(session?.user ?? null),
      loading,
      isSigningOut,
      signOut,
    }),
    [isSigningOut, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
