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

export class HeadshotOnlyMode implements TrainingMode {
  private readonly preset;
  private target: TrainingTarget | null = null;
  private expiresAt = 0;
  private appearedAt = 0;
  private score = 0;
  private headHits = 0;
  private bodyHits = 0;
  private emptyMisses = 0;
  private timeouts = 0;
  private combo = 0;
  private maxCombo = 0;
  private headHitTimes: number[] = [];

  constructor(private readonly context: TrainingModeContext) {
    this.preset = getDifficultyPreset("headshot-only", context.difficulty);
  }

  initialize(now: number): void {
    this.spawnRobot(now);
  }

  update(_deltaTimeSeconds: number, now: number): void {
    if (this.target && now >= this.expiresAt) {
      this.context.removeTarget(this.target.id);
      this.target = null;
      this.timeouts += 1;
      this.combo = 0;
      this.spawnRobot(now);
    }
  }

  handleShot(hit: HitResult, now: number): void {
    if (!this.target || hit.targetId !== this.target.id) {
      this.emptyMisses += 1;
      this.combo = 0;
      return;
    }
    if (hit.region === "body") {
      this.bodyHits += 1;
      this.score -= 50;
      this.combo = 0;
      return;
    }
    if (hit.region !== "head") {
      this.emptyMisses += 1;
      this.combo = 0;
      return;
    }

    const reactionSeconds = Math.max(0, (now - this.appearedAt) / 1_000);
    this.context.removeTarget(this.target.id);
    this.target = null;
    this.headHits += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.headHitTimes.push(reactionSeconds);
    this.score += calculateClickScore({
      basePoints: 120,
      reactionTimeSeconds: reactionSeconds,
      reactionLimitSeconds: this.preset.locationHoldTime ?? 2,
      maxReactionBonus: 50,
      comboAfterShot: this.combo,
    });
    this.spawnRobot(now);
  }

  getMetrics(): Record<string, number | null> {
    const totalShots = this.headHits + this.bodyHits + this.emptyMisses;
    const robotHits = this.headHits + this.bodyHits;
    return {
      score: this.score,
      headHits: this.headHits,
      bodyHits: this.bodyHits,
      emptyMisses: this.emptyMisses,
      timeouts: this.timeouts,
      maxCombo: this.maxCombo,
      accuracy: totalShots === 0 ? 0 : this.headHits / totalShots,
      headshotRatio: robotHits === 0 ? null : this.headHits / robotHits,
      averageHeadHitTime:
        this.headHitTimes.length === 0
          ? null
          : this.headHitTimes.reduce((sum, time) => sum + time, 0) /
            this.headHitTimes.length,
    };
  }

  dispose(): void {
    if (this.target) {
      this.context.removeTarget(this.target.id);
      this.target = null;
    }
  }

  private spawnRobot(now: number): void {
    const target: TrainingTarget = {
      id: this.context.createId(),
      yaw: randomBetween(this.context.random, -this.preset.spawnRangeYaw, this.preset.spawnRangeYaw),
      pitch: randomBetween(this.context.random, -this.preset.spawnRangePitch, this.preset.spawnRangePitch),
      angularSize: this.preset.targetAngularSize,
      distance: this.context.difficulty === "easy" ? 10 : this.context.difficulty === "normal" ? 16 : 24,
      hitRegions: ["head", "body"],
    };
    this.target = target;
    this.appearedAt = now;
    this.expiresAt = now + (this.preset.locationHoldTime ?? 2) * 1_000;
    this.context.addTarget(target);
  }
}
