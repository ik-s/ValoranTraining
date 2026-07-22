import { calculateRotationDelta } from "../domain/ValorantSensitivityService";

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
    this.yaw += calculateRotationDelta(
      movementX,
      this.valorantSensitivity,
      this.calibrationMultiplier,
    );
    this.pitch = Math.min(
      89,
      Math.max(
        -89,
        this.pitch -
          calculateRotationDelta(
            movementY,
            this.valorantSensitivity,
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
