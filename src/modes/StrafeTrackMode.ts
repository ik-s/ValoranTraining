import { getDifficultyPreset } from "../domain/DifficultyPresets";
import type {
  HitResult,
  TrainingMode,
  TrainingModeContext,
  TrainingTarget,
} from "./TrainingMode";

export interface TrackingFrame {
  timestamp: number;
  angularError: number;
  isInsideTarget: boolean;
  targetSpeed: number;
  targetDirection: "left" | "right";
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const randomBetween = (random: () => number, minimum: number, maximum: number) =>
  minimum + random() * (maximum - minimum);

export class StrafeTrackMode implements TrainingMode {
  private readonly preset;
  private target: TrainingTarget | null = null;
  private speed = 0;
  private direction: "left" | "right" = "right";
  private frameCount = 0;
  private insideCount = 0;
  private angularErrorTotal = 0;
  private precisionTotal = 0;
  private score = 0;
  private continuousTrackingStartedAt: number | null = null;
  private longestContinuousTracking = 0;

  constructor(private readonly context: TrainingModeContext) {
    this.preset = getDifficultyPreset("strafe-track", context.difficulty);
  }

  initialize(_now: number): void {
    const speed = this.preset.targetSpeed;
    if (!speed) {
      throw new Error("Strafe Track requires a speed range.");
    }
    this.speed = randomBetween(this.context.random, speed.minimum, speed.maximum);
    this.direction = this.context.random() < 0.5 ? "left" : "right";
    this.target = {
      id: this.context.createId(),
      yaw: randomBetween(this.context.random, -this.preset.spawnRangeYaw, this.preset.spawnRangeYaw),
      pitch: this.preset.allowsVerticalMotion
        ? randomBetween(this.context.random, -this.preset.spawnRangePitch, this.preset.spawnRangePitch)
        : 0,
      angularSize: this.preset.targetAngularSize,
    };
    this.context.addTarget(this.target);
  }

  update(deltaTimeSeconds: number, now: number): void {
    if (!this.target) {
      return;
    }
    const range = this.preset.spawnRangeYaw;
    let nextYaw =
      this.target.yaw +
      (this.direction === "right" ? 1 : -1) *
        this.speed *
        deltaTimeSeconds;
    while (nextYaw > range || nextYaw < -range) {
      if (nextYaw > range) {
        nextYaw = range - (nextYaw - range);
        this.direction = "left";
      } else {
        nextYaw = -range + (-range - nextYaw);
        this.direction = "right";
      }
    }
    const nextTarget: TrainingTarget = {
      ...this.target,
      yaw: nextYaw,
      pitch: this.preset.allowsVerticalMotion
        ? clamp(
            Math.sin(now / 1_000) * this.preset.spawnRangePitch,
            -this.preset.spawnRangePitch,
            this.preset.spawnRangePitch,
          )
        : 0,
    };
    this.target = nextTarget;
    this.context.updateTarget(nextTarget);
  }

  handleShot(_hit: HitResult): void {}

  recordTrackingFrame(frame: TrackingFrame): void {
    this.frameCount += 1;
    this.angularErrorTotal += frame.angularError;
    const precision = clamp(
      1 - frame.angularError / this.preset.targetAngularSize,
      0,
      1,
    );
    this.precisionTotal += precision;
    const speed = this.preset.targetSpeed;
    const speedWeight = speed
      ? 1 + ((frame.targetSpeed - speed.minimum) / (speed.maximum - speed.minimum || 1)) * 0.2
      : 1;
    this.score += precision * speedWeight;
    if (frame.isInsideTarget) {
      this.insideCount += 1;
      if (this.continuousTrackingStartedAt === null) {
        this.continuousTrackingStartedAt = frame.timestamp;
      }
      return;
    }
    this.finishContinuousTracking(frame.timestamp);
  }

  getMetrics(): Record<string, number | null> {
    return {
      score: Math.round(this.score),
      trackingAccuracy:
        this.frameCount === 0 ? 0 : this.precisionTotal / this.frameCount,
      insideRatio: this.frameCount === 0 ? 0 : this.insideCount / this.frameCount,
      averageAngularError:
        this.frameCount === 0 ? 0 : this.angularErrorTotal / this.frameCount,
      longestContinuousTracking: this.longestContinuousTracking,
    };
  }

  getSpeed(): number {
    return this.speed;
  }

  getDirection(): "left" | "right" {
    return this.direction;
  }

  dispose(): void {
    if (this.target) {
      this.context.removeTarget(this.target.id);
      this.target = null;
    }
  }

  private finishContinuousTracking(now: number): void {
    if (this.continuousTrackingStartedAt !== null) {
      this.longestContinuousTracking = Math.max(
        this.longestContinuousTracking,
        (now - this.continuousTrackingStartedAt) / 1_000,
      );
      this.continuousTrackingStartedAt = null;
    }
  }
}
