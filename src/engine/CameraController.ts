import {
  calculateEffectiveTrainingSensitivity,
  calculateRotationDelta,
} from "../domain/ValorantSensitivityService";

export interface CameraRotation {
  yaw: number;
  pitch: number;
}

export class CameraController {
  private yaw = 0;
  private pitch = 0;

  constructor(
    private readonly valorantSensitivity: number,
    private readonly calibrationMultiplier: number,
  ) {}

  applyMouseDelta(movementX: number, movementY: number): void {
    const effectiveTrainingSensitivity = calculateEffectiveTrainingSensitivity(
      this.valorantSensitivity,
    );

    this.yaw += calculateRotationDelta(
      movementX,
      effectiveTrainingSensitivity,
      this.calibrationMultiplier,
    );
    this.pitch = Math.min(
      89,
      Math.max(
        -89,
        this.pitch -
          calculateRotationDelta(
            movementY,
            effectiveTrainingSensitivity,
            this.calibrationMultiplier,
          ),
      ),
    );
  }

  getRotation(): CameraRotation {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  reset(): void {
    this.yaw = 0;
    this.pitch = 0;
  }
}
