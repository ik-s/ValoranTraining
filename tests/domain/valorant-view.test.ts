import { describe, expect, it } from "vitest";

import {
  VALORANT_HORIZONTAL_FOV,
  calculateValorantVerticalFov,
} from "../../src/domain/ValorantView";

describe("ValorantView", () => {
  it("keeps VALORANT's horizontal FOV at 16:9", () => {
    const aspect = 16 / 9;
    const verticalFov = calculateValorantVerticalFov(aspect);
    const horizontalFov =
      (2 * Math.atan(Math.tan((verticalFov * Math.PI) / 360) * aspect) * 180) /
      Math.PI;

    expect(VALORANT_HORIZONTAL_FOV).toBe(103);
    expect(verticalFov).toBeCloseTo(70.5, 1);
    expect(horizontalFov).toBeCloseTo(VALORANT_HORIZONTAL_FOV, 5);
  });
});
