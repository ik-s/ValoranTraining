import { getDifficultyPreset } from "../domain/DifficultyPresets";
import { calculateClickScore } from "../domain/Scoring";
import { isSpawnSeparated } from "./TargetMath";
import type {
  HitResult,
  TrainingMode,
  TrainingModeContext,
  TrainingTarget,
} from "./TrainingMode";

const randomBetween = (random: () => number, minimum: number, maximum: number) =>
  minimum + random() * (maximum - minimum);

export class GridShotMode implements TrainingMode {
  private readonly preset;
  private readonly targets = new Map<string, TrainingTarget>();
  private readonly spawnedAt = new Map<string, number>();
  private score = 0;
  private hits = 0;
  private misses = 0;
  private combo = 0;
  private maxCombo = 0;
  private previousHitAt: number | null = null;
  private transitionTotal = 0;
  private transitionCount = 0;

  constructor(private readonly context: TrainingModeContext) {
    this.preset = getDifficultyPreset("grid-shot", context.difficulty);
  }

  initialize(now: number): void {
    const count = this.preset.simultaneousTargets ?? 3;
    for (let index = 0; index < count; index += 1) {
      this.spawnTarget(now);
    }
  }

  update(): void {}

  handleShot(hit: HitResult, now: number): void {
    if (!hit.targetId || !this.targets.has(hit.targetId)) {
      this.misses += 1;
      this.combo = 0;
      return;
    }

    const spawnedAt = this.spawnedAt.get(hit.targetId) ?? now;
    const reactionSeconds = Math.max(0, (now - spawnedAt) / 1_000);
    this.targets.delete(hit.targetId);
    this.spawnedAt.delete(hit.targetId);
    this.context.removeTarget(hit.targetId);
    this.hits += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += calculateClickScore({
      basePoints: 100,
      reactionTimeSeconds: reactionSeconds,
      reactionLimitSeconds: 1,
      maxReactionBonus: 50,
      comboAfterShot: this.combo,
    });
    if (this.previousHitAt !== null) {
      this.transitionTotal += (now - this.previousHitAt) / 1_000;
      this.transitionCount += 1;
    }
    this.previousHitAt = now;
    this.spawnTarget(now);
  }

  getMetrics(): Record<string, number | null> {
    const shots = this.hits + this.misses;
    return {
      score: this.score,
      hits: this.hits,
      misses: this.misses,
      accuracy: shots === 0 ? 0 : this.hits / shots,
      maxCombo: this.maxCombo,
      averageTransitionTime:
        this.transitionCount === 0
          ? null
          : this.transitionTotal / this.transitionCount,
    };
  }

  dispose(): void {
    for (const targetId of this.targets.keys()) {
      this.context.removeTarget(targetId);
    }
    this.targets.clear();
    this.spawnedAt.clear();
  }

  private spawnTarget(now: number): void {
    const separation = this.preset.minimumAngularSeparation ?? 0;
    const existing = [...this.targets.values()];
    const candidate = this.findSpawn(existing, separation);
    const target: TrainingTarget = {
      id: this.context.createId(),
      yaw: candidate.yaw,
      pitch: candidate.pitch,
      angularSize: this.preset.targetAngularSize,
    };
    this.targets.set(target.id, target);
    this.spawnedAt.set(target.id, now);
    this.context.addTarget(target);
  }

  private findSpawn(
    existing: TrainingTarget[],
    minimumAngularSeparation: number,
  ): Pick<TrainingTarget, "yaw" | "pitch"> {
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = {
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
      };
      if (isSpawnSeparated(candidate, existing, minimumAngularSeparation)) {
        return candidate;
      }
    }

    const fallback = [
      { yaw: -this.preset.spawnRangeYaw, pitch: -this.preset.spawnRangePitch },
      { yaw: this.preset.spawnRangeYaw, pitch: this.preset.spawnRangePitch },
      { yaw: -this.preset.spawnRangeYaw, pitch: this.preset.spawnRangePitch },
      { yaw: this.preset.spawnRangeYaw, pitch: -this.preset.spawnRangePitch },
      { yaw: 0, pitch: 0 },
    ];
    return (
      fallback.find((candidate) =>
        isSpawnSeparated(candidate, existing, minimumAngularSeparation),
      ) ?? fallback[0]!
    );
  }
}
