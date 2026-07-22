import { describe, expect, it } from "vitest";

import { GridShotMode } from "../../src/modes/GridShotMode";
import { angularDistance } from "../../src/modes/TargetMath";
import { createModeContext } from "./helpers";

describe("GridShotMode", () => {
  it("keeps three active targets and replaces only the hit target", () => {
    const context = createModeContext("normal", [0, 0, 1, 1, 0.5, 0.5]);
    const mode = new GridShotMode(context);
    mode.initialize(0);
    const hitTarget = context.activeTargets[1];

    mode.handleShot({ targetId: hitTarget?.id ?? null }, 1_000);

    expect(context.activeTargets).toHaveLength(3);
    expect(context.removedTargetIds).toEqual([hitTarget?.id]);
    expect(context.activeTargets.map((target) => target.id)).not.toContain(
      hitTarget?.id,
    );
    expect(mode.getMetrics()).toMatchObject({ hits: 1, misses: 0 });
  });

  it("honors the hard minimum twenty-degree separation", () => {
    const context = createModeContext("hard", [0, 0, 1, 1, 0.5, 0.5]);
    const mode = new GridShotMode(context);
    mode.initialize(0);

    for (const target of context.activeTargets) {
      for (const other of context.activeTargets) {
        if (target.id !== other.id) {
          expect(angularDistance(target, other)).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });
});
