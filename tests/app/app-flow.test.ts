import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";
import { StorageService } from "../../src/domain/StorageService";
import { TrainingEngine } from "../../src/engine/TrainingEngine";

const mountApp = (): { app: App; root: HTMLDivElement } => {
  const root = document.createElement("div");
  document.body.append(root);
  const app = new App(root);
  app.mount();
  return { app, root };
};

describe("App flows", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("selects the mode that was clicked", () => {
    const { root } = mountApp();
    const microFlick = root.querySelector<HTMLButtonElement>(
      '[data-action="select-mode"][data-mode="micro-flick"]',
    );

    microFlick!.click();

    expect(root.querySelector(".selection-summary h2")?.textContent).toBe(
      "MICRO FLICK",
    );
  });

  it("keeps back navigation inside the active panel and sends the brand home", () => {
    const { root } = mountApp();
    root.querySelector<HTMLButtonElement>(
      '[data-screen="sensitivity-settings"]',
    )!.click();

    expect(root.querySelector(".topbar .nav-back")).toBeNull();
    const panelHeading = root.querySelector(".panel-heading");
    expect(panelHeading?.firstElementChild?.classList.contains("panel-back")).toBe(true);

    root.querySelector<HTMLAnchorElement>(".brand")!.click();

    expect(root.querySelector(".hero-panel")).not.toBeNull();
  });

  it("separates the training start action from difficulty controls", () => {
    const { root } = mountApp();
    root.querySelector<HTMLButtonElement>(
      '[data-action="select-mode"][data-mode="micro-flick"]',
    )!.click();

    expect(root.querySelector(".training-select-panel")).not.toBeNull();
    expect(root.querySelector(".training-ready-button")).not.toBeNull();
  });

  it("shows a difficulty summary and updates the selected training duration", () => {
    const { root } = mountApp();
    root.querySelector<HTMLButtonElement>(
      '[data-action="select-mode"][data-mode="grid-shot"]',
    )!.click();
    root.querySelector<HTMLButtonElement>(
      '[data-action="select-difficulty"][data-difficulty="hard"]',
    )!.click();

    expect(root.querySelector("[data-difficulty-summary]")?.textContent).toContain(
      "작은 표적",
    );

    root.querySelector<HTMLButtonElement>(
      '[data-action="select-duration"][data-duration="30"]',
    )!.click();

    expect(
      root.querySelector('[data-duration="30"]')?.classList.contains("is-selected"),
    ).toBe(true);
    expect(root.querySelector(".training-ready-button")?.textContent).toBe(
      "30초 훈련 준비",
    );
  });

  it("prepares a thirty-second session when 30 seconds is selected", () => {
    new StorageService(localStorage).saveSensitivity({
      dpi: 800,
      valorantSensitivity: 0.32,
      edpi: 256,
      calibrationMultiplier: 1,
      calibratedAt: null,
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as WebGLRenderingContext,
    );
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    const prepare = vi
      .spyOn(TrainingEngine.prototype, "prepare")
      .mockImplementation(() => undefined);
    const { root } = mountApp();

    root.querySelector<HTMLButtonElement>('[data-action="quick-start"]')!.click();
    root.querySelector<HTMLButtonElement>(
      '[data-action="select-duration"][data-duration="30"]',
    )!.click();
    root.querySelector<HTMLButtonElement>('[data-action="open-training"]')!.click();

    expect(prepare).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 30 }),
    );
    expect(root.querySelector("[data-hud-time]")?.textContent).toBe("30");
  });

  it("continues from sensitivity input to crosshair settings", () => {
    const { root } = mountApp();
    root.querySelector<HTMLButtonElement>(
      '[data-screen="sensitivity-settings"]',
    )!.click();
    const dpi = root.querySelector<HTMLInputElement>('[name="dpi"]')!;
    const sensitivity = root.querySelector<HTMLInputElement>(
      '[name="valorantSensitivity"]',
    )!;
    dpi.value = "800";
    sensitivity.value = "0.32";
    root.querySelector<HTMLFormElement>("form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    expect(root.querySelector("h1")?.textContent).toBe("크로스헤어 설정");
    expect(root.textContent).not.toContain("360° 보정");
  });

  it("applies line length to the crosshair preview", () => {
    const { root } = mountApp();
    root.querySelector<HTMLButtonElement>(
      '[data-screen="sensitivity-settings"]',
    )!.click();
    root.querySelector<HTMLButtonElement>(
      '[data-screen="crosshair-settings"]',
    )!.click();
    const length = root.querySelector<HTMLInputElement>(
      '[data-crosshair="lineLength"]',
    )!;
    const preview = root.querySelector<HTMLElement>("[data-crosshair-preview]")!;

    length.value = "14";
    length.dispatchEvent(new Event("input", { bubbles: true }));

    expect(preview.style.getPropertyValue("--crosshair-line-length")).toBe("14px");
  });

  it("renders the configured crosshair in the training HUD", () => {
    new StorageService(localStorage).saveSensitivity({
      dpi: 800,
      valorantSensitivity: 0.32,
      edpi: 256,
      calibrationMultiplier: 1,
      calibratedAt: null,
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as WebGLRenderingContext,
    );
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    const app = new App(document.createElement("div"));

    const trainingMarkup = (
      app as unknown as { renderTraining: () => string }
    ).renderTraining();

    expect(trainingMarkup).toContain("data-training-crosshair");
  });
});
