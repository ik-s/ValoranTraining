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

const fallbackDisplayName = (user: User): string =>
  "훈련생-" + user.id.replaceAll("-", "").slice(0, 6).toUpperCase();

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
    return new SupabaseAccountService(createClient(config.url, config.publishableKey));
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
    const { data, error } = await this.client.auth.getUser();
    if (error) {
      throw asError(error, "로그인 정보를 확인하지 못했습니다.");
    }
    const user = data.user;
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
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      throw asError(error, "프로필을 불러오지 못했습니다.");
    }
    return {
      id: user.id,
      displayName:
        typeof data?.display_name === "string" && data.display_name.length > 0
          ? data.display_name
          : fallbackDisplayName(user),
    };
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
