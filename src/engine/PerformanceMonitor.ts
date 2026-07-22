const SAMPLE_COUNT = 30;
const TARGET_FRAME_SECONDS = 1 / 50;

export class PerformanceMonitor {
  private readonly samples: number[] = [];

  recordFrame(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }
    this.samples.push(deltaSeconds);
    if (this.samples.length > SAMPLE_COUNT) {
      this.samples.shift();
    }
  }

  isBelowTarget(): boolean {
    if (this.samples.length < SAMPLE_COUNT) {
      return false;
    }
    const average = this.samples.reduce((total, sample) => total + sample, 0) / this.samples.length;
    return average > TARGET_FRAME_SECONDS;
  }

  reset(): void {
    this.samples.length = 0;
  }
}
