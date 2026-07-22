import { describe, expect, it } from "vitest";

import { HeadshotOnlyMode } from "../../src/modes/HeadshotOnlyMode";
import { createModeContext } from "./helpers";

describe("HeadshotOnlyMode", () => {
  it("respawns a robot after a head hit", () => {
    const context = createModeContext("normal", [0.5]);
    const mode = new HeadshotOnlyMode(context);
    mode.initialize(0);
    const robot = context.activeTargets[0];

    mode.handleShot({ targetId: robot?.id ?? null, region: "head" }, 500);

    expect(context.activeTargets).toHaveLength(1);
    expect(context.activeTargets[0]?.id).not.toBe(robot?.id);
    expect(mode.getMetrics()).toMatchObject({ headHits: 1, bodyHits: 0 });
  });

  it("penalizes a body hit while keeping the robot active", () => {
    const context = createModeContext("normal", [0.5]);
    const mode = new HeadshotOnlyMode(context);
    mode.initialize(0);
    const robot = context.activeTargets[0];

    mode.handleShot({ targetId: robot?.id ?? null, region: "body" }, 500);

    expect(context.activeTargets).toHaveLength(1);
    expect(context.activeTargets[0]?.id).toBe(robot?.id);
    expect(mode.getMetrics()).toMatchObject({ score: -50, bodyHits: 1 });
  });

  it("respawns a robot after its location hold time expires", () => {
    const context = createModeContext("hard", [0.5]);
    const mode = new HeadshotOnlyMode(context);
    mode.initialize(0);
    const robot = context.activeTargets[0];

    mode.update(1.3, 1_300);

    expect(context.activeTargets[0]?.id).not.toBe(robot?.id);
    expect(mode.getMetrics()).toMatchObject({ timeouts: 1 });
  });
});
