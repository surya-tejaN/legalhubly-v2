import { useEffect, useState } from "react";

export type AuthProviders = {
  google: boolean;
  apple: boolean;
  email: boolean;
  loading: boolean;
};

/**
 * Reads which auth providers are actually enabled in the linked Supabase project.
 * Prevents showing Google/Apple buttons that will 400 with "provider is not enabled".
 */
export function useAuthProviders(): AuthProviders {
  const [state, setState] = useState<AuthProviders>({
    google: false,
    apple: false,
    email: true,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL as string;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const res = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error("settings fetch failed");
        const data = (await res.json()) as {
          external?: { google?: boolean; apple?: boolean; email?: boolean };
        };
        if (!active) return;
        setState({
          google: Boolean(data.external?.google),
          apple: Boolean(data.external?.apple),
          email: data.external?.email !== false,
          loading: false,
        });
      } catch {
        // Safe default: email only (matches current Supabase project)
        if (!active) return;
        setState({ google: false, apple: false, email: true, loading: false });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return state;
}
