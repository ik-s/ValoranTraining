import type { AimTrainingResult } from "./Results";
import { aimModeIds, type AimModeId, type Difficulty } from "./types";

export interface RemoteTrainingRunRow {
  id: string;
  result_data: unknown;
}

const difficulties: readonly Difficulty[] = ["easy", "normal", "hard"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isNonNegativeNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= 0;

const isNullableNumber = (value: unknown): boolean =>
  value === null || isFiniteNumber(value);

const isKnownMode = (value: unknown): value is AimModeId =>
  typeof value === "string" && (aimModeIds as readonly string[]).includes(value);

const isKnownDifficulty = (value: unknown): value is Difficulty =>
  typeof value === "string" && (difficulties as readonly string[]).includes(value);

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const isMetrics = (value: unknown): value is Record<string, number | null> =>
  isRecord(value) && Object.values(value).every(isNullableNumber);

const isValidAimTrainingResult = (value: unknown): value is AimTrainingResult => {
  if (!isRecord(value)) {
    return false;
  }
  if (
    value.resultType !== "aim" ||
    typeof value.id !== "string" ||
    !isKnownMode(value.modeId) ||
    !isKnownDifficulty(value.difficulty) ||
    !isIsoDate(value.playedAt) ||
    (value.durationSeconds !== 30 && value.durationSeconds !== 60) ||
    !isNonNegativeNumber(value.score) ||
    !isNullableNumber(value.accuracy) ||
    (typeof value.accuracy === "number" &&
      (value.accuracy < 0 || value.accuracy > 1)) ||
    !isNonNegativeNumber(value.hits) ||
    !isNonNegativeNumber(value.misses) ||
    !isNonNegativeNumber(value.maxCombo) ||
    !Array.isArray(value.directionalMetrics) ||
    !isMetrics(value.modeMetrics)
  ) {
    return false;
  }
  if (!isRecord(value.sensitivitySnapshot) || !isRecord(value.inputSnapshot)) {
    return false;
  }
  const sensitivity = value.sensitivitySnapshot;
  return (
    isNonNegativeNumber(sensitivity.dpi) &&
    isNonNegativeNumber(sensitivity.valorantSensitivity) &&
    isNonNegativeNumber(sensitivity.edpi) &&
    isNonNegativeNumber(sensitivity.calibrationMultiplier) &&
    (value.inputSnapshot.pointerLockMode === "raw" ||
      value.inputSnapshot.pointerLockMode === "standard")
  );
};

export const parseRemoteTrainingRun = (
  row: unknown,
): AimTrainingResult | null => {
  if (!isRecord(row) || typeof row.id !== "string" || !isValidAimTrainingResult(row.result_data)) {
    return null;
  }
  return row.result_data.id === row.id ? row.result_data : null;
};
