import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
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

  useEffect(() => {
    let active = true;

    async function syncSession(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);
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

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: readIsAdmin(session?.user ?? null),
      loading,
      signOut,
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
