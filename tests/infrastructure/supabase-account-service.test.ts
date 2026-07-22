import { describe, expect, it, vi } from "vitest";

import {
  SupabaseAccountService,
  type LeaderboardFilter,
} from "../../src/infrastructure/SupabaseAccountService";
import type { SupabasePublicConfig } from "../../src/infrastructure/SupabaseConfig";

describe("SupabaseAccountService", () => {
  it("starts Google OAuth with the current app redirect URL", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });
    const service = new SupabaseAccountService({
      auth: { signInWithOAuth },
    } as never);

    await service.signInWithGoogle("https://valoran.example/");

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://valoran.example/" },
    });
  });

  it("treats the normal signed-out state as an account-free session", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const service = new SupabaseAccountService({
      auth: { getSession },
    } as never);

    await expect(service.getCurrentAccount()).resolves.toBeNull();
    expect(getSession).toHaveBeenCalledOnce();
  });

  it("reuses the browser client for identical public configuration", () => {
    const config: SupabasePublicConfig = {
      url: "https://reuse-client.supabase.co",
      publishableKey: "sb_publishable_reuse_client",
    };
    const first = SupabaseAccountService.fromPublicConfig(config) as unknown as {
      client: unknown;
    };
    const second = SupabaseAccountService.fromPublicConfig(config) as unknown as {
      client: unknown;
    };

    expect(first.client).toBe(second.client);
  });

  it("passes the selected ranking scope to the sanitized leaderboard RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const service = new SupabaseAccountService({ rpc } as never);
    const filter: LeaderboardFilter = {
      modeId: "strafe-track",
      difficulty: "hard",
      durationSeconds: 30,
    };

    await service.getLeaderboard(filter);

    expect(rpc).toHaveBeenCalledWith("get_leaderboard", {
      p_mode_id: "strafe-track",
      p_difficulty: "hard",
      p_duration_seconds: 30,
    });
  });
});
