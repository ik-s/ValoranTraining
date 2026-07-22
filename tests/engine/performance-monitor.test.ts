import { describe, expect, it } from "vitest";

import { PerformanceMonitor } from "../../src/engine/PerformanceMonitor";

describe("PerformanceMonitor", () => {
  it("warns only after a sustained frame rate below 50 FPS", () => {
    const monitor = new PerformanceMonitor();

    for (let index = 0; index < 29; index += 1) {
      monitor.recordFrame(1 / 40);
    }
    expect(monitor.isBelowTarget()).toBe(false);

    monitor.recordFrame(1 / 40);
    expect(monitor.isBelowTarget()).toBe(true);
  });

  it("clears the warning after a sustained recovery", () => {
    const monitor = new PerformanceMonitor();
    for (let index = 0; index < 30; index += 1) {
      monitor.recordFrame(1 / 40);
    }
    for (let index = 0; index < 30; index += 1) {
      monitor.recordFrame(1 / 60);
    }

    expect(monitor.isBelowTarget()).toBe(false);
  });
});
