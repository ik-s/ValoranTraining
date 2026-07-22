import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import {
  parseRemoteTrainingRun,
  type RemoteTrainingRunRow,
} from "../domain/RemoteTrainingRecords";
import type { AimTrainingResult } from "../domain/Results";
import type { AimModeId, Difficulty } from "../domain/types";
import type { SupabasePublicConfig } from "./SupabaseConfig";

export interface AccountProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  profileCompleted: boolean;
}

export interface ProfileSaveInput {
  displayName: string;
  avatarFile: File | null;
}

export interface LeaderboardFilter {
  modeId: AimModeId;
  difficulty: Difficulty;
  durationSeconds: 30 | 60;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  accuracy: number | null;
  completedAt: string;
}

const browserClients = new Map<string, SupabaseClient>();

const fallbackDisplayName = (user: User): string =>
  "훈련생-" + user.id.replaceAll("-", "").slice(0, 6).toUpperCase();

const avatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxAvatarBytes = 2 * 1024 * 1024;

const asHttpsUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const fallbackAvatarUrl = (user: User): string | null =>
  asHttpsUrl(user.user_metadata.avatar_url) ?? asHttpsUrl(user.user_metadata.picture);

const toAccountProfile = (
  user: User,
  row: {
    display_name?: unknown;
    avatar_url?: unknown;
    profile_completed?: unknown;
  } | null,
): AccountProfile => ({
  id: user.id,
  displayName:
    typeof row?.display_name === "string" && row.display_name.length > 0
      ? row.display_name
      : fallbackDisplayName(user),
  avatarUrl: asHttpsUrl(row?.avatar_url) ?? fallbackAvatarUrl(user),
  profileCompleted: row?.profile_completed === true,
});

const asError = (error: unknown, fallback: string): Error =>
  error instanceof Error ? error : new Error(fallback);

const parseLeaderboardEntry = (value: unknown): LeaderboardEntry | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.rank !== "number" ||
    !Number.isInteger(row.rank) ||
    row.rank < 1 ||
    typeof row.display_name !== "string" ||
    row.display_name.length === 0 ||
    typeof row.score !== "number" ||
    !Number.isFinite(row.score) ||
    (row.accuracy !== null &&
      (typeof row.accuracy !== "number" || !Number.isFinite(row.accuracy))) ||
    typeof row.completed_at !== "string" ||
    Number.isNaN(Date.parse(row.completed_at))
  ) {
    return null;
  }
  return {
    rank: row.rank,
    displayName: row.display_name,
    score: row.score,
    accuracy: row.accuracy,
    completedAt: row.completed_at,
  };
};

export class SupabaseAccountService {
  constructor(private readonly client: SupabaseClient) {}

  static fromPublicConfig(config: SupabasePublicConfig): SupabaseAccountService {
    const clientKey = config.url + "\u0000" + config.publishableKey;
    let client = browserClients.get(clientKey);
    if (!client) {
      client = createClient(config.url, config.publishableKey);
      browserClients.set(clientKey, client);
    }
    return new SupabaseAccountService(client);
  }

  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      throw asError(error, "Google 로그인을 시작하지 못했습니다.");
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw asError(error, "로그아웃하지 못했습니다.");
    }
  }

  async getCurrentAccount(): Promise<AccountProfile | null> {
    // getUser() treats the expected signed-out state as an AuthSessionMissing
    // error in some browser contexts. Reading the local session first keeps a
    // fresh visitor signed out without showing a misleading failure message.
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw asError(error, "로그인 정보를 확인하지 못했습니다.");
    }
    const user = data.session?.user;
    return user ? this.getProfile(user) : null;
  }

  observeAuthChanges(listener: (user: User | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }

  async getProfile(user: User): Promise<AccountProfile> {
    const { data, error } = await this.client
      .from("profiles")
      .select("display_name, avatar_url, profile_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      throw asError(error, "프로필을 불러오지 못했습니다.");
    }
    return toAccountProfile(user, data);
  }

  async saveProfile(input: ProfileSaveInput): Promise<AccountProfile> {
    const displayName = input.displayName.trim();
    if (displayName.length < 3 || displayName.length > 32) {
      throw new Error("닉네임은 3~32자로 입력해주세요.");
    }
    if (
      input.avatarFile &&
      (!avatarMimeTypes.has(input.avatarFile.type) ||
        input.avatarFile.size > maxAvatarBytes)
    ) {
      throw new Error(
        "프로필 사진은 2MB 이하의 JPEG, PNG, WebP 파일만 사용할 수 있습니다.",
      );
    }

    const { data: authData, error: authError } = await this.client.auth.getUser();
    if (authError || !authData.user) {
      throw asError(authError, "로그인이 필요합니다.");
    }
    const user = authData.user;
    const existing = await this.getProfile(user);
    let avatarUrl = existing.avatarUrl;

    if (input.avatarFile) {
      const avatarStorage = this.client.storage.from("profile-avatars");
      const { error } = await avatarStorage.upload(
        user.id + "/avatar",
        input.avatarFile,
        {
          upsert: true,
          contentType: input.avatarFile.type,
          cacheControl: "3600",
        },
      );
      if (error) {
        throw asError(error, "프로필 사진을 업로드하지 못했습니다.");
      }
      const { data } = avatarStorage.getPublicUrl(user.id + "/avatar");
      const publicUrl = asHttpsUrl(data.publicUrl);
      if (!publicUrl) {
        throw new Error("프로필 사진 주소를 만들지 못했습니다.");
      }
      avatarUrl = publicUrl + "?v=" + Date.now();
    }

    const { data, error } = await this.client
      .from("profiles")
      .update({
        display_name: displayName,
        avatar_url: avatarUrl,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("display_name, avatar_url, profile_completed")
      .single();
    if (error) {
      throw asError(error, "프로필을 저장하지 못했습니다.");
    }
    return toAccountProfile(user, data);
  }

  async saveRun(result: AimTrainingResult): Promise<void> {
    const { error } = await this.client
      .from("training_runs")
      .upsert(
        {
          id: result.id,
          mode_id: result.modeId,
          difficulty: result.difficulty,
          duration_seconds: result.durationSeconds,
          score: result.score,
          accuracy: result.accuracy,
          completed_at: result.playedAt,
          result_data: result,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error) {
      throw asError(error, "훈련 기록을 저장하지 못했습니다.");
    }
  }

  async getOwnRuns(): Promise<AimTrainingResult[]> {
    const { data, error } = await this.client
      .from("training_runs")
      .select("id, result_data")
      .order("completed_at", { ascending: false });
    if (error) {
      throw asError(error, "클라우드 기록을 불러오지 못했습니다.");
    }
    return (data ?? []).flatMap((row) => {
      const parsed = parseRemoteTrainingRun(row as RemoteTrainingRunRow);
      return parsed ? [parsed] : [];
    });
  }

  async getLeaderboard(filter: LeaderboardFilter): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client.rpc("get_leaderboard", {
      p_mode_id: filter.modeId,
      p_difficulty: filter.difficulty,
      p_duration_seconds: filter.durationSeconds,
    });
    if (error) {
      throw asError(error, "랭킹을 불러오지 못했습니다.");
    }
    return Array.isArray(data)
      ? data.flatMap((entry) => {
          const parsed = parseLeaderboardEntry(entry);
          return parsed ? [parsed] : [];
        })
      : [];
  }
}
