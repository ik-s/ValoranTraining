import { describe, expect, it } from "vitest";

import { App } from "../../src/app/App";
import type { TrainingSessionStatus } from "../../src/engine/SessionStateMachine";

describe("training overlay", () => {
  it("hides the lower controls while active and restores them when paused", () => {
    const root = document.createElement("div");
    const app = new App(root);
    root.innerHTML =
      '<div class="training-controls" data-training-controls></div><p class="training-help" data-training-help></p>';
    let status: TrainingSessionStatus = "countdown";
    const harness = app as unknown as {
      engine: { getStatus: () => TrainingSessionStatus };
      syncTrainingOverlay: () => void;
    };
    harness.engine = { getStatus: () => status };

    harness.syncTrainingOverlay();

    expect(
      root.querySelector("[data-training-controls]")?.classList.contains("is-hidden"),
    ).toBe(true);
    expect(
      root.querySelector("[data-training-help]")?.classList.contains("is-hidden"),
    ).toBe(true);

    status = "paused";
    harness.syncTrainingOverlay();

    expect(
      root.querySelector("[data-training-controls]")?.classList.contains("is-hidden"),
    ).toBe(false);
    expect(
      root.querySelector("[data-training-help]")?.classList.contains("is-hidden"),
    ).toBe(false);
  });
});
