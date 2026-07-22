import type { AimTrainingResult } from "../domain/Results";
import type { AimModeId, Difficulty } from "../domain/types";

export type ModeFilter = AimModeId | "all";
export type DifficultyFilter = Difficulty | "all";

export const filterTrainingResults = (
  results: AimTrainingResult[],
  mode: ModeFilter,
  difficulty: DifficultyFilter,
): AimTrainingResult[] =>
  results.filter(
    (result) =>
      (mode === "all" || result.modeId === mode) &&
      (difficulty === "all" || result.difficulty === difficulty),
  );
