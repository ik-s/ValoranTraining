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

  it("uses profile completion and the Google avatar fallback", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: "서버 닉네임",
        avatar_url: null,
        profile_completed: false,
      },
      error: null,
    });
    const service = new SupabaseAccountService({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle }),
        }),
      }),
    } as never);

    await expect(
      service.getProfile({
        id: "a-b",
        user_metadata: { avatar_url: "https://google.example/me.png" },
      } as never),
    ).resolves.toEqual({
      id: "a-b",
      displayName: "서버 닉네임",
      avatarUrl: "https://google.example/me.png",
      profileCompleted: false,
    });
  });

  it("rejects an unsupported avatar before upload", async () => {
    const service = new SupabaseAccountService({
      auth: { getUser: vi.fn() },
    } as never);

    await expect(
      service.saveProfile({
        displayName: "훈련생",
        avatarFile: new File(["x"], "avatar.gif", { type: "image/gif" }),
      }),
    ).rejects.toThrow("JPEG, PNG, WebP");
  });

  it("stores an uploaded avatar under the active user's folder and completes the profile", async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://images.example/profile-avatars/me/avatar" },
    });
    const currentProfile = vi.fn().mockResolvedValue({
      data: {
        display_name: "훈련생-ABC123",
        avatar_url: null,
        profile_completed: false,
      },
      error: null,
    });
    const single = vi.fn().mockResolvedValue({
      data: {
        display_name: "조준왕",
        avatar_url: "https://images.example/profile-avatars/me/avatar?v=1",
        profile_completed: true,
      },
      error: null,
    });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single }),
      }),
    });
    const from = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: currentProfile }),
        }),
      })
      .mockReturnValueOnce({ update });
    const service = new SupabaseAccountService({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "me", user_metadata: {} } },
          error: null,
        }),
      },
      storage: { from: vi.fn().mockReturnValue({ upload, getPublicUrl }) },
      from,
    } as never);

    await expect(
      service.saveProfile({
        displayName: " 조준왕 ",
        avatarFile: new File(["x"], "avatar.png", { type: "image/png" }),
      }),
    ).resolves.toEqual({
      id: "me",
      displayName: "조준왕",
      avatarUrl: "https://images.example/profile-avatars/me/avatar?v=1",
      profileCompleted: true,
    });
    expect(upload).toHaveBeenCalledWith(
      "me/avatar",
      expect.any(File),
      expect.objectContaining({ upsert: true, contentType: "image/png" }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "조준왕",
        profile_completed: true,
      }),
    );
  });
});
