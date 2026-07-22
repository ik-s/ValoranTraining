export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export type PublicEnvironment = Readonly<Record<string, unknown>>;

// These are intentionally public browser values: Supabase publishable keys are
// designed to be shipped to the client, while RLS protects the underlying data.
// Sites provides runtime variables, but Vite resolves VITE_* values at build
// time. Keeping this fallback lets the static production bundle use the same
// configured project without ever exposing a service-role key.
export const DEPLOYED_SUPABASE_PUBLIC_CONFIG: SupabasePublicConfig = {
  url: "https://kcenurvzkdoazkvllodc.supabase.co",
  publishableKey: "sb_publishable_ntKEG123BlTMzIGqOB8v6g_C2ut64Ur",
};

const stringValue = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseSupabasePublicConfig = (
  environment: PublicEnvironment,
): SupabasePublicConfig | null => {
  const url = stringValue(environment.VITE_SUPABASE_URL);
  const publishableKey = stringValue(environment.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !publishableKey) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }
  return { url, publishableKey };
};

export const resolveSupabasePublicConfig = (
  environment: PublicEnvironment,
): SupabasePublicConfig =>
  parseSupabasePublicConfig(environment) ?? DEPLOYED_SUPABASE_PUBLIC_CONFIG;

export const getSupabasePublicConfig = (): SupabasePublicConfig =>
  resolveSupabasePublicConfig(import.meta.env);
