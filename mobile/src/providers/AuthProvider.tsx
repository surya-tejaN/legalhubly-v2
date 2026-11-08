import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppRole = "client" | "lawyer" | "firm_admin" | "platform_admin";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  role: AppRole;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, email, city, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[auth] profile", error.message);
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
    let currentUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      currentUserId = newSession?.user?.id ?? null;

      if (newSession?.user) {
        const uid = newSession.user.id;
        void Promise.resolve().then(async () => {
          const p = await fetchProfile(uid);
          if (!active || currentUserId !== uid) return;
          setProfile(p);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      if (!active) return;
      setSession(existing);
      setUser(existing?.user ?? null);
      if (currentUserId === null) currentUserId = existing?.user?.id ?? null;
      if (existing?.user) {
        const uid = existing.user.id;
        const p = await fetchProfile(uid);
        if (!active || currentUserId !== uid) return;
        setProfile(p);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      refreshProfile: async () => {
        if (!user) {
          setProfile(null);
          return null;
        }
        const p = await fetchProfile(user.id);
        setProfile(p);
        return p;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
      },
    }),
    [user, session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
