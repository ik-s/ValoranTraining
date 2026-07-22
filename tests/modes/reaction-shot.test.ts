import { describe, expect, it } from "vitest";

import { ReactionShotMode } from "../../src/modes/ReactionShotMode";
import { createModeContext } from "./helpers";

describe("ReactionShotMode", () => {
  it("penalizes a click while waiting as a false start", () => {
    const context = createModeContext("easy", [0]);
    const mode = new ReactionShotMode(context);
    mode.initialize(0);

    mode.handleShot({ targetId: null }, 100);

    expect(mode.getMetrics()).toMatchObject({
      score: -50,
      falseStarts: 1,
    });
    expect(context.activeTargets).toHaveLength(0);
  });

  it("shows a target after waiting and removes it after the exposure timeout", () => {
    const context = createModeContext("easy", [0]);
    const mode = new ReactionShotMode(context);
    mode.initialize(0);

    mode.update(0.8, 800);
    expect(context.activeTargets).toHaveLength(1);

    mode.update(1.5, 2_300);
    expect(context.activeTargets).toHaveLength(0);
    expect(mode.getMetrics()).toMatchObject({ timeouts: 1 });
  });
});
