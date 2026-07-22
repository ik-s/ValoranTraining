import {
  PointerLockController,
  type PointerLockMode,
} from "./PointerLockController";

export interface InputManagerCallbacks {
  onMouseMove: (movementX: number, movementY: number) => void;
  onShot: () => void;
  onPointerLockChanged: (locked: boolean) => void;
}

type PointerLockCanvas = HTMLCanvasElement & {
  requestPointerLock: (options?: { unadjustedMovement?: boolean }) => void | Promise<void>;
};

export class InputManager {
  private readonly pointerLockController: PointerLockController;
  private shootingEnabled = false;

  constructor(
    private readonly canvas: PointerLockCanvas,
    private readonly callbacks: InputManagerCallbacks,
  ) {
    this.pointerLockController = new PointerLockController((raw) =>
      this.canvas.requestPointerLock(
        raw ? { unadjustedMovement: true } : undefined,
      ),
    );
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mousedown", this.handleMouseDown);
  }

  requestPointerLock(): Promise<PointerLockMode> {
    return this.pointerLockController.requestPointerLock();
  }

  releasePointerLock(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  setShootingEnabled(enabled: boolean): void {
    this.shootingEnabled = enabled;
  }

  dispose(): void {
    document.removeEventListener("pointerlockchange", this.handlePointerLockChange);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mousedown", this.handleMouseDown);
  }

  private readonly handlePointerLockChange = (): void => {
    this.callbacks.onPointerLockChanged(document.pointerLockElement === this.canvas);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement === this.canvas) {
      this.callbacks.onMouseMove(event.movementX, event.movementY);
    }
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (
      event.button === 0 &&
      this.shootingEnabled &&
      document.pointerLockElement === this.canvas
    ) {
      event.preventDefault();
      this.callbacks.onShot();
    }
  };
}
