import { describe, expect, it } from "vitest";

import { createAimMode } from "../../src/modes/ModeFactory";
import { GridShotMode } from "../../src/modes/GridShotMode";
import { StrafeTrackMode } from "../../src/modes/StrafeTrackMode";
import { createModeContext } from "./helpers";

describe("createAimMode", () => {
  it("creates the matching mode class for a click mode", () => {
    expect(createAimMode("grid-shot", createModeContext("normal"))).toBeInstanceOf(
      GridShotMode,
    );
  });

  it("creates the non-shooting Strafe Track mode", () => {
    expect(
      createAimMode("strafe-track", createModeContext("normal")),
    ).toBeInstanceOf(StrafeTrackMode);
  });
});
