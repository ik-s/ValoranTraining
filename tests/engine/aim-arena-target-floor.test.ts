import { describe, expect, it } from "vitest";

import { constrainTargetToFloor } from "../../src/engine/AimArenaScene";
import { angularSizeToWorldSize } from "../../src/modes/TargetMath";

const cameraHeight = 1.65;
const floorClearance = 0.15;

describe("AimArenaScene target floor constraint", () => {
  it("keeps the full circular target above the floor at low pitches", () => {
    const target = constrainTargetToFloor({
      id: "low-orb",
      yaw: 0,
      pitch: -20,
      angularSize: 10,
      distance: 25,
    });
    const radius = angularSizeToWorldSize(target.distance!, target.angularSize) / 2;
    const lowestPoint =
      cameraHeight + Math.sin((target.pitch * Math.PI) / 180) * target.distance! - radius;

    expect(lowestPoint).toBeGreaterThanOrEqual(floorClearance);
  });

  it("keeps the robot body above the floor at low pitches", () => {
    const target = constrainTargetToFloor({
      id: "low-robot",
      yaw: 0,
      pitch: -35,
      angularSize: 8,
      distance: 10,
      hitRegions: ["head", "body"],
    });
    const size = angularSizeToWorldSize(target.distance!, target.angularSize);
    const lowestPoint =
      cameraHeight + Math.sin((target.pitch * Math.PI) / 180) * target.distance! -
      size * 1.25;

    expect(lowestPoint).toBeGreaterThanOrEqual(floorClearance);
  });
});
