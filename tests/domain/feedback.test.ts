import { describe, expect, it } from "vitest";

import { generateTrainingFeedback } from "../../src/domain/FeedbackService";

describe("generateTrainingFeedback", () => {
  it("selects one strongest and one first-improvement direction with enough samples", () => {
    const feedback = generateTrainingFeedback({
      metricName: "명중률",
      directionalMetrics: [
        { zone: "left", attempts: 6, successes: 6, successRate: 1 },
        { zone: "right", attempts: 8, successes: 2, successRate: 0.25 },
        { zone: "up", attempts: 3, successes: 0, successRate: 0 },
      ],
    });

    expect(feedback.strength).toContain("LEFT");
    expect(feedback.improvement).toContain("RIGHT");
    expect(feedback.improvement).not.toContain("UP");
  });
});
