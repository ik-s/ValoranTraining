import { describe, expect, it } from "vitest";

import { CameraController } from "../../src/engine/CameraController";
import { VALORANT_YAW_COEFFICIENT } from "../../src/domain/ValorantSensitivityService";

describe("CameraController", () => {
  it("applies the centralized VALORANT sensitivity formula to yaw", () => {
    const controller = new CameraController(0.32, 1);

    controller.applyMouseDelta(100, 0);

    expect(controller.getRotation().yaw).toBe(
      100 * VALORANT_YAW_COEFFICIENT * 0.32,
    );
  });

  it("clamps pitch so the camera cannot flip vertically", () => {
    const controller = new CameraController(10, 1);

    controller.applyMouseDelta(0, 100_000);

    expect(controller.getRotation().pitch).toBeGreaterThanOrEqual(-89);
    expect(controller.getRotation().pitch).toBeLessThanOrEqual(89);
  });
});
