export type PointerLockMode = "raw" | "standard" | "unavailable";

export type PointerLockRequest = (
  unadjustedMovement: boolean,
) => Promise<void> | void;

export class PointerLockController {
  constructor(private readonly request: PointerLockRequest) {}

  async requestPointerLock(): Promise<PointerLockMode> {
    try {
      await this.request(true);
      return "raw";
    } catch {
      try {
        await this.request(false);
        return "standard";
      } catch {
        return "unavailable";
      }
    }
  }
}
