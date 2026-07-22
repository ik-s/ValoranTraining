import { getDifficultyPreset } from "../domain/DifficultyPresets";
import { calculateClickScore } from "../domain/Scoring";
import type {
  HitResult,
  TrainingMode,
  TrainingModeContext,
  TrainingTarget,
} from "./TrainingMode";

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const randomBetween = (random: () => number, minimum: number, maximum: number) =>
  minimum + random() * (maximum - minimum);

export class MicroFlickMode implements TrainingMode {
  private readonly preset;
  private currentTarget: TrainingTarget | null = null;
  private currentTargetStartedAt = 0;
  private score = 0;
  private hits = 0;
  private misses = 0;
  private combo = 0;
  private maxCombo = 0;
  private adjustmentTotal = 0;

  constructor(private readonly context: TrainingModeContext) {
    this.preset = getDifficultyPreset("micro-flick", context.difficulty);
  }

  initialize(now: number): void {
    this.spawnInitial(now);
  }

  update(): void {}

  handleShot(hit: HitResult, now: number): void {
    if (!this.currentTarget || hit.targetId !== this.currentTarget.id) {
      this.misses += 1;
      this.combo = 0;
      return;
    }

    const previousTarget = this.currentTarget;
    const adjustmentSeconds = Math.max(0, (now - this.currentTargetStartedAt) / 1_000);
    this.context.removeTarget(previousTarget.id);
    this.hits += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.adjustmentTotal += adjustmentSeconds;
    this.score += calculateClickScore({
      basePoints: 100,
      reactionTimeSeconds: adjustmentSeconds,
      reactionLimitSeconds: 1,
      maxReactionBonus: 50,
      comboAfterShot: this.combo,
    });
    this.spawnNear(previousTarget, now);
  }

  getMetrics(): Record<string, number | null> {
    const shots = this.hits + this.misses;
    return {
      score: this.score,
      hits: this.hits,
      misses: this.misses,
      accuracy: shots === 0 ? 0 : this.hits / shots,
      maxCombo: this.maxCombo,
      averageMicroAdjustmentTime:
        this.hits === 0 ? null : this.adjustmentTotal / this.hits,
    };
  }

  dispose(): void {
    if (this.currentTarget) {
      this.context.removeTarget(this.currentTarget.id);
      this.currentTarget = null;
    }
  }

  private spawnInitial(now: number): void {
    this.setCurrentTarget(
      {
        id: this.context.createId(),
        yaw: randomBetween(
          this.context.random,
          -this.preset.spawnRangeYaw,
          this.preset.spawnRangeYaw,
        ),
        pitch: randomBetween(
          this.context.random,
          -this.preset.spawnRangePitch,
          this.preset.spawnRangePitch,
        ),
        angularSize: this.preset.targetAngularSize,
      },
      now,
    );
  }

  private spawnNear(previous: TrainingTarget, now: number): void {
    const range = this.preset.nextTargetDistance;
    if (!range) {
      throw new Error("Micro Flick requires a target distance range.");
    }
    let yaw = previous.yaw;
    let pitch = previous.pitch;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const distance = randomBetween(this.context.random, range.minimum, range.maximum);
      const angle = this.context.random() * Math.PI * 2;
      const candidateYaw = previous.yaw + Math.cos(angle) * distance;
      const candidatePitch = previous.pitch + Math.sin(angle) * distance;
      if (
        Math.abs(candidateYaw) <= this.preset.spawnRangeYaw &&
        Math.abs(candidatePitch) <= this.preset.spawnRangePitch
      ) {
        yaw = candidateYaw;
        pitch = candidatePitch;
        break;
      }
    }
    this.setCurrentTarget(
      {
        id: this.context.createId(),
        yaw: clamp(yaw, -this.preset.spawnRangeYaw, this.preset.spawnRangeYaw),
        pitch: clamp(
          pitch,
          -this.preset.spawnRangePitch,
          this.preset.spawnRangePitch,
        ),
        angularSize: this.preset.targetAngularSize,
      },
      now,
    );
  }

  private setCurrentTarget(target: TrainingTarget, now: number): void {
    this.currentTarget = target;
    this.currentTargetStartedAt = now;
    this.context.addTarget(target);
  }
}
