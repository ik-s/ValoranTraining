const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const comboBonus = (combo: number): number => {
  if (combo >= 20) {
    return 30;
  }
  if (combo >= 10) {
    return 20;
  }
  if (combo >= 5) {
    return 10;
  }
  return 0;
};

export const reactionBonus = (
  reactionTimeSeconds: number,
  reactionLimitSeconds: number,
  maximumBonus: number,
): number =>
  clamp(
    maximumBonus * (1 - reactionTimeSeconds / reactionLimitSeconds),
    0,
    maximumBonus,
  );

export interface ClickScoreInput {
  basePoints: number;
  reactionTimeSeconds: number;
  reactionLimitSeconds: number;
  maxReactionBonus: number;
  comboAfterShot: number;
}

export const calculateClickScore = (input: ClickScoreInput): number =>
  input.basePoints +
  reactionBonus(
    input.reactionTimeSeconds,
    input.reactionLimitSeconds,
    input.maxReactionBonus,
  ) +
  comboBonus(input.comboAfterShot);
