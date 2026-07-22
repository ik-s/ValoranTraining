import { describe, expect, it } from "vitest";

import { SessionStateMachine } from "../../src/engine/SessionStateMachine";

describe("SessionStateMachine", () => {
  it("moves through ready, countdown, running, paused, and completed states", () => {
    const state = new SessionStateMachine();

    state.prepare();
    state.beginCountdown();
    state.startRunning();
    state.pause();
    state.resumeCountdown();
    state.startRunning();
    state.complete();

    expect(state.getStatus()).toBe("completed");
  });
});
