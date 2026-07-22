export const aimModeIds = [
  "grid-shot",
  "micro-flick",
  "reaction-shot",
  "target-switching",
  "strafe-track",
  "headshot-only",
] as const;

export type AimModeId = (typeof aimModeIds)[number];
export type Difficulty = "easy" | "normal" | "hard";
export type DirectionZone = "center" | "left" | "right" | "up" | "down";

export interface ValorantSensitivitySettings {
  dpi: number;
  valorantSensitivity: number;
  edpi: number;
  calibrationMultiplier: number;
  calibratedAt: string | null;
}

export interface CrosshairSettings {
  color: string;
  lineLength: number;
  lineThickness: number;
  centerGap: number;
  showCenterDot: boolean;
  centerDotSize: number;
}

export interface TargetSpeedRange {
  minimum: number;
  maximum: number;
}

export interface DifficultyPreset {
  targetAngularSize: number;
  spawnRangeYaw: number;
  spawnRangePitch: number;
  minimumAngularSeparation?: number;
  simultaneousTargets?: number;
  nextTargetDistance?: TargetSpeedRange;
  targetSpeed?: TargetSpeedRange;
  exposureTime?: number;
  spawnDelay?: TargetSpeedRange;
  relocationInterval?: number;
  locationHoldTime?: number;
  allowsVerticalMotion?: boolean;
  usesShooting: boolean;
}
