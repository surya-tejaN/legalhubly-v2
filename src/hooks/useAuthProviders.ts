import { useEffect, useState } from "react";

export type AuthProviders = {
  google: boolean;
  apple: boolean;
  email: boolean;
  loading: boolean;
};

/**
 * Always expose Google/Apple in the UI (best conversion).
 * Real enablement is checked when the user clicks (Supabase returns a clear error if off).
 */
export function useAuthProviders(): AuthProviders {
  const [state, setState] = useState<AuthProviders>({
    google: true,
    apple: true,
    email: true,
    loading: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL as string;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        if (!url || !key) return;
        const res = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          external?: { email?: boolean };
        };
        if (!active) return;
        setState((s) => ({
          ...s,
          email: data.external?.email !== false,
          loading: false,
        }));
      } catch {
        // keep defaults
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
