import type { AimModeId, Difficulty, DifficultyPreset } from "./types";

type DifficultyTable = Record<Difficulty, DifficultyPreset>;

export const DIFFICULTY_PRESETS: Record<AimModeId, DifficultyTable> = {
  "grid-shot": {
    easy: { targetAngularSize: 5, spawnRangeYaw: 35, spawnRangePitch: 18, minimumAngularSeparation: 12, simultaneousTargets: 3, usesShooting: true },
    normal: { targetAngularSize: 3.5, spawnRangeYaw: 50, spawnRangePitch: 24, minimumAngularSeparation: 16, simultaneousTargets: 3, usesShooting: true },
    hard: { targetAngularSize: 2.3, spawnRangeYaw: 65, spawnRangePitch: 30, minimumAngularSeparation: 20, simultaneousTargets: 3, usesShooting: true },
  },
  "micro-flick": {
    easy: { targetAngularSize: 3.4, spawnRangeYaw: 25, spawnRangePitch: 14, nextTargetDistance: { minimum: 4, maximum: 10 }, usesShooting: true },
    normal: { targetAngularSize: 2.4, spawnRangeYaw: 32, spawnRangePitch: 18, nextTargetDistance: { minimum: 6, maximum: 14 }, usesShooting: true },
    hard: { targetAngularSize: 1.6, spawnRangeYaw: 40, spawnRangePitch: 22, nextTargetDistance: { minimum: 8, maximum: 18 }, usesShooting: true },
  },
  "reaction-shot": {
    easy: { targetAngularSize: 4.5, spawnRangeYaw: 30, spawnRangePitch: 16, exposureTime: 1.5, spawnDelay: { minimum: 0.8, maximum: 1.8 }, usesShooting: true },
    normal: { targetAngularSize: 3.2, spawnRangeYaw: 45, spawnRangePitch: 22, exposureTime: 1, spawnDelay: { minimum: 0.6, maximum: 2.2 }, usesShooting: true },
    hard: { targetAngularSize: 2.1, spawnRangeYaw: 60, spawnRangePitch: 28, exposureTime: 0.7, spawnDelay: { minimum: 0.5, maximum: 2.8 }, usesShooting: true },
  },
  "target-switching": {
    easy: { targetAngularSize: 4.2, spawnRangeYaw: 35, spawnRangePitch: 18, minimumAngularSeparation: 12, simultaneousTargets: 4, relocationInterval: 8, usesShooting: true },
    normal: { targetAngularSize: 3, spawnRangeYaw: 50, spawnRangePitch: 24, minimumAngularSeparation: 18, simultaneousTargets: 5, relocationInterval: 6, usesShooting: true },
    hard: { targetAngularSize: 2, spawnRangeYaw: 65, spawnRangePitch: 30, minimumAngularSeparation: 24, simultaneousTargets: 6, relocationInterval: 4, usesShooting: true },
  },
  "strafe-track": {
    easy: { targetAngularSize: 5, spawnRangeYaw: 30, spawnRangePitch: 0, targetSpeed: { minimum: 12, maximum: 18 }, allowsVerticalMotion: false, usesShooting: false },
    normal: { targetAngularSize: 3.5, spawnRangeYaw: 45, spawnRangePitch: 6, targetSpeed: { minimum: 20, maximum: 28 }, allowsVerticalMotion: true, usesShooting: false },
    hard: { targetAngularSize: 2.3, spawnRangeYaw: 60, spawnRangePitch: 8, targetSpeed: { minimum: 30, maximum: 42 }, allowsVerticalMotion: true, usesShooting: false },
  },
  "headshot-only": {
    easy: { targetAngularSize: 3.4, spawnRangeYaw: 30, spawnRangePitch: 12, locationHoldTime: 3, usesShooting: true },
    normal: { targetAngularSize: 2.3, spawnRangeYaw: 45, spawnRangePitch: 16, locationHoldTime: 2, usesShooting: true },
    hard: { targetAngularSize: 1.5, spawnRangeYaw: 60, spawnRangePitch: 20, locationHoldTime: 1.3, usesShooting: true },
  },
};

export const getDifficultyPreset = (
  modeId: AimModeId,
  difficulty: Difficulty,
): DifficultyPreset => DIFFICULTY_PRESETS[modeId][difficulty];
