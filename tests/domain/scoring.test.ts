import { describe, expect, it } from "vitest";

import {
  calculateClickScore,
  comboBonus,
  reactionBonus,
} from "../../src/domain/Scoring";

describe("scoring", () => {
  it("uses the documented combo tiers", () => {
    expect(comboBonus(4)).toBe(0);
    expect(comboBonus(5)).toBe(10);
    expect(comboBonus(10)).toBe(20);
    expect(comboBonus(20)).toBe(30);
  });

  it("rewards a faster reaction without exceeding the maximum", () => {
    expect(reactionBonus(0, 1, 50)).toBe(50);
    expect(reactionBonus(1, 1, 50)).toBe(0);
    expect(reactionBonus(2, 1, 50)).toBe(0);
  });

  it("combines base hit, speed, and combo score", () => {
    expect(
      calculateClickScore({
        basePoints: 100,
        reactionTimeSeconds: 0.5,
        reactionLimitSeconds: 1,
        maxReactionBonus: 50,
        comboAfterShot: 10,
      }),
    ).toBe(145);
  });
});
