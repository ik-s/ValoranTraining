import { describe, expect, it } from "vitest";

import { PointerLockController } from "../../src/engine/PointerLockController";

describe("PointerLockController", () => {
  it("falls back to standard Pointer Lock when raw input is rejected", async () => {
    const rawRequests: boolean[] = [];
    const controller = new PointerLockController(async (raw) => {
      rawRequests.push(raw);
      if (raw) {
        throw new DOMException("Unsupported", "NotSupportedError");
      }
    });

    await expect(controller.requestPointerLock()).resolves.toBe("standard");
    expect(rawRequests).toEqual([true, false]);
  });

  it("does not report raw input when a legacy request ignores raw-input options", async () => {
    const rawRequests: boolean[] = [];
    const controller = new PointerLockController((raw) => {
      rawRequests.push(raw);
    });

    await expect(controller.requestPointerLock()).resolves.toBe("standard");
    expect(rawRequests).toEqual([true]);
  });
});
