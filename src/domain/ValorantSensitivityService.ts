export const VALORANT_YAW_COEFFICIENT = 0.07;
const MIN_DPI = 100;
const MAX_DPI = 20_000;
const MIN_SENSITIVITY = 0.001;
const MAX_SENSITIVITY = 10;
const MIN_CALIBRATION = 0.5;
const MAX_CALIBRATION = 1.5;

export interface ValorantSensitivityInput {
  dpi: number;
  valorantSensitivity: number;
}

export interface SensitivityValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof ValorantSensitivityInput, string>>;
  warnings: string[];
}

export const calculateEdpi = (dpi: number, valorantSensitivity: number): number =>
  dpi * valorantSensitivity;

export const clampCalibrationMultiplier = (value: number): number =>
  Math.min(MAX_CALIBRATION, Math.max(MIN_CALIBRATION, value));

export const calculateRotationDelta = (
  mouseMovementCount: number,
  valorantSensitivity: number,
  calibrationMultiplier: number,
): number =>
  mouseMovementCount *
  VALORANT_YAW_COEFFICIENT *
  valorantSensitivity *
  clampCalibrationMultiplier(calibrationMultiplier);

const hasAtMostFourDecimalPlaces = (value: number): boolean => {
  const normalized = value.toString().toLowerCase();
  if (normalized.includes("e")) {
    return false;
  }
  const decimalPart = normalized.split(".")[1];
  return !decimalPart || decimalPart.length <= 4;
};

export const validateValorantSensitivity = (
  input: ValorantSensitivityInput,
): SensitivityValidationResult => {
  const errors: SensitivityValidationResult["errors"] = {};
  if (
    !Number.isInteger(input.dpi) ||
    input.dpi < MIN_DPI ||
    input.dpi > MAX_DPI
  ) {
    errors.dpi = "DPI는 100에서 20,000 사이의 정수여야 합니다.";
  }

  if (
    !Number.isFinite(input.valorantSensitivity) ||
    input.valorantSensitivity < MIN_SENSITIVITY ||
    input.valorantSensitivity > MAX_SENSITIVITY ||
    !hasAtMostFourDecimalPlaces(input.valorantSensitivity)
  ) {
    errors.valorantSensitivity =
      "감도는 0.001에서 10 사이이며 소수점 4자리까지 입력할 수 있습니다.";
  }

  const warnings: string[] = [];
  if (Object.keys(errors).length === 0) {
    const edpi = calculateEdpi(input.dpi, input.valorantSensitivity);
    if (edpi < 100 || edpi > 1_000) {
      warnings.push("일반적인 범위를 벗어난 eDPI입니다. 실제 게임 설정을 확인해주세요.");
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};
