import { describe, expect, it } from "vitest";

import {
  TRAINING_SENSITIVITY_OFFSET,
  VALORANT_YAW_COEFFICIENT,
  calculateEdpi,
  calculateEffectiveTrainingSensitivity,
  calculateRotationDelta,
  clampCalibrationMultiplier,
  validateValorantSensitivity,
} from "../../src/domain/ValorantSensitivityService";

describe("ValorantSensitivityService", () => {
  it("calculates eDPI from DPI and VALORANT sensitivity", () => {
    expect(calculateEdpi(800, 0.32)).toBe(256);
  });

  it("adds the hidden training offset without changing the displayed sensitivity", () => {
    const displayedSensitivity = 0.24;

    expect(TRAINING_SENSITIVITY_OFFSET).toBe(0.19);
    expect(calculateEffectiveTrainingSensitivity(displayedSensitivity)).toBe(0.43);
    expect(displayedSensitivity).toBe(0.24);
  });

  it("rejects DPI outside the supported integer range", () => {
    const result = validateValorantSensitivity({
      dpi: 99,
      valorantSensitivity: 0.32,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.dpi).toContain("100");
  });

  it("rejects sensitivity with more than four decimal places", () => {
    const result = validateValorantSensitivity({
      dpi: 800,
      valorantSensitivity: 0.12345,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.valorantSensitivity).toContain("4");
  });

  it("keeps unusual but valid sensitivity values available with a warning", () => {
    const result = validateValorantSensitivity({
      dpi: 20_000,
      valorantSensitivity: 10,
    });

    expect(result.isValid).toBe(true);
    expect(result.warnings).not.toHaveLength(0);
  });

  it("limits calibration to the documented range", () => {
    expect(clampCalibrationMultiplier(0.1)).toBe(0.5);
    expect(clampCalibrationMultiplier(1.75)).toBe(1.5);
    expect(clampCalibrationMultiplier(1.23)).toBe(1.23);
  });

  it("uses the centralized yaw coefficient for rotation", () => {
    expect(calculateRotationDelta(100, 0.32, 1.1)).toBe(
      100 * VALORANT_YAW_COEFFICIENT * 0.32 * 1.1,
    );
  });
});
