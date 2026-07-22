import { describe, expect, it } from "vitest";

import { getDifficultyPreset } from "../../src/domain/DifficultyPresets";

describe("getDifficultyPreset", () => {
  it("returns Grid Shot hard settings from the approved difficulty table", () => {
    expect(getDifficultyPreset("grid-shot", "hard")).toMatchObject({
      targetAngularSize: 2.3,
      spawnRangeYaw: 65,
      spawnRangePitch: 30,
      minimumAngularSeparation: 20,
      simultaneousTargets: 3,
    });
  });

  it("marks Strafe Track as a non-shooting moving mode", () => {
    expect(getDifficultyPreset("strafe-track", "normal")).toMatchObject({
      targetSpeed: { minimum: 20, maximum: 28 },
      allowsVerticalMotion: true,
      usesShooting: false,
    });
  });
});
