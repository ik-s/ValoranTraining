import { beforeEach, describe, expect, it, vi } from "vitest";

const sceneSpies = vi.hoisted(() => ({ dispose: vi.fn() }));

vi.mock("../../src/engine/AimArenaScene", () => ({
  AimArenaScene: class {
    getCanvas(): HTMLCanvasElement {
      return document.createElement("canvas");
    }
    addTarget(): void {}
    updateTarget(): void {}
    removeTarget(): void {}
    applyCameraRotation(): void {}
    render(): void {}
    dispose(): void {
      sceneSpies.dispose();
    }
  },
}));

import { TrainingEngine } from "../../src/engine/TrainingEngine";

const config = {
  modeId: "grid-shot" as const,
  difficulty: "normal" as const,
  durationSeconds: 60 as const,
  sensitivity: {
    dpi: 800,
    valorantSensitivity: 0.32,
    edpi: 256,
    calibrationMultiplier: 1,
    calibratedAt: null,
  },
  crosshair: {
    color: "#00e5ff",
    lineLength: 8,
    lineThickness: 2,
    centerGap: 4,
    showCenterDot: true,
    centerDotSize: 2,
  },
};

describe("TrainingEngine disposal", () => {
  beforeEach(() => {
    sceneSpies.dispose.mockClear();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("releases scene resources across ten prepare and dispose cycles", () => {
    const hud = { render: vi.fn(), dispose: vi.fn() };
    const engine = new TrainingEngine(document.createElement("div"), hud, {
      onComplete: vi.fn(),
    });

    for (let index = 0; index < 10; index += 1) {
      engine.prepare(config);
      engine.dispose();
    }

    expect(sceneSpies.dispose).toHaveBeenCalledTimes(10);
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(10);
  });
});
