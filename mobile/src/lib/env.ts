import Constants from "expo-constants";

function read(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_ANON_KEY"): string {
  const fromEnv = process.env[name];
  if (fromEnv && fromEnv.length > 8) return fromEnv;
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const fromExtra = extra?.[name];
  if (fromExtra && fromExtra.length > 8) return fromExtra;
  throw new Error(
    `Missing ${name}. Copy mobile/.env.example to mobile/.env (same values as the website VITE_SUPABASE_* keys).`,
  );
}

export const env = {
  supabaseUrl: read("EXPO_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: read("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
};
