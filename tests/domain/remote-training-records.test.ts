import { describe, expect, it } from "vitest";

import { parseRemoteTrainingRun } from "../../src/domain/RemoteTrainingRecords";

const validRun = {
  id: "d2f0bd4e-6b27-440e-a4ea-4841ca9c16bc",
  result_data: {
    id: "d2f0bd4e-6b27-440e-a4ea-4841ca9c16bc",
    resultType: "aim",
    modeId: "grid-shot",
    difficulty: "normal",
    playedAt: "2026-07-23T00:00:00.000Z",
    durationSeconds: 60,
    score: 12345,
    accuracy: 0.83,
    hits: 42,
    misses: 8,
    maxCombo: 17,
    sensitivitySnapshot: {
      dpi: 800,
      valorantSensitivity: 0.32,
      edpi: 256,
      calibrationMultiplier: 1,
    },
    inputSnapshot: { pointerLockMode: "raw" },
    directionalMetrics: [],
    modeMetrics: { hitsPerSecond: 0.7, averageTransitionTime: 0.4 },
  },
};

describe("parseRemoteTrainingRun", () => {
  it("maps a safe remote row to the existing result contract", () => {
    expect(parseRemoteTrainingRun(validRun)).toMatchObject({
      id: validRun.id,
      modeId: "grid-shot",
      score: 12345,
      modeMetrics: { hitsPerSecond: 0.7 },
    });
  });

  it("rejects payloads that could not safely render as results", () => {
    expect(
      parseRemoteTrainingRun({
        ...validRun,
        result_data: { ...validRun.result_data, modeId: "not-a-mode" },
      }),
    ).toBeNull();
    expect(
      parseRemoteTrainingRun({
        ...validRun,
        result_data: { ...validRun.result_data, durationSeconds: 45 },
      }),
    ).toBeNull();
    expect(
      parseRemoteTrainingRun({
        ...validRun,
        result_data: {
          ...validRun.result_data,
          modeMetrics: { hitsPerSecond: "fast" },
        },
      }),
    ).toBeNull();
  });
});
