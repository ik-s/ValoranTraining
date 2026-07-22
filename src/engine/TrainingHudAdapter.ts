import type { PointerLockMode } from "./PointerLockController";
import type { TrainingSessionStatus } from "./SessionStateMachine";

export interface TrainingHudState {
  status: TrainingSessionStatus;
  pointerLockMode: PointerLockMode;
  remainingSeconds: number;
  countdownSeconds: number | null;
  performanceWarning: boolean;
  metrics: Record<string, number | null>;
}

export interface TrainingHudAdapter {
  render(state: TrainingHudState): void;
  dispose(): void;
}
