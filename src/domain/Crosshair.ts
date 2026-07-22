import type { CrosshairSettings } from "./types";

export const DEFAULT_CROSSHAIR_SETTINGS: CrosshairSettings = {
  color: "#40E0D0",
  lineLength: 8,
  lineThickness: 2,
  centerGap: 4,
  showCenterDot: true,
  centerDotSize: 2,
};

const crosshairStyleEntries = (settings: CrosshairSettings) => [
  ["--crosshair-color", settings.color],
  ["--crosshair-line-length", settings.lineLength + "px"],
  ["--crosshair-line-thickness", settings.lineThickness + "px"],
  ["--crosshair-center-gap", settings.centerGap + "px"],
  ["--crosshair-dot-size", settings.centerDotSize + "px"],
  ["--crosshair-dot-display", settings.showCenterDot ? "block" : "none"],
] as const;

export const crosshairStyleAttribute = (settings: CrosshairSettings): string =>
  crosshairStyleEntries(settings)
    .map(([name, value]) => name + ":" + value)
    .join(";");

export const applyCrosshairStyles = (
  element: HTMLElement,
  settings: CrosshairSettings,
): void => {
  for (const [name, value] of crosshairStyleEntries(settings)) {
    element.style.setProperty(name, value);
  }
};
