import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "client" | "lawyer" | "firm_admin" | "platform_admin";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_photo: string | null;
  email: string | null;
  city: string | null;
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function useDashboardPath(role?: AppRole | null): string {
  switch (role) {
    case "lawyer":
      return "/lawyer/dashboard";
    case "firm_admin":
      return "/firm/dashboard";
    case "platform_admin":
      return "/admin/dashboard";
    default:
      return "/client/dashboard";
  }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] profile fetch failed", error.message);
    return null;
  }
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!active) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer profile fetch to avoid auth deadlock on TOKEN_REFRESHED
          void Promise.resolve().then(async () => {
            const p = await fetchProfile(newSession.user.id);
            if (!active) return;
            setProfile(p);
            setLoading(false);
          });
        } else {
          setProfile(null);
          setLoading(false);
        }

        if (event === "SIGNED_OUT") {
          setProfile(null);
        }
      },
    );

    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      if (!active) return;
      setSession(existing);
      setUser(existing?.user ?? null);

      if (existing?.user) {
        const p = await fetchProfile(existing.user.id);
        if (!active) return;
        setProfile(p);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return null;
    }
    const p = await fetchProfile(user.id);
    setProfile(p);
    return p;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
