import { describe, expect, it } from "vitest";

import { StrafeTrackMode } from "../../src/modes/StrafeTrackMode";
import { createModeContext } from "./helpers";

describe("StrafeTrackMode", () => {
  it("moves with delta time and reverses without leaving the configured range", () => {
    const context = createModeContext("easy", [0.5]);
    const mode = new StrafeTrackMode(context);
    mode.initialize(0);
    const initialYaw = context.activeTargets[0]?.yaw;

    mode.update(1, 1_000);
    expect(context.activeTargets[0]?.yaw).not.toBe(initialYaw);

    mode.update(10, 11_000);
    expect(Math.abs(context.activeTargets[0]?.yaw ?? 0)).toBeLessThanOrEqual(30);
  });

  it("summarizes tracking frames without retaining them in the result", () => {
    const context = createModeContext("easy", [0.5]);
    const mode = new StrafeTrackMode(context);
    mode.initialize(0);
    mode.recordTrackingFrame({
      timestamp: 0,
      angularError: 0,
      isInsideTarget: true,
      targetSpeed: 12,
      targetDirection: "right",
    });
    mode.recordTrackingFrame({
      timestamp: 100,
      angularError: 10,
      isInsideTarget: false,
      targetSpeed: 12,
      targetDirection: "right",
    });

    expect(mode.getMetrics()).toMatchObject({
      insideRatio: 0.5,
      averageAngularError: 5,
    });
  });
});
