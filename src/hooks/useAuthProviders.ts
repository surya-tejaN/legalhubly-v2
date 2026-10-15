import { useEffect, useState } from "react";
import { isFeatureEnabled } from "@/config/features";

export type AuthProviders = {
  google: boolean;
  apple: boolean;
  email: boolean;
  loading: boolean;
};

/**
 * OAuth buttons follow `features.authGoogleApple` (off until Supabase providers are wired).
 * Email is always available unless Auth settings disable it.
 */
export function useAuthProviders(): AuthProviders {
  const oauthOn = isFeatureEnabled("authGoogleApple");
  const [state, setState] = useState<AuthProviders>({
    google: oauthOn,
    apple: oauthOn,
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
          google: oauthOn,
          apple: oauthOn,
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
  }, [oauthOn]);

  return state;
}
