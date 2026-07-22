import { describe, expect, it } from "vitest";

import { parseSupabasePublicConfig } from "../../src/infrastructure/SupabaseConfig";

describe("parseSupabasePublicConfig", () => {
  it("returns no configuration until both public browser values are present", () => {
    expect(parseSupabasePublicConfig({})).toBeNull();
    expect(
      parseSupabasePublicConfig({
        VITE_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBeNull();
  });

  it("accepts only a HTTPS Supabase URL and a non-empty public key", () => {
    expect(
      parseSupabasePublicConfig({
        VITE_SUPABASE_URL: " https://example.supabase.co ",
        VITE_SUPABASE_PUBLISHABLE_KEY: " sb_publishable_example ",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
    expect(
      parseSupabasePublicConfig({
        VITE_SUPABASE_URL: "http://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toBeNull();
  });
});
