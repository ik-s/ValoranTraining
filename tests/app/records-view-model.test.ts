import { describe, expect, it } from "vitest";

import { filterTrainingResults } from "../../src/ui/RecordsViewModel";
import type { AimTrainingResult } from "../../src/domain/Results";

const result = (
  modeId: AimTrainingResult["modeId"],
  difficulty: AimTrainingResult["difficulty"],
): AimTrainingResult =>
  ({
    id: modeId + difficulty,
    resultType: "aim",
    modeId,
    difficulty,
    playedAt: "2026-07-22T00:00:00.000Z",
    durationSeconds: 60,
    score: 100,
    accuracy: 1,
    hits: 1,
    misses: 0,
    maxCombo: 1,
    sensitivitySnapshot: { dpi: 800, valorantSensitivity: 0.32, edpi: 256, calibrationMultiplier: 1 },
    inputSnapshot: { pointerLockMode: "standard" },
    directionalMetrics: [],
    feedback: { strength: null, improvement: null },
    modeMetrics: {},
  }) as unknown as AimTrainingResult;

describe("filterTrainingResults", () => {
  it("filters results by both mode and difficulty", () => {
    const results = [
      result("grid-shot", "normal"),
      result("grid-shot", "hard"),
      result("micro-flick", "normal"),
    ];

    expect(filterTrainingResults(results, "grid-shot", "normal")).toEqual([
      results[0],
    ]);
  });
});
