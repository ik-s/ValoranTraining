import type { DirectionalMetric, TrainingFeedback } from "./Results";

export interface FeedbackInput {
  metricName: string;
  directionalMetrics: DirectionalMetric[];
}

const eligibleMetrics = (metrics: DirectionalMetric[]): DirectionalMetric[] =>
  metrics.filter((metric) => metric.attempts >= 5);

export const generateTrainingFeedback = (
  input: FeedbackInput,
): TrainingFeedback => {
  const eligible = eligibleMetrics(input.directionalMetrics);
  if (eligible.length === 0) {
    return { strength: null, improvement: null };
  }

  const strongest = eligible.reduce((best, metric) =>
    metric.successRate > best.successRate ? metric : best,
  );
  const weakest = eligible.reduce((worst, metric) =>
    metric.successRate < worst.successRate ? metric : worst,
  );

  return {
    strength:
      strongest.successRate === weakest.successRate
        ? null
        : strongest.zone.toUpperCase() +
          " 구역의 " +
          input.metricName +
          "이 가장 좋습니다.",
    improvement:
      strongest.successRate === weakest.successRate
        ? null
        : weakest.zone.toUpperCase() +
          " 구역을 먼저 보완하세요. " +
          input.metricName +
          "이 가장 낮습니다.",
  };
};
