export class SessionClock {
  private startedAt: number | null = null;
  private pausedAt: number | null = null;
  private pausedDurationMilliseconds = 0;

  constructor(private readonly durationSeconds: number) {}

  start(now: number): void {
    this.startedAt = now;
    this.pausedAt = null;
    this.pausedDurationMilliseconds = 0;
  }

  pause(now: number): void {
    if (this.startedAt !== null && this.pausedAt === null) {
      this.pausedAt = now;
    }
  }

  resume(now: number): void {
    if (this.pausedAt !== null) {
      this.pausedDurationMilliseconds += now - this.pausedAt;
      this.pausedAt = null;
    }
  }

  elapsedSeconds(now: number): number {
    if (this.startedAt === null) {
      return 0;
    }
    const activePause =
      this.pausedAt === null ? 0 : Math.max(0, now - this.pausedAt);
    const elapsedMilliseconds =
      now - this.startedAt - this.pausedDurationMilliseconds - activePause;
    return Math.max(0, elapsedMilliseconds / 1_000);
  }

  remainingSeconds(now: number): number {
    return Math.max(0, this.durationSeconds - this.elapsedSeconds(now));
  }

  isComplete(now: number): boolean {
    return this.startedAt !== null && this.elapsedSeconds(now) >= this.durationSeconds;
  }
}
