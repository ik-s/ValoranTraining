import { getDifficultyPreset } from "../domain/DifficultyPresets";
import { calculateClickScore } from "../domain/Scoring";
import type {
  HitResult,
  TrainingMode,
  TrainingModeContext,
  TrainingTarget,
} from "./TrainingMode";

const randomBetween = (random: () => number, minimum: number, maximum: number) =>
  minimum + random() * (maximum - minimum);

type ReactionState = "waiting" | "visible";

export class ReactionShotMode implements TrainingMode {
  private readonly preset;
  private state: ReactionState = "waiting";
  private target: TrainingTarget | null = null;
  private waitEndsAt = 0;
  private visibleEndsAt = 0;
  private visibleAt = 0;
  private score = 0;
  private hits = 0;
  private misses = 0;
  private combo = 0;
  private maxCombo = 0;
  private falseStarts = 0;
  private timeouts = 0;
  private reactionTimes: number[] = [];

  constructor(private readonly context: TrainingModeContext) {
    this.preset = getDifficultyPreset("reaction-shot", context.difficulty);
  }

  initialize(now: number): void {
    this.beginWaiting(now);
  }

  update(_deltaTimeSeconds: number, now: number): void {
    if (this.state === "waiting" && now >= this.waitEndsAt) {
      this.showTarget(now);
      return;
    }
    if (this.state === "visible" && now >= this.visibleEndsAt) {
      this.removeCurrentTarget();
      this.timeouts += 1;
      this.combo = 0;
      this.beginWaiting(now);
    }
  }

  handleShot(hit: HitResult, now: number): void {
    if (this.state === "waiting") {
      this.falseStarts += 1;
      this.score -= 50;
      this.combo = 0;
      this.beginWaiting(now);
      return;
    }

    if (!this.target || hit.targetId !== this.target.id) {
      this.misses += 1;
      this.combo = 0;
      return;
    }

    const reactionSeconds = Math.max(0, (now - this.visibleAt) / 1_000);
    this.removeCurrentTarget();
    this.hits += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.reactionTimes.push(reactionSeconds);
    this.score += calculateClickScore({
      basePoints: 100,
      reactionTimeSeconds: reactionSeconds,
      reactionLimitSeconds: this.preset.exposureTime ?? 1,
      maxReactionBonus: 50,
      comboAfterShot: this.combo,
    });
    this.beginWaiting(now);
  }

  getMetrics(): Record<string, number | null> {
    const shots = this.hits + this.misses;
    const sortedReactions = [...this.reactionTimes].sort((a, b) => a - b);
    const middle = Math.floor(sortedReactions.length / 2);
    const median =
      sortedReactions.length === 0
        ? null
        : sortedReactions.length % 2 === 0
          ? (sortedReactions[middle - 1]! + sortedReactions[middle]!) / 2
          : sortedReactions[middle]!;
    return {
      score: this.score,
      hits: this.hits,
      misses: this.misses,
      accuracy: shots === 0 ? 0 : this.hits / shots,
      maxCombo: this.maxCombo,
      falseStarts: this.falseStarts,
      timeouts: this.timeouts,
      averageReactionTime:
        this.reactionTimes.length === 0
          ? null
          : this.reactionTimes.reduce((sum, time) => sum + time, 0) /
            this.reactionTimes.length,
      medianReactionTime: median,
    };
  }

  dispose(): void {
    this.removeCurrentTarget();
  }

  private beginWaiting(now: number): void {
    const delay = this.preset.spawnDelay;
    if (!delay) {
      throw new Error("Reaction Shot requires a spawn-delay range.");
    }
    this.state = "waiting";
    this.target = null;
    this.waitEndsAt = now + randomBetween(this.context.random, delay.minimum, delay.maximum) * 1_000;
  }

  private showTarget(now: number): void {
    const target: TrainingTarget = {
      id: this.context.createId(),
      yaw: randomBetween(this.context.random, -this.preset.spawnRangeYaw, this.preset.spawnRangeYaw),
      pitch: randomBetween(this.context.random, -this.preset.spawnRangePitch, this.preset.spawnRangePitch),
      angularSize: this.preset.targetAngularSize,
    };
    this.target = target;
    this.visibleAt = now;
    this.visibleEndsAt = now + (this.preset.exposureTime ?? 1) * 1_000;
    this.state = "visible";
    this.context.addTarget(target);
  }

  private removeCurrentTarget(): void {
    if (this.target) {
      this.context.removeTarget(this.target.id);
      this.target = null;
    }
  }
}
