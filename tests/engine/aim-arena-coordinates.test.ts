import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { toSceneCameraYaw } from "../../src/engine/AimArenaScene";

describe("AimArenaScene coordinate conversion", () => {
  it("turns a positive logical yaw toward the right-side target", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.rotation.order = "YXZ";
    camera.rotation.y = THREE.MathUtils.degToRad(toSceneCameraYaw(15));

    const direction = camera.getWorldDirection(new THREE.Vector3());

    expect(direction.x).toBeGreaterThan(0);
  });
});
