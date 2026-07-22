export type TrainingSessionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "countdown"
  | "running"
  | "paused"
  | "completing"
  | "completed"
  | "aborted"
  | "error";

export class SessionStateMachine {
  private status: TrainingSessionStatus = "idle";

  prepare(): void {
    this.status = "ready";
  }

  beginCountdown(): void {
    this.status = "countdown";
  }

  startRunning(): void {
    this.status = "running";
  }

  pause(): void {
    if (this.status === "countdown" || this.status === "running") {
      this.status = "paused";
    }
  }

  resumeCountdown(): void {
    if (this.status === "paused") {
      this.status = "countdown";
    }
  }

  complete(): void {
    this.status = "completed";
  }

  abort(): void {
    this.status = "aborted";
  }

  fail(): void {
    this.status = "error";
  }

  getStatus(): TrainingSessionStatus {
    return this.status;
  }
}
