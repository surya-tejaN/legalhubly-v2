import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url("VITE_SUPABASE_URL must be a valid URL")
    .refine((url) => url.includes("supabase.co") || url.includes("localhost"), {
      message: "VITE_SUPABASE_URL must point to your Supabase project",
    }),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, "VITE_SUPABASE_PUBLISHABLE_KEY is missing or invalid"),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

function readEnv(): AppEnv {
  const parsed = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(
      `Invalid environment configuration.\n${details}\n\nCopy .env.example to .env and set your own Supabase project values.`,
    );
  }

  return parsed.data;
}

/** Validated public env — fails fast at startup if misconfigured. */
export const env = readEnv();
