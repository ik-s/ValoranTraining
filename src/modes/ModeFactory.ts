import type { AimModeId } from "../domain/types";
import { GridShotMode } from "./GridShotMode";
import { HeadshotOnlyMode } from "./HeadshotOnlyMode";
import { MicroFlickMode } from "./MicroFlickMode";
import { ReactionShotMode } from "./ReactionShotMode";
import { StrafeTrackMode } from "./StrafeTrackMode";
import { TargetSwitchingMode } from "./TargetSwitchingMode";
import type { TrainingMode, TrainingModeContext } from "./TrainingMode";

export const createAimMode = (
  modeId: AimModeId,
  context: TrainingModeContext,
): TrainingMode => {
  switch (modeId) {
    case "grid-shot":
      return new GridShotMode(context);
    case "micro-flick":
      return new MicroFlickMode(context);
    case "reaction-shot":
      return new ReactionShotMode(context);
    case "target-switching":
      return new TargetSwitchingMode(context);
    case "strafe-track":
      return new StrafeTrackMode(context);
    case "headshot-only":
      return new HeadshotOnlyMode(context);
  }
};
