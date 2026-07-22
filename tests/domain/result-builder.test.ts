import { describe, expect, it } from "vitest";

import { buildAimTrainingResult } from "../../src/domain/ResultBuilder";

describe("buildAimTrainingResult", () => {
  it("creates a typed Grid Shot result from engine metrics", () => {
    const result = buildAimTrainingResult(
      {
        modeId: "grid-shot",
        difficulty: "normal",
        sensitivity: {
          dpi: 800,
          valorantSensitivity: 0.32,
          edpi: 256,
          calibrationMultiplier: 1,
          calibratedAt: null,
        },
      },
      { score: 200, hits: 2, misses: 1, maxCombo: 2, accuracy: 2 / 3 },
      "standard",
    );

    expect(result).toMatchObject({
      resultType: "aim",
      modeId: "grid-shot",
      difficulty: "normal",
      score: 200,
      hits: 2,
      misses: 1,
    });
    if (result.modeId !== "grid-shot") {
      throw new Error("Expected a Grid Shot result.");
    }
    expect(result.modeMetrics.hitsPerSecond).toBeCloseTo(2 / 60);
    expect(result.modeMetrics).not.toHaveProperty("averageFlickAngle");
  });
});
