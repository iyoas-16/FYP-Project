import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
<<<<<<< HEAD
=======
import { getProfileRole } from "@/lib/profile-role";
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  isSigningOut: boolean;
  signOut: (redirectTo?: string) => Promise<void>;
};

<<<<<<< HEAD
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

=======
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
<<<<<<< HEAD
=======
  const [role, setRole] = useState<"user" | "admin">("user");
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncSession(nextSession: Session | null) {
      if (!active) return;
<<<<<<< HEAD
      setSession(nextSession);
      if (nextSession) setIsSigningOut(false);
      setLoading(false);
=======

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
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
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
<<<<<<< HEAD
=======
    setRole("user");
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
    if (typeof window !== "undefined") {
      window.location.replace(redirectTo);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
<<<<<<< HEAD
      isAdmin: readIsAdmin(session?.user ?? null),
=======
      isAdmin: role === "admin",
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
      loading,
      isSigningOut,
      signOut,
    }),
<<<<<<< HEAD
    [isSigningOut, loading, session],
=======
    [isSigningOut, loading, role, session],
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
