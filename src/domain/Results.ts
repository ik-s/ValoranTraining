import type { AimModeId, Difficulty, DirectionZone } from "./types";

export interface DirectionalMetric {
  zone: DirectionZone;
  attempts: number;
  successes: number;
  successRate: number;
  averageResponseTime?: number;
}

export interface BaseTrainingResult {
  id: string;
  resultType: "aim";
  modeId: AimModeId;
  difficulty: Difficulty;
  playedAt: string;
  durationSeconds: 60;
  score: number;
  accuracy: number | null;
  hits: number;
  misses: number;
  maxCombo: number;
  sensitivitySnapshot: {
    dpi: number;
    valorantSensitivity: number;
    edpi: number;
    calibrationMultiplier: number;
  };
  inputSnapshot: {
    pointerLockMode: "raw" | "standard";
    averageFps?: number;
  };
  directionalMetrics: DirectionalMetric[];
}

export interface GridShotResult extends BaseTrainingResult {
  modeId: "grid-shot";
  modeMetrics: {
    hitsPerSecond: number;
    averageTransitionTime: number | null;
  };
}

export interface MicroFlickResult extends BaseTrainingResult {
  modeId: "micro-flick";
  modeMetrics: {
    averageMicroAdjustmentTime: number | null;
  };
}

export interface ReactionShotResult extends BaseTrainingResult {
  modeId: "reaction-shot";
  modeMetrics: {
    medianReactionTime: number | null;
    falseStarts: number;
    timeouts: number;
  };
}

export interface TargetSwitchingResult extends BaseTrainingResult {
  modeId: "target-switching";
  modeMetrics: {
    averageTransitionTime: number | null;
    wrongTargetHits: number;
    emptyMisses: number;
  };
}

export interface StrafeTrackResult extends BaseTrainingResult {
  modeId: "strafe-track";
  accuracy: null;
  modeMetrics: {
    trackingAccuracy: number;
    insideRatio: number;
    averageAngularError: number;
    longestContinuousTracking: number;
  };
}

export interface HeadshotOnlyResult extends BaseTrainingResult {
  modeId: "headshot-only";
  modeMetrics: {
    headHits: number;
    headshotRatio: number | null;
    bodyHits: number;
    timeouts: number;
  };
}

export type AimTrainingResult =
  | GridShotResult
  | MicroFlickResult
  | ReactionShotResult
  | TargetSwitchingResult
  | StrafeTrackResult
  | HeadshotOnlyResult;
