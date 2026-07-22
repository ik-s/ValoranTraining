import { describe, expect, it } from "vitest";

import { classifyDirection } from "../../src/domain/DirectionMetrics";

describe("classifyDirection", () => {
  it("classifies targets within ten degrees on both axes as center", () => {
    expect(classifyDirection(-10, 10)).toBe("center");
  });

  it("uses the larger absolute axis to classify horizontal directions", () => {
    expect(classifyDirection(-24, 9)).toBe("left");
    expect(classifyDirection(24, -9)).toBe("right");
  });

  it("uses the larger absolute axis to classify vertical directions", () => {
    expect(classifyDirection(8, 24)).toBe("up");
    expect(classifyDirection(-8, -24)).toBe("down");
  });
});
