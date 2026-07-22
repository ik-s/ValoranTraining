import { describe, expect, it } from "vitest";

import { App } from "../../src/app/App";
import type {
  GridShotResult,
  HeadshotOnlyResult,
  StrafeTrackResult,
} from "../../src/domain/Results";

const result: GridShotResult = {
  id: "result-1",
  resultType: "aim",
  modeId: "grid-shot",
  difficulty: "normal",
  playedAt: "2026-07-22T00:00:00.000Z",
  durationSeconds: 60,
  score: 11370.055,
  accuracy: 0.84,
  hits: 102,
  misses: 19,
  maxCombo: 23,
  sensitivitySnapshot: {
    dpi: 800,
    valorantSensitivity: 0.345,
    edpi: 276,
    calibrationMultiplier: 1,
  },
  inputSnapshot: { pointerLockMode: "raw" },
  directionalMetrics: [],
  modeMetrics: {
    hitsPerSecond: 1.7,
    averageTransitionTime: 0.59,
  },
};

describe("result view", () => {
  it("shows only calculated metrics with Korean explanations", () => {
    const app = new App(document.createElement("div"));
    const harness = app as unknown as {
      currentResult: GridShotResult;
      renderResult: () => string;
    };
    harness.currentResult = result;

    const markup = harness.renderResult();

    expect(markup).toContain('class="stat-grid stat-grid--three"');
    expect(markup).toContain("SCORE");
    expect(markup).toContain("점수");
    expect(markup).toContain("명중률");
    expect(markup).toContain("최고 연속 명중");
    expect(markup).toContain("초당 명중");
    expect(markup).toContain("평균 표적 전환 시간");
    expect(markup).toContain("1.70회/초");
    expect(markup).toContain("훈련 선택");
    expect(markup).not.toContain("AVERAGE FLICK ANGLE");
    expect(markup).not.toContain("feedback-grid");
    expect(markup).not.toContain("난이도 변경");
  });

  it("uses the completed session duration in the result heading", () => {
    const app = new App(document.createElement("div"));
    const harness = app as unknown as {
      currentResult: GridShotResult;
      renderResult: () => string;
    };
    harness.currentResult = { ...result, durationSeconds: 30 };

    expect(harness.renderResult()).toContain("30초 훈련 완료");
  });

  it("shows only mode-specific metrics when a mode does not record generic shots", () => {
    const app = new App(document.createElement("div"));
    const harness = app as unknown as {
      currentResult: StrafeTrackResult | HeadshotOnlyResult;
      renderResult: () => string;
    };
    const trackingResult: StrafeTrackResult = {
      ...result,
      modeId: "strafe-track",
      accuracy: null,
      hits: 0,
      misses: 0,
      maxCombo: 0,
      modeMetrics: {
        trackingAccuracy: 0.27,
        insideRatio: 0.24,
        averageAngularError: 3,
        longestContinuousTracking: 0.83,
      },
    };
    const headshotResult: HeadshotOnlyResult = {
      ...result,
      modeId: "headshot-only",
      hits: 0,
      maxCombo: 18,
      modeMetrics: {
        headHits: 31,
        headshotRatio: 0.78,
        bodyHits: 9,
        timeouts: 2,
      },
    };

    for (const trainingResult of [trackingResult, headshotResult]) {
      harness.currentResult = trainingResult;
      const markup = harness.renderResult();

      expect(markup).not.toContain("HITS<small>명중</small>");
      expect(markup).not.toContain("ACCURACY<small>명중률</small>");
      expect(markup).not.toContain("MAX COMBO<small>최고 연속 명중</small>");
    }
    harness.currentResult = trackingResult;
    expect(harness.renderResult()).toContain("추적 정확도");
    harness.currentResult = headshotResult;
    expect(harness.renderResult()).toContain("헤드샷 명중");
  });
});
