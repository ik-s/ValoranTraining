import { describe, expect, it } from "vitest";

import { App } from "../../src/app/App";
import type { GridShotResult } from "../../src/domain/Results";

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
});
