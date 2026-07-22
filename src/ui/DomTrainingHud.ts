import type { TrainingHudAdapter, TrainingHudState } from "../engine/TrainingHudAdapter";

export class DomTrainingHud implements TrainingHudAdapter {
  constructor(private readonly root: HTMLElement) {}

  render(state: TrainingHudState): void {
    const time = this.root.querySelector<HTMLElement>("[data-hud-time]");
    const score = this.root.querySelector<HTMLElement>("[data-hud-score]");
    const accuracy = this.root.querySelector<HTMLElement>("[data-hud-accuracy]");
    const combo = this.root.querySelector<HTMLElement>("[data-hud-combo]");
    const countdown = this.root.querySelector<HTMLElement>("[data-hud-countdown]");
    const input = this.root.querySelector<HTMLElement>("[data-hud-input]");
    const performance = this.root.querySelector<HTMLElement>("[data-hud-performance]");
    if (time) {
      time.textContent = String(Math.ceil(state.remainingSeconds)).padStart(2, "0");
      time.classList.toggle("is-warning", state.remainingSeconds <= 10);
    }
    if (score) {
      score.textContent = String(Math.round(state.metrics.score ?? 0));
    }
    if (accuracy) {
      const value = state.metrics.trackingAccuracy ?? state.metrics.accuracy ?? 0;
      accuracy.textContent = Math.round(value * 100) + "%";
    }
    if (combo) {
      combo.textContent = String(state.metrics.maxCombo ?? 0);
    }
    if (countdown) {
      countdown.textContent =
        state.countdownSeconds === null
          ? state.status === "paused"
            ? "PAUSED"
            : ""
          : String(state.countdownSeconds);
    }
    if (input) {
      input.textContent =
        state.pointerLockMode === "raw"
          ? "RAW INPUT ACTIVE"
          : state.pointerLockMode === "standard"
            ? "STANDARD INPUT ACTIVE"
            : "MOUSE LOCK READY";
    }
    if (performance) {
      performance.classList.toggle("is-hidden", !state.performanceWarning);
    }
  }

  dispose(): void {}
}
