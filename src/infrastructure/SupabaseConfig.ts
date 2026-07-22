export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export type PublicEnvironment = Readonly<Record<string, unknown>>;

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

export const getSupabasePublicConfig = (): SupabasePublicConfig | null =>
  parseSupabasePublicConfig(import.meta.env);
