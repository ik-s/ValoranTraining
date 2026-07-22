import { describe, expect, it } from "vitest";

import { DomTrainingHud } from "../../src/ui/DomTrainingHud";

describe("DomTrainingHud", () => {
  it("explains that standard browser input cannot guarantee a VALORANT 1:1 match", () => {
    const root = document.createElement("div");
    root.innerHTML = '<span data-hud-input></span>';
    const hud = new DomTrainingHud(root);

    hud.render({
      status: "ready",
      pointerLockMode: "standard",
      remainingSeconds: 60,
      countdownSeconds: null,
      performanceWarning: false,
      metrics: {},
    });

    expect(root.textContent).toBe("STANDARD INPUT · 1:1 보장 불가");
  });
});
