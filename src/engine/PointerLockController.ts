export type PointerLockMode = "raw" | "standard" | "unavailable";

export type PointerLockRequest = (
  unadjustedMovement: boolean,
) => Promise<void> | void;

const isPromise = (value: Promise<void> | void): value is Promise<void> =>
  typeof (value as Promise<void> | undefined)?.then === "function";

export class PointerLockController {
  constructor(private readonly request: PointerLockRequest) {}

  async requestPointerLock(): Promise<PointerLockMode> {
    try {
      const rawRequest = this.request(true);
      if (!isPromise(rawRequest)) {
        return "standard";
      }
      await rawRequest;
      return "raw";
    } catch {
      return this.requestStandardPointerLock();
    }
  }

  private async requestStandardPointerLock(): Promise<PointerLockMode> {
    try {
      await this.request(false);
      return "standard";
    } catch {
      return "unavailable";
    }
  }
}
