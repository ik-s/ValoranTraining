import { describe, expect, it } from "vitest";

import { MicroFlickMode } from "../../src/modes/MicroFlickMode";
import { angularDistance } from "../../src/modes/TargetMath";
import { createModeContext } from "./helpers";

describe("MicroFlickMode", () => {
  it("spawns a single next target within the normal adjustment range", () => {
    const context = createModeContext("normal", [0.5, 0.5]);
    const mode = new MicroFlickMode(context);
    mode.initialize(0);
    const first = context.activeTargets[0];

    mode.handleShot({ targetId: first?.id ?? null }, 500);

    expect(context.activeTargets).toHaveLength(1);
    const next = context.activeTargets[0];
    expect(angularDistance(first!, next!)).toBeGreaterThanOrEqual(6);
    expect(angularDistance(first!, next!)).toBeLessThanOrEqual(14);
  });

  it("keeps targets inside the documented hard angular bounds", () => {
    const context = createModeContext("hard", [1, 1, 0.5, 0.5]);
    const mode = new MicroFlickMode(context);
    mode.initialize(0);
    const first = context.activeTargets[0];
    mode.handleShot({ targetId: first?.id ?? null }, 500);

    const current = context.activeTargets[0];
    expect(Math.abs(current?.yaw ?? 0)).toBeLessThanOrEqual(40);
    expect(Math.abs(current?.pitch ?? 0)).toBeLessThanOrEqual(22);
  });
});
