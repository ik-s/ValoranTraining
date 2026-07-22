import type { Difficulty } from "../domain/types";

export interface AngularPosition {
  yaw: number;
  pitch: number;
}

export interface TrainingTarget extends AngularPosition {
  id: string;
  angularSize: number;
  distance?: number;
  active?: boolean;
  hitRegions?: Array<"head" | "body">;
}

export interface HitResult {
  targetId: string | null;
  region?: "head" | "body";
}

export interface TrainingModeContext {
  difficulty: Difficulty;
  random: () => number;
  createId: () => string;
  addTarget: (target: TrainingTarget) => void;
  updateTarget: (target: TrainingTarget) => void;
  removeTarget: (targetId: string) => void;
}

export interface TrainingMode {
  initialize(now: number): void;
  update(deltaTimeSeconds: number, now: number): void;
  handleShot(hit: HitResult, now: number): void;
  getMetrics(): Record<string, number | null>;
  dispose(): void;
}
