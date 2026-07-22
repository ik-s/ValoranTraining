import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../src/app/App";
import type { SupabaseAccountService } from "../../src/infrastructure/SupabaseAccountService";
import type { GridShotResult } from "../../src/domain/Results";
import { StorageService } from "../../src/domain/StorageService";
import { TrainingEngine } from "../../src/engine/TrainingEngine";

const mountApp = (
  accountService?: SupabaseAccountService | null,
): { app: App; root: HTMLDivElement } => {
  const root = document.createElement("div");
  document.body.append(root);
  const app = new App(root, { accountService });
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

  it("makes the whole selected mode card an accessible, visibly selected control", () => {
    const { root } = mountApp();
    const card = root.querySelector<HTMLButtonElement>(
      'button.mode-card[data-action="select-mode"][data-mode="micro-flick"]',
    );

    expect(card).not.toBeNull();
    expect(card?.getAttribute("aria-pressed")).toBe("false");

    card!.click();

    const selectedCards = root.querySelectorAll<HTMLButtonElement>(
      "button.mode-card.is-selected",
    );
    expect(selectedCards).toHaveLength(1);
    expect(selectedCards[0]?.dataset.mode).toBe("micro-flick");
    expect(selectedCards[0]?.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens an exact saved record in the existing result detail view", () => {
    const saved: GridShotResult = {
      id: "saved-grid-shot",
      resultType: "aim",
      modeId: "grid-shot",
      difficulty: "normal",
      playedAt: "2026-07-23T01:02:03.000Z",
      durationSeconds: 60,
      score: 12345,
      accuracy: 0.91,
      hits: 42,
      misses: 4,
      maxCombo: 18,
      sensitivitySnapshot: {
        dpi: 800,
        valorantSensitivity: 0.32,
        edpi: 256,
        calibrationMultiplier: 1,
      },
      inputSnapshot: { pointerLockMode: "raw" },
      directionalMetrics: [],
      modeMetrics: { hitsPerSecond: 0.7, averageTransitionTime: 0.4 },
    };
    new StorageService(localStorage).record(saved);
    const { root } = mountApp();

    root.querySelector<HTMLButtonElement>('[data-screen="records"]')!.click();
    const record = root.querySelector<HTMLButtonElement>(
      '[data-action="show-record"][data-record-id="saved-grid-shot"]',
    );
    expect(record?.tagName).toBe("BUTTON");

    record!.click();

    expect(root.querySelector(".result-score")?.textContent).toBe("12,345");
    expect(root.textContent).toContain("91%");
    expect(root.textContent).toContain("18");

    root.querySelector<HTMLButtonElement>('[data-action="back"]')!.click();
    expect(root.querySelector(".records-subheading")?.textContent).toBe("PERSONAL BEST");
  });

  it("starts Google login from the top bar without blocking guest training", () => {
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined);
    const { root } = mountApp({
      getCurrentAccount: vi.fn().mockResolvedValue(null),
      observeAuthChanges: vi.fn().mockReturnValue(() => undefined),
      signInWithGoogle,
    } as unknown as SupabaseAccountService);

    root.querySelector<HTMLButtonElement>('[data-action="sign-in-google"]')!.click();

    expect(signInWithGoogle).toHaveBeenCalledWith(window.location.origin + "/");
    expect(root.querySelector(".hero-panel")).not.toBeNull();
  });

  it("keeps a fresh visitor in the guest state when session restoration fails", async () => {
    const { root } = mountApp({
      getCurrentAccount: vi.fn().mockRejectedValue(new Error("No session")),
      observeAuthChanges: vi.fn().mockReturnValue(() => undefined),
    } as unknown as SupabaseAccountService);

    await vi.waitFor(() => {
      expect(root.querySelector('[data-action="sign-in-google"]')).not.toBeNull();
      expect(root.querySelector(".account-message")).toBeNull();
    });
  });

  it("opens profile setup after restoring an incomplete account", async () => {
    const { root } = mountApp({
      getCurrentAccount: vi.fn().mockResolvedValue({
        id: "account-id",
        displayName: "훈련생-ABC123",
        avatarUrl: null,
        profileCompleted: false,
      }),
      getOwnRuns: vi.fn().mockResolvedValue([]),
      observeAuthChanges: vi.fn().mockReturnValue(() => undefined),
    } as unknown as SupabaseAccountService);

    await vi.waitFor(() => {
      expect(root.querySelector("[data-profile-form]")).not.toBeNull();
    });
  });

  it("uploads unsynced local results after a Google session is restored", async () => {
    const saved: GridShotResult = {
      id: "1cfe71c4-d538-4fb4-9d1a-88a1b1e8b2a1",
      resultType: "aim",
      modeId: "grid-shot",
      difficulty: "normal",
      playedAt: "2026-07-23T01:02:03.000Z",
      durationSeconds: 60,
      score: 999,
      accuracy: 0.8,
      hits: 9,
      misses: 2,
      maxCombo: 5,
      sensitivitySnapshot: {
        dpi: 800,
        valorantSensitivity: 0.32,
        edpi: 256,
        calibrationMultiplier: 1,
      },
      inputSnapshot: { pointerLockMode: "raw" },
      directionalMetrics: [],
      modeMetrics: { hitsPerSecond: 0.15, averageTransitionTime: 0.5 },
    };
    new StorageService(localStorage).record(saved);
    const saveRun = vi.fn().mockResolvedValue(undefined);
    mountApp({
      getCurrentAccount: vi
        .fn()
        .mockResolvedValue({ id: "account-id", displayName: "훈련생-ABC123" }),
      getOwnRuns: vi.fn().mockResolvedValue([]),
      observeAuthChanges: vi.fn().mockReturnValue(() => undefined),
      saveRun,
    } as unknown as SupabaseAccountService);

    await vi.waitFor(() => {
      expect(saveRun).toHaveBeenCalledWith(saved);
    });
  });

  it("renders a filtered public ranking from the account service", async () => {
    const getLeaderboard = vi.fn().mockResolvedValue([
      {
        rank: 1,
        displayName: "훈련생-AB12CD",
        score: 24680,
        accuracy: 0.91,
        completedAt: "2026-07-23T00:00:00.000Z",
      },
    ]);
    const { root } = mountApp({
      getCurrentAccount: vi.fn().mockResolvedValue(null),
      observeAuthChanges: vi.fn().mockReturnValue(() => undefined),
      getLeaderboard,
    } as unknown as SupabaseAccountService);

    root.querySelector<HTMLButtonElement>('[data-screen="ranking"]')!.click();

    await vi.waitFor(() => {
      expect(getLeaderboard).toHaveBeenCalledWith({
        modeId: "grid-shot",
        difficulty: "normal",
        durationSeconds: 60,
      });
    });
    expect(root.textContent).toContain("훈련생-AB12CD");
    expect(root.textContent).toContain("24,680");
    expect(root.textContent).toContain("91%");

    const duration = root.querySelector<HTMLSelectElement>(
      '[name="ranking-duration"]',
    )!;
    duration.value = "30";
    duration.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => {
      expect(getLeaderboard).toHaveBeenLastCalledWith({
        modeId: "grid-shot",
        difficulty: "normal",
        durationSeconds: 30,
      });
    });
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

  it("returns to home from training selection after ending a session", () => {
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
    vi.spyOn(TrainingEngine.prototype, "prepare").mockImplementation(() => undefined);
    const { root } = mountApp();

    root.querySelector<HTMLButtonElement>('[data-action="quick-start"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-action="open-training"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-action="end-session"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-action="back"]')!.click();

    expect(root.querySelector(".hero-panel")).not.toBeNull();
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

  it("explains that VALORANT profile settings are applied to training", () => {
    const { root } = mountApp();
    root.querySelector<HTMLButtonElement>(
      '[data-screen="sensitivity-settings"]',
    )!.click();

    expect(root.textContent).toContain("VALORANT 프로필");
  });

  it("allows zero line length for a dot-only crosshair", () => {
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

    expect(length.min).toBe("0");

    length.value = "0";
    length.dispatchEvent(new Event("input", { bubbles: true }));

    expect(preview.style.getPropertyValue("--crosshair-line-length")).toBe("0px");
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
