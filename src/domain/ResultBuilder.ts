import type {
  AimTrainingResult,
  BaseTrainingResult,
} from "./Results";
import type { AimModeId, Difficulty, ValorantSensitivitySettings } from "./types";
import type { PointerLockMode } from "../engine/PointerLockController";

export interface ResultBuildConfig {
  modeId: AimModeId;
  difficulty: Difficulty;
  durationSeconds: 30 | 60;
  sensitivity: ValorantSensitivitySettings;
}

const asNumber = (value: number | null | undefined, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const buildAimTrainingResult = (
  config: ResultBuildConfig,
  metrics: Record<string, number | null>,
  pointerLockMode: Exclude<PointerLockMode, "unavailable">,
): AimTrainingResult => {
  const hits = asNumber(metrics.hits);
  const misses = asNumber(metrics.misses) + asNumber(metrics.emptyMisses);
  const base: Omit<BaseTrainingResult, "modeId"> = {
    id: crypto.randomUUID(),
    resultType: "aim",
    difficulty: config.difficulty,
    playedAt: new Date().toISOString(),
    durationSeconds: config.durationSeconds,
    score: asNumber(metrics.score),
    accuracy: config.modeId === "strafe-track" ? null : asNumber(metrics.accuracy),
    hits,
    misses,
    maxCombo: asNumber(metrics.maxCombo),
    sensitivitySnapshot: {
      dpi: config.sensitivity.dpi,
      valorantSensitivity: config.sensitivity.valorantSensitivity,
      edpi: config.sensitivity.edpi,
      calibrationMultiplier: config.sensitivity.calibrationMultiplier,
    },
    inputSnapshot: { pointerLockMode },
    directionalMetrics: [],
  };

  switch (config.modeId) {
    case "grid-shot":
      return {
        ...base,
        modeId: "grid-shot",
        modeMetrics: {
          hitsPerSecond: hits / base.durationSeconds,
          averageTransitionTime: metrics.averageTransitionTime ?? null,
        },
      };
    case "micro-flick":
      return {
        ...base,
        modeId: "micro-flick",
        modeMetrics: {
          averageMicroAdjustmentTime: metrics.averageMicroAdjustmentTime ?? null,
        },
      };
    case "reaction-shot":
      return {
        ...base,
        modeId: "reaction-shot",
        modeMetrics: {
          medianReactionTime: metrics.medianReactionTime ?? null,
          falseStarts: asNumber(metrics.falseStarts),
          timeouts: asNumber(metrics.timeouts),
        },
      };
    case "target-switching":
      return {
        ...base,
        modeId: "target-switching",
        modeMetrics: {
          averageTransitionTime: metrics.averageTransitionTime ?? null,
          wrongTargetHits: asNumber(metrics.wrongTargetHits),
          emptyMisses: asNumber(metrics.misses),
        },
      };
    case "strafe-track":
      return {
        ...base,
        modeId: "strafe-track",
        accuracy: null,
        modeMetrics: {
          trackingAccuracy: asNumber(metrics.trackingAccuracy),
          insideRatio: asNumber(metrics.insideRatio),
          averageAngularError: asNumber(metrics.averageAngularError),
          longestContinuousTracking: asNumber(metrics.longestContinuousTracking),
        },
      };
    case "headshot-only":
      return {
        ...base,
        modeId: "headshot-only",
        modeMetrics: {
          headHits: asNumber(metrics.headHits),
          headshotRatio: metrics.headshotRatio ?? null,
          bodyHits: asNumber(metrics.bodyHits),
          timeouts: asNumber(metrics.timeouts),
        },
      };
  }
};
