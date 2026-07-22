import { describe, expect, it } from "vitest";

import { SessionClock } from "../../src/engine/SessionClock";

describe("SessionClock", () => {
  it("excludes paused duration from elapsed training time", () => {
    const clock = new SessionClock(60);
    clock.start(1_000);
    clock.pause(11_000);
    clock.resume(51_000);

    expect(clock.elapsedSeconds(61_000)).toBe(20);
    expect(clock.remainingSeconds(61_000)).toBe(40);
  });

  it("completes once after sixty active seconds", () => {
    const clock = new SessionClock(60);
    clock.start(0);

    expect(clock.isComplete(59_999)).toBe(false);
    expect(clock.isComplete(60_000)).toBe(true);
    expect(clock.remainingSeconds(61_000)).toBe(0);
  });
});
