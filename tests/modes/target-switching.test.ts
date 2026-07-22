import { describe, expect, it } from "vitest";

import { TargetSwitchingMode } from "../../src/modes/TargetSwitchingMode";
import { createModeContext } from "./helpers";

describe("TargetSwitchingMode", () => {
  it("keeps the configured number of targets with exactly one active", () => {
    const context = createModeContext("normal", [0, 0, 1, 1, 0.5, 0.5]);
    const mode = new TargetSwitchingMode(context);
    mode.initialize(0);

    expect(context.activeTargets).toHaveLength(5);
    expect(context.activeTargets.filter((target) => target.active)).toHaveLength(1);
  });

  it("activates a different target after a correct hit", () => {
    const context = createModeContext("normal", [0, 0, 1, 1, 0.5, 0.5]);
    const mode = new TargetSwitchingMode(context);
    mode.initialize(0);
    const firstActive = context.activeTargets.find((target) => target.active);

    mode.handleShot({ targetId: firstActive?.id ?? null }, 1_000);

    const nextActive = context.activeTargets.find((target) => target.active);
    expect(nextActive?.id).not.toBe(firstActive?.id);
    expect(mode.getMetrics()).toMatchObject({ hits: 1, wrongTargetHits: 0 });
  });

  it("penalizes an inactive target hit and resets the combo", () => {
    const context = createModeContext("normal", [0, 0, 1, 1, 0.5, 0.5]);
    const mode = new TargetSwitchingMode(context);
    mode.initialize(0);
    const inactive = context.activeTargets.find((target) => !target.active);

    mode.handleShot({ targetId: inactive?.id ?? null }, 1_000);

    expect(mode.getMetrics()).toMatchObject({
      score: -30,
      wrongTargetHits: 1,
      maxCombo: 0,
    });
  });
});
