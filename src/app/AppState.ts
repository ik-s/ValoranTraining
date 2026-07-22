export const appScreens = [
  "home",
  "training-select",
  "sensitivity-settings",
  "sensitivity-calibration",
  "crosshair-settings",
  "records",
  "training",
  "result",
] as const;

export type AppScreen = (typeof appScreens)[number];

export const screenLabels: Record<AppScreen, string> = {
  home: "TRAINING",
  "training-select": "훈련 선택",
  "sensitivity-settings": "감도 설정",
  "sensitivity-calibration": "360° 보정",
  "crosshair-settings": "크로스헤어",
  records: "RECORDS",
  training: "훈련 중",
  result: "결과",
};
