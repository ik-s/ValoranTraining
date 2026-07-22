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

  it("uses fixed Strafe Track speeds for each difficulty", () => {
    expect(getDifficultyPreset("strafe-track", "easy")).toMatchObject({
      targetSpeed: { minimum: 15, maximum: 15 },
    });
    expect(getDifficultyPreset("strafe-track", "normal")).toMatchObject({
      targetSpeed: { minimum: 24, maximum: 24 },
      allowsVerticalMotion: true,
      usesShooting: false,
    });
    expect(getDifficultyPreset("strafe-track", "hard")).toMatchObject({
      targetSpeed: { minimum: 38, maximum: 38 },
    });
  });
});
