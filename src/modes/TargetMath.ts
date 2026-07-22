import type { AngularPosition, TrainingTarget } from "./TrainingMode";

export const angularDistance = (
  first: AngularPosition,
  second: AngularPosition,
): number => Math.hypot(first.yaw - second.yaw, first.pitch - second.pitch);

export const isSpawnSeparated = (
  candidate: AngularPosition,
  existing: ReadonlyArray<Pick<TrainingTarget, "yaw" | "pitch">>,
  minimumAngularSeparation: number,
): boolean =>
  existing.every(
    (target) =>
      angularDistance(candidate, target) >= minimumAngularSeparation,
  );

export const angularSizeToWorldSize = (
  targetDistance: number,
  angularSizeDegrees: number,
): number =>
  2 *
  targetDistance *
  Math.tan((angularSizeDegrees * Math.PI) / 360);
