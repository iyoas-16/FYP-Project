import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getProfileRole } from "@/lib/profile-role";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  isSigningOut: boolean;
  signOut: (redirectTo?: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncSession(nextSession: Session | null) {
      if (!active) return;

      setSession(nextSession);
      setRole("user");
      setLoading(true);

      if (!nextSession?.user) {
        setLoading(false);
        return;
      }

      try {
        const nextRole = await getProfileRole(nextSession.user.id);
        if (active) {
          setRole(nextRole);
        }
      } catch {
        if (active) {
          setRole("user");
        }
      } finally {
        if (active) {
          if (nextSession) setIsSigningOut(false);
          setLoading(false);
        }
      }
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
    setRole("user");
    if (typeof window !== "undefined") {
      window.location.replace(redirectTo);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: role === "admin",
      loading,
      isSigningOut,
      signOut,
    }),
    [isSigningOut, loading, role, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
