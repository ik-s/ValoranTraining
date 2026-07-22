import { describe, expect, it } from "vitest";

import {
  angularDistance,
  angularSizeToWorldSize,
  isSpawnSeparated,
} from "../../src/modes/TargetMath";

describe("target math", () => {
  it("calculates angular distance across yaw and pitch", () => {
    expect(angularDistance({ yaw: 0, pitch: 0 }, { yaw: 12, pitch: 16 })).toBe(
      20,
    );
  });

  it("rejects a candidate that is too close to an existing target", () => {
    const existing = [{ id: "one", yaw: 0, pitch: 0, angularSize: 3 }];

    expect(
      isSpawnSeparated({ yaw: 10, pitch: 0 }, existing, 12),
    ).toBe(false);
    expect(
      isSpawnSeparated({ yaw: 12, pitch: 0 }, existing, 12),
    ).toBe(true);
  });

  it("converts an angular target size to a world size at its distance", () => {
    expect(angularSizeToWorldSize(10, 10)).toBeCloseTo(1.75, 2);
  });
});
