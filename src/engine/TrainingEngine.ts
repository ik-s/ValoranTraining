import type {
  CrosshairSettings,
  Difficulty,
  ValorantSensitivitySettings,
} from "../domain/types";
import { getDifficultyPreset } from "../domain/DifficultyPresets";
import { createAimMode } from "../modes/ModeFactory";
import { StrafeTrackMode } from "../modes/StrafeTrackMode";
import type { TrainingMode } from "../modes/TrainingMode";
import { AimArenaScene } from "./AimArenaScene";
import { AudioManager } from "./AudioManager";
import { CameraController } from "./CameraController";
import { InputManager } from "./InputManager";
import { PerformanceMonitor } from "./PerformanceMonitor";
import type { PointerLockMode } from "./PointerLockController";
import { SessionClock } from "./SessionClock";
import { SessionStateMachine } from "./SessionStateMachine";
import type { TrainingHudAdapter } from "./TrainingHudAdapter";

export interface AimTrainingSessionConfig {
  modeId: import("../domain/types").AimModeId;
  difficulty: Difficulty;
  durationSeconds: 30 | 60;
  sensitivity: ValorantSensitivitySettings;
  crosshair: CrosshairSettings;
}

export interface TrainingEngineCallbacks {
  onStatusChange?: () => void;
  onComplete: (metrics: Record<string, number | null>, pointerLockMode: PointerLockMode) => void;
}

export class TrainingEngine {
  private readonly state = new SessionStateMachine();
  private readonly audio = new AudioManager();
  private readonly performance = new PerformanceMonitor();
  private scene: AimArenaScene | null = null;
  private input: InputManager | null = null;
  private camera: CameraController | null = null;
  private mode: TrainingMode | null = null;
  private clock: SessionClock | null = null;
  private config: AimTrainingSessionConfig | null = null;
  private animationFrameId: number | null = null;
  private lastFrameAt = 0;
  private countdownStartedAt: number | null = null;
  private pointerLockMode: PointerLockMode = "unavailable";
  private wasPaused = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly hud: TrainingHudAdapter,
    private readonly callbacks: TrainingEngineCallbacks,
  ) {}

  prepare(config: AimTrainingSessionConfig): void {
    this.dispose();
    this.config = config;
    this.scene = new AimArenaScene(this.container);
    this.camera = new CameraController(
      config.sensitivity.valorantSensitivity,
      config.sensitivity.calibrationMultiplier,
    );
    this.clock = new SessionClock(config.durationSeconds);
    this.input = new InputManager(this.scene.getCanvas(), {
      onMouseMove: (x, y) => this.handleMouseMove(x, y),
      onShot: () => this.handleShot(),
      onPointerLockChanged: (locked) => {
        if (!locked && (this.state.getStatus() === "running" || this.state.getStatus() === "countdown")) {
          this.pause();
        }
      },
    });
    this.mode = createAimMode(config.modeId, {
      difficulty: config.difficulty,
      random: Math.random,
      createId: () => crypto.randomUUID(),
      addTarget: (target) => this.scene?.addTarget(target),
      updateTarget: (target) => this.scene?.updateTarget(target),
      removeTarget: (targetId) => this.scene?.removeTarget(targetId),
    });
    this.mode.initialize(performance.now());
    this.state.prepare();
    this.lastFrameAt = performance.now();
    this.performance.reset();
    this.animationFrameId = requestAnimationFrame(this.frame);
    this.notify();
  }

  async start(): Promise<PointerLockMode> {
    if (!this.input || !this.clock) {
      return "unavailable";
    }
    const lockMode = await this.input.requestPointerLock();
    this.pointerLockMode = lockMode;
    if (lockMode === "unavailable") {
      this.notify();
      return lockMode;
    }
    this.beginCountdown();
    return lockMode;
  }

  pause(): void {
    const now = performance.now();
    if (this.state.getStatus() === "running") {
      this.clock?.pause(now);
      this.wasPaused = true;
    }
    this.input?.setShootingEnabled(false);
    this.state.pause();
    this.notify();
  }

  abort(): void {
    this.input?.setShootingEnabled(false);
    this.input?.releasePointerLock();
    this.state.abort();
    this.notify();
  }

  getStatus() {
    return this.state.getStatus();
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.input?.dispose();
    this.input = null;
    this.mode?.dispose();
    this.mode = null;
    this.scene?.dispose();
    this.scene = null;
    this.audio.dispose();
    this.countdownStartedAt = null;
  }

  private beginCountdown(): void {
    this.countdownStartedAt = performance.now();
    if (this.state.getStatus() === "paused") {
      this.state.resumeCountdown();
    } else {
      this.state.beginCountdown();
    }
    this.input?.setShootingEnabled(false);
    this.notify();
  }

  private readonly frame = (now: number): void => {
    const rawDeltaSeconds = Math.max(0, (now - this.lastFrameAt) / 1_000);
    const deltaTimeSeconds = Math.min(0.1, rawDeltaSeconds);
    this.lastFrameAt = now;
    this.performance.recordFrame(rawDeltaSeconds);
    const status = this.state.getStatus();
    if (status === "countdown") {
      this.updateCountdown(now);
    } else if (status === "running") {
      this.updateRunning(deltaTimeSeconds, now);
    }
    this.scene?.render();
    this.renderHud(now);
    if (!["completed", "aborted", "error"].includes(this.state.getStatus())) {
      this.animationFrameId = requestAnimationFrame(this.frame);
    }
  };

  private updateCountdown(now: number): void {
    if (this.countdownStartedAt === null || now - this.countdownStartedAt < 3_000) {
      return;
    }
    if (this.wasPaused) {
      this.clock?.resume(now);
    } else {
      this.clock?.start(now);
    }
    this.wasPaused = false;
    this.state.startRunning();
    const canShoot = this.config
      ? getDifficultyPreset(this.config.modeId, this.config.difficulty).usesShooting
      : false;
    this.input?.setShootingEnabled(canShoot);
    this.audio.playTone(660);
    this.notify();
  }

  private updateRunning(deltaTimeSeconds: number, now: number): void {
    this.mode?.update(deltaTimeSeconds, now);
    if (this.mode instanceof StrafeTrackMode && this.scene) {
      const target = this.scene.getPrimaryTarget();
      if (target) {
        const error = this.scene.getAngularErrorToTarget(target);
        this.mode.recordTrackingFrame({
          timestamp: now,
          deltaTimeSeconds,
          angularError: error,
          isInsideTarget: error <= target.angularSize / 2,
          targetSpeed: this.mode.getSpeed(),
          targetDirection: this.mode.getDirection(),
        });
      }
    }
    if (this.clock?.isComplete(now)) {
      this.complete();
    }
  }

  private handleMouseMove(movementX: number, movementY: number): void {
    if (!this.camera || !this.scene) {
      return;
    }
    this.camera.applyMouseDelta(movementX, movementY);
    const rotation = this.camera.getRotation();
    this.scene.applyCameraRotation(rotation.yaw, rotation.pitch);
  }

  private handleShot(): void {
    if (this.state.getStatus() !== "running" || !this.mode || !this.scene) {
      return;
    }
    const hit = this.scene.raycastCenter();
    this.mode.handleShot(hit, performance.now());
    this.audio.playTone(hit.targetId ? 880 : 180);
  }

  private complete(): void {
    this.input?.setShootingEnabled(false);
    this.input?.releasePointerLock();
    this.state.complete();
    this.callbacks.onComplete(this.mode?.getMetrics() ?? {}, this.pointerLockMode);
    this.notify();
  }

  private renderHud(now: number): void {
    const countdownSeconds =
      this.state.getStatus() === "countdown" && this.countdownStartedAt !== null
        ? Math.max(1, Math.ceil(3 - (now - this.countdownStartedAt) / 1_000))
        : null;
    this.hud.render({
      status: this.state.getStatus(),
      pointerLockMode: this.pointerLockMode,
      remainingSeconds: this.clock?.remainingSeconds(now) ?? 60,
      countdownSeconds,
      performanceWarning: this.performance.isBelowTarget(),
      metrics: this.mode?.getMetrics() ?? {},
    });
  }

  private notify(): void {
    this.callbacks.onStatusChange?.();
  }
}
