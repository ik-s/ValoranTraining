import { getDifficultyPreset } from "../domain/DifficultyPresets";
import { calculateClickScore } from "../domain/Scoring";
import { angularDistance, isSpawnSeparated } from "./TargetMath";
import type {
  HitResult,
  TrainingMode,
  TrainingModeContext,
  TrainingTarget,
} from "./TrainingMode";

const randomBetween = (random: () => number, minimum: number, maximum: number) =>
  minimum + random() * (maximum - minimum);

export class TargetSwitchingMode implements TrainingMode {
  private readonly preset;
  private readonly targets = new Map<string, TrainingTarget>();
  private activeTargetId: string | null = null;
  private activeAt = 0;
  private score = 0;
  private hits = 0;
  private misses = 0;
  private wrongTargetHits = 0;
  private combo = 0;
  private maxCombo = 0;
  private transitions = 0;
  private transitionTotal = 0;
  private hitsSinceRelocation = 0;

  constructor(private readonly context: TrainingModeContext) {
    this.preset = getDifficultyPreset("target-switching", context.difficulty);
  }

  initialize(now: number): void {
    this.populateTargets();
    this.activateTarget(this.chooseNextTargetId(null), now);
  }

  update(): void {}

  handleShot(hit: HitResult, now: number): void {
    if (!hit.targetId || !this.targets.has(hit.targetId)) {
      this.misses += 1;
      this.combo = 0;
      return;
    }
    if (hit.targetId !== this.activeTargetId) {
      this.wrongTargetHits += 1;
      this.score -= 30;
      this.combo = 0;
      return;
    }

    this.hits += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += calculateClickScore({
      basePoints: 100,
      reactionTimeSeconds: Math.max(0, (now - this.activeAt) / 1_000),
      reactionLimitSeconds: 1,
      maxReactionBonus: 50,
      comboAfterShot: this.combo,
    });
    if (this.hits > 1) {
      this.transitions += 1;
      this.transitionTotal += Math.max(0, (now - this.activeAt) / 1_000);
    }
    this.hitsSinceRelocation += 1;
    if (this.hitsSinceRelocation >= (this.preset.relocationInterval ?? Infinity)) {
      this.clearTargets();
      this.hitsSinceRelocation = 0;
      this.populateTargets();
      this.activateTarget(this.chooseNextTargetId(null), now);
      return;
    }
    this.activateTarget(this.chooseNextTargetId(hit.targetId), now);
  }

  getMetrics(): Record<string, number | null> {
    const shots = this.hits + this.misses + this.wrongTargetHits;
    return {
      score: this.score,
      hits: this.hits,
      misses: this.misses,
      wrongTargetHits: this.wrongTargetHits,
      accuracy: shots === 0 ? 0 : this.hits / shots,
      maxCombo: this.maxCombo,
      averageTransitionTime:
        this.transitions === 0 ? null : this.transitionTotal / this.transitions,
    };
  }

  dispose(): void {
    this.clearTargets();
  }

  private populateTargets(): void {
    const count = this.preset.simultaneousTargets ?? 4;
    for (let index = 0; index < count; index += 1) {
      const target = this.createTarget();
      this.targets.set(target.id, target);
      this.context.addTarget(target);
    }
  }

  private createTarget(): TrainingTarget {
    const minimum = this.preset.minimumAngularSeparation ?? 0;
    const existing = [...this.targets.values()];
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = {
        yaw: randomBetween(this.context.random, -this.preset.spawnRangeYaw, this.preset.spawnRangeYaw),
        pitch: randomBetween(this.context.random, -this.preset.spawnRangePitch, this.preset.spawnRangePitch),
      };
      if (isSpawnSeparated(candidate, existing, minimum)) {
        return {
          id: this.context.createId(),
          ...candidate,
          angularSize: this.preset.targetAngularSize,
          active: false,
        };
      }
    }
    const fallback = [
      { yaw: -this.preset.spawnRangeYaw, pitch: -this.preset.spawnRangePitch },
      { yaw: this.preset.spawnRangeYaw, pitch: this.preset.spawnRangePitch },
      { yaw: -this.preset.spawnRangeYaw, pitch: this.preset.spawnRangePitch },
      { yaw: this.preset.spawnRangeYaw, pitch: -this.preset.spawnRangePitch },
      { yaw: 0, pitch: 0 },
      { yaw: 0, pitch: this.preset.spawnRangePitch },
    ];
    const candidate =
      fallback.find((point) => isSpawnSeparated(point, existing, minimum)) ??
      fallback[0]!;
    return {
      id: this.context.createId(),
      ...candidate,
      angularSize: this.preset.targetAngularSize,
      active: false,
    };
  }

  private chooseNextTargetId(previousId: string | null): string {
    const previous = previousId ? this.targets.get(previousId) : null;
    const candidates = [...this.targets.values()].filter(
      (target) =>
        target.id !== previousId &&
        (!previous ||
          angularDistance(target, previous) >=
            (this.preset.minimumAngularSeparation ?? 0)),
    );
    const options = candidates.length > 0
      ? candidates
      : [...this.targets.values()].filter((target) => target.id !== previousId);
    const selectedIndex = Math.min(
      options.length - 1,
      Math.floor(this.context.random() * options.length),
    );
    const selected = options[selectedIndex] ?? [...this.targets.values()][0];
    if (!selected) {
      throw new Error("Target Switching requires at least one target.");
    }
    return selected.id;
  }

  private activateTarget(targetId: string, now: number): void {
    if (this.activeTargetId) {
      const previous = this.targets.get(this.activeTargetId);
      if (previous) {
        const inactive = { ...previous, active: false };
        this.targets.set(inactive.id, inactive);
        this.context.updateTarget(inactive);
      }
    }
    const target = this.targets.get(targetId);
    if (!target) {
      return;
    }
    const active = { ...target, active: true };
    this.targets.set(active.id, active);
    this.context.updateTarget(active);
    this.activeTargetId = active.id;
    this.activeAt = now;
  }

  private clearTargets(): void {
    for (const targetId of this.targets.keys()) {
      this.context.removeTarget(targetId);
    }
    this.targets.clear();
    this.activeTargetId = null;
  }
}
