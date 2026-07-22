import { beforeEach, describe, expect, it } from "vitest";

import { StorageService } from "../../src/domain/StorageService";
import type { GridShotResult } from "../../src/domain/Results";

const makeResult = (
  score: number,
  id: string = crypto.randomUUID(),
): GridShotResult => ({
  id,
  resultType: "aim",
  modeId: "grid-shot",
  difficulty: "normal",
  playedAt: "2026-07-22T00:00:00.000Z",
  durationSeconds: 60,
  score,
  accuracy: 0.8,
  hits: 8,
  misses: 2,
  maxCombo: 4,
  sensitivitySnapshot: {
    dpi: 800,
    valorantSensitivity: 0.32,
    edpi: 256,
    calibrationMultiplier: 1,
  },
  inputSnapshot: { pointerLockMode: "standard" },
  directionalMetrics: [],
  feedback: { strength: null, improvement: null },
  modeMetrics: {
    hitsPerSecond: 0.13,
    averageTransitionTime: 0.45,
    averageFlickAngle: 20,
  },
});

describe("StorageService", () => {
  beforeEach(() => localStorage.clear());

  it("keeps only ten recent records for a mode and difficulty", () => {
    const storage = new StorageService(localStorage);
    for (let index = 0; index < 11; index += 1) {
      storage.record(makeResult(index, String(index)));
    }

    const records = storage.load().records.aim.recent["grid-shot:normal"];
    expect(records).toHaveLength(10);
    expect(records[0]?.score).toBe(10);
    expect(records.at(-1)?.score).toBe(1);
  });

  it("updates a personal best only when a higher score is recorded", () => {
    const storage = new StorageService(localStorage);
    storage.record(makeResult(200, "best"));
    storage.record(makeResult(150, "lower"));

    expect(
      storage.load().records.aim.personalBests["grid-shot:normal"]?.id,
    ).toBe("best");
  });

  it("recovers defaults when the saved JSON is malformed", () => {
    localStorage.setItem("valorant-aim-trainer:data", "{invalid");

    expect(new StorageService(localStorage).load()).toMatchObject({
      version: 1,
      sensitivity: null,
      lastSelection: null,
    });
  });

  it("clears records without clearing saved sensitivity", () => {
    const storage = new StorageService(localStorage);
    storage.saveSensitivity({
      dpi: 800,
      valorantSensitivity: 0.32,
      edpi: 256,
      calibrationMultiplier: 1,
      calibratedAt: null,
    });
    storage.record(makeResult(100));

    storage.clearRecords();

    const data = storage.load();
    expect(data.sensitivity?.edpi).toBe(256);
    expect(data.records.aim.recent).toEqual({});
    expect(data.records.aim.personalBests).toEqual({});
  });

  it("persists updated crosshair settings", () => {
    const storage = new StorageService(localStorage);

    storage.saveCrosshair({
      color: "#ff4655",
      lineLength: 10,
      lineThickness: 2,
      centerGap: 4,
      showCenterDot: true,
      centerDotSize: 2,
    });

    expect(storage.load().crosshair.color).toBe("#ff4655");
  });

  it("normalizes legacy calibration values to the fixed default", () => {
    const storage = new StorageService(localStorage);
    storage.saveSensitivity({
      dpi: 800,
      valorantSensitivity: 0.32,
      edpi: 256,
      calibrationMultiplier: 0.82,
      calibratedAt: "2026-07-22T00:00:00.000Z",
    });

    expect(storage.load().sensitivity).toMatchObject({
      calibrationMultiplier: 1,
      calibratedAt: null,
    });
  });

  it("reports a failed write so the UI can warn without losing the session", () => {
    const unavailableStorage: Storage = {
      get length() {
        return 0;
      },
      clear: () => undefined,
      getItem: () => null,
      key: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      },
    };
    const storage = new StorageService(unavailableStorage);

    expect(storage.saveCrosshair(storage.load().crosshair)).toBe(false);
  });
});
