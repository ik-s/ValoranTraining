# VALORANT Aim Trainer MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use \`superpowers:executing-plans\` to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Deliver the approved desktop-first 3D VALORANT-sensitivity aim trainer with six training modes, local records, analysis, and browser fallbacks.

**Architecture:** A small vanilla TypeScript SPA owns DOM screens and state transitions. Pure domain services calculate sensitivity, results, analytics, storage, and renderer-independent mode rules; a Three.js engine adapts those rules into a fixed arena with Pointer Lock input and central raycasting. Each session receives immutable setting snapshots and returns an immutable result for UI and persistence.

**Tech Stack:** Vite, TypeScript (strict), Three.js, Vanilla CSS, Vitest, browser APIs (Pointer Lock, Fullscreen, Web Audio, localStorage).

## Global Constraints

- Support Windows desktop Chrome with a physical mouse first; show a clear desktop-required state for unsupported environments.
- Use only original visual/audio assets; do not reuse Riot logos, maps, agents, UI, bot assets, or audio.
- Keep all six modes at 60 seconds with a 3-second countdown and stationary player position.
- Use Pointer Lock raw-input request with standard-input fallback; never claim exact cross-environment VALORANT sensitivity equivalence.
- Keep domain/mode tests independent from DOM, renderer, and localStorage.
- Use \`valorant-aim-trainer:data\` as the sole localStorage key and retain at most ten recents plus one PB per mode/difficulty.
- Use explicit \`dispose()\` paths for renderer resources, events, animation frames, pointer lock, audio, and canvas.

## File Structure

\`\`\`text
src/
  app/ App.ts, AppRouter.ts, AppState.ts, screen renderers
  domain/ IDs, settings, presets, score, analytics, feedback, result, storage
  modes/ TrainingMode, target geometry, six rule classes, mode factory
  engine/ TrainingEngine, AimArenaScene, InputManager, CameraController,
          ShootingSystem, SessionClock, AudioManager, TrainingHudAdapter
  ui/ reusable panel/button/form/crosshair/result components
  styles/ tokens.css, app.css, training.css
tests/
  domain/ pure service tests
  modes/ renderer-free mode rule tests
\`\`\`

---

### Task 1: Bootstrap the strict Vite application and shell

**Files:**
- Create: \`package.json\`, \`vite.config.ts\`, \`tsconfig.json\`, \`index.html\`
- Create: \`src/main.ts\`, \`src/app/App.ts\`, \`src/app/AppRouter.ts\`, \`src/app/AppState.ts\`
- Create: \`src/styles/tokens.css\`, \`src/styles/app.css\`, \`src/styles/training.css\`
- Create: \`tests/app/router.test.ts\`

**Interfaces:**
- Produces \`type AppScreen = "home" | "training-select" | "sensitivity-settings" | "sensitivity-calibration" | "crosshair-settings" | "records" | "training" | "result"\`.
- Produces \`AppRouter.navigate(screen: AppScreen): void\` and \`App.mount(root: HTMLElement): void\`.

- [ ] **Step 1: Write the failing router test**

\`\`\`ts
import { describe, expect, it } from "vitest";
import { AppRouter } from "../../src/app/AppRouter";

it("notifies the active screen after navigation", () => {
  const seen: string[] = [];
  const router = new AppRouter((screen) => seen.push(screen));
  router.navigate("records");
  expect(seen).toEqual(["home", "records"]);
});
\`\`\`

- [ ] **Step 2: Run \`npm test -- --run tests/app/router.test.ts\`; expect a module-not-found failure.**
- [ ] **Step 3: Implement the smallest strict Vite shell**

\`\`\`ts
export class AppRouter {
  private current: AppScreen = "home";
  constructor(private readonly onChange: (screen: AppScreen) => void) {}
  navigate(screen: AppScreen) { this.current = screen; this.onChange(screen); }
  getCurrent() { return this.current; }
}
\`\`\`

Add scripts \`dev\`, \`build\`, \`test\`, and \`test:watch\`; configure Vitest with jsdom. Render the app shell into \`#app\`, keep the current screen in state, and define visual tokens for charcoal, red, cyan, panel borders, and focus rings.

- [ ] **Step 4: Run \`npm test -- --run tests/app/router.test.ts\` and \`npm run build\`; expect both to pass.**
- [ ] **Step 5: Commit**

\`\`\`bash
git add package.json vite.config.ts tsconfig.json index.html src tests
git commit -m "chore: bootstrap aim trainer app"
\`\`\`

### Task 2: Implement sensitivity, crosshair, difficulty, and common analytics

**Files:**
- Create: \`src/domain/types.ts\`, \`src/domain/ValorantSensitivityService.ts\`, \`src/domain/Crosshair.ts\`, \`src/domain/DifficultyPresets.ts\`, \`src/domain/DirectionMetrics.ts\`, \`src/domain/Scoring.ts\`
- Create: \`tests/domain/sensitivity.test.ts\`, \`tests/domain/direction-metrics.test.ts\`, \`tests/domain/scoring.test.ts\`

**Interfaces:**
- Produces \`calculateEdpi(dpi, sensitivity): number\`, \`validateSensitivity(input): ValidationResult\`, \`calculateRotationDelta(count, sensitivity): number\`.
- Produces \`classifyDirection(yaw, pitch): DirectionZone\` and \`comboBonus(combo): number\`.
- Consumed by every screen, mode, and engine session.

- [ ] **Step 1: Write failing tests for 800 × 0.32 = 256, DPI boundaries, four-decimal sensitivity, 0.5–1.5 calibration, direction zones, and combo tiers.**
- [ ] **Step 2: Run \`npm test -- --run tests/domain/sensitivity.test.ts tests/domain/direction-metrics.test.ts tests/domain/scoring.test.ts\`; expect failures.**
- [ ] **Step 3: Implement only pure functions and immutable types**

\`\`\`ts
export const comboBonus = (combo: number) =>
  combo >= 20 ? 30 : combo >= 10 ? 20 : combo >= 5 ? 10 : 0;
export const calculateEdpi = (dpi: number, sensitivity: number) => dpi * sensitivity;
export const classifyDirection = (yaw: number, pitch: number): DirectionZone =>
  Math.abs(yaw) <= 10 && Math.abs(pitch) <= 10 ? "center" :
  Math.abs(yaw) >= Math.abs(pitch) ? (yaw < 0 ? "left" : "right") :
  (pitch < 0 ? "down" : "up");
\`\`\`

Centralize the yaw coefficient, default crosshair, difficulty tables, angular-size-to-world-size conversion, and all input validation in this task.

- [ ] **Step 4: Run the three tests and \`npm run build\`; expect passing results.**
- [ ] **Step 5: Commit \`feat: add sensitivity and training domain rules\`.**

### Task 3: Implement result construction, feedback, and resilient storage

**Files:**
- Create: \`src/domain/Results.ts\`, \`src/domain/FeedbackService.ts\`, \`src/domain/StorageService.ts\`
- Create: \`tests/domain/storage.test.ts\`, \`tests/domain/feedback.test.ts\`

**Interfaces:**
- Produces discriminated \`AimTrainingResult\` variants for all six mode IDs and \`createDefaultAppData(): StoredAppData\`.
- Produces \`StorageService.load()\`, \`saveSettings()\`, \`record(result)\`, \`clearRecords()\`, and \`resetAll()\`.

- [ ] **Step 1: Write failing tests for a 10-result cap, same-mode/difficulty PB replacement, malformed JSON recovery, settings-preserving record clear, and <5-sample feedback exclusion.**
- [ ] **Step 2: Run \`npm test -- --run tests/domain/storage.test.ts tests/domain/feedback.test.ts\`; expect failures.**
- [ ] **Step 3: Implement the one-key versioned store and feedback selection**

\`\`\`ts
const STORAGE_KEY = "valorant-aim-trainer:data";
export const modeDifficultyKey = (mode: AimModeId, difficulty: Difficulty) =>
  \`\${mode}:\${difficulty}\` as const;
\`\`\`

Validate each subtree independently; retain valid sensitivity, crosshair, preferences, and result entries while replacing only invalid fields. Insert newest recents first, slice to ten, and replace PB only when score is higher.

- [ ] **Step 4: Run the tests and full build; expect pass.**
- [ ] **Step 5: Commit \`feat: persist training results locally\`.**

### Task 4: Build renderer-independent target and session mode infrastructure

**Files:**
- Create: \`src/modes/TrainingMode.ts\`, \`src/modes/TargetMath.ts\`, \`src/modes/ModeFactory.ts\`, \`src/engine/SessionClock.ts\`
- Create: \`tests/modes/target-math.test.ts\`, \`tests/engine/session-clock.test.ts\`

**Interfaces:**
- Produces \`TrainingMode.initialize/update/handleShot/getMetrics/dispose\`.
- Produces \`angularDistance(a, b)\`, \`isSpawnSeparated(candidate, existing, minimum)\`, and pausable \`SessionClock\`.

- [ ] **Step 1: Write failing tests for angular separation, a paused clock excluding pause duration, and exactly 60 seconds completing once.**
- [ ] **Step 2: Run focused tests; expect failures.**
- [ ] **Step 3: Implement a mode context that accepts deterministic random/time adapters, target callbacks, and metrics events rather than Three.js or DOM references.**
- [ ] **Step 4: Run focused tests plus \`npm run build\`; expect pass.**
- [ ] **Step 5: Commit \`feat: add mode and session foundations\`.**

### Task 5: Implement Grid Shot and Micro Flick rules

**Files:**
- Create: \`src/modes/GridShotMode.ts\`, \`src/modes/MicroFlickMode.ts\`
- Create: \`tests/modes/grid-shot.test.ts\`, \`tests/modes/micro-flick.test.ts\`

**Interfaces:**
- Both consume \`TrainingModeContext\` and produce complete mode metrics.
- \`GridShotMode\` keeps three targets; \`MicroFlickMode\` keeps one nearby balanced target.

- [ ] **Step 1: Write failing tests: grid starts with three, replaces only the hit target, honors hard 20° separation; micro target stays in hard 8–18° previous-target range and within bounds.**
- [ ] **Step 2: Run both test files; expect failures.**
- [ ] **Step 3: Implement deterministic spawn candidate retries with a final legal fallback, event timestamps for transition/adjustment time, and the documented difficulty tables.**
- [ ] **Step 4: Run tests and build; expect pass.**
- [ ] **Step 5: Commit \`feat: add grid and micro flick modes\`.**

### Task 6: Implement Reaction Shot and Target Switching rules

**Files:**
- Create: \`src/modes/ReactionShotMode.ts\`, \`src/modes/TargetSwitchingMode.ts\`
- Create: \`tests/modes/reaction-shot.test.ts\`, \`tests/modes/target-switching.test.ts\`

**Interfaces:**
- Reaction state is \`"waiting" | "visible"\`; switching exposes current active target ID.
- Each mode reports false starts or wrong-target hits in its specialized metrics.

- [ ] **Step 1: Write failing tests for a false start (-50 and reset), visible timeout, active-target advance with minimum distance, wrong-target -30, and full relocation intervals.**
- [ ] **Step 2: Run focused tests; expect failures.**
- [ ] **Step 3: Implement explicit state machines with timer progress advanced only by unpaused \`deltaTime\`; calculate reaction and switching time from target activation timestamps.**
- [ ] **Step 4: Run tests and build; expect pass.**
- [ ] **Step 5: Commit \`feat: add reaction and switching modes\`.**

### Task 7: Implement Strafe Track and Headshot Only rules

**Files:**
- Create: \`src/modes/StrafeTrackMode.ts\`, \`src/modes/HeadshotOnlyMode.ts\`
- Create: \`tests/modes/strafe-track.test.ts\`, \`tests/modes/headshot-only.test.ts\`

**Interfaces:**
- Strafe mode exposes current angular position and \`recordTrackingFrame(frame)\`.
- Headshot mode distinguishes \`"head" | "body" | "empty"\` hit result types.

- [ ] **Step 1: Write failing tests for frame-rate independent movement/reversal, tracking aggregation, head respawn, body penalty without respawn, and timeout respawn.**
- [ ] **Step 2: Run focused tests; expect failures.**
- [ ] **Step 3: Implement speed-bucket and recovery metrics without storing frames after result construction; implement head/body score and ratio calculations.**
- [ ] **Step 4: Run tests and build; expect pass.**
- [ ] **Step 5: Commit \`feat: add tracking and headshot modes\`.**

### Task 8: Add Three.js arena, input, camera, hit testing, and session lifecycle

**Files:**
- Create: \`src/engine/AimArenaScene.ts\`, \`src/engine/InputManager.ts\`, \`src/engine/CameraController.ts\`, \`src/engine/ShootingSystem.ts\`, \`src/engine/TrainingEngine.ts\`, \`src/engine/AudioManager.ts\`, \`src/engine/TrainingHudAdapter.ts\`
- Modify: \`src/domain/types.ts\`
- Create: \`tests/engine/camera-controller.test.ts\`, \`tests/engine/training-engine.test.ts\`

**Interfaces:**
- \`TrainingEngine.prepare(config)\`, \`start()\`, \`pause(reason)\`, \`resume()\`, \`complete()\`, \`abort()\`, \`dispose()\`.
- \`InputManager.requestPointerLock(): Promise<"raw" | "standard" | "unavailable">\`.

- [ ] **Step 1: Write failing tests for sensitivity-applied yaw/pitch clamping, raw-input fallback decision, and training lifecycle transitions.**
- [ ] **Step 2: Run focused tests; expect failures.**
- [ ] **Step 3: Implement a fixed arena, centered \`Raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)\`, shared geometry/material disposal, listeners, resize behavior, visibility/focus pause, and Web Audio beeps generated in code.**
- [ ] **Step 4: Run all unit tests and build; expect pass.**
- [ ] **Step 5: Commit \`feat: add three dimensional training engine\`.**

### Task 9: Build all screens and wire complete user flows

**Files:**
- Create: \`src/app/screens/HomeScreen.ts\`, \`TrainingSelectScreen.ts\`, \`SensitivitySettingsScreen.ts\`, \`CalibrationScreen.ts\`, \`CrosshairSettingsScreen.ts\`, \`RecordsScreen.ts\`, \`TrainingScreen.ts\`, \`ResultScreen.ts\`
- Create: \`src/ui/Panel.ts\`, \`Button.ts\`, \`SensitivityForm.ts\`, \`CrosshairPreview.ts\`, \`ResultMetrics.ts\`, \`DirectionMap.ts\`
- Modify: \`src/app/App.ts\`, \`src/styles/*.css\`
- Create: \`tests/app/sensitivity-form.test.ts\`, \`tests/app/records-screen.test.ts\`

**Interfaces:**
- Screens consume application state/services only; no screen writes localStorage directly.
- Training screen creates one engine per session and always calls \`dispose()\` when leaving.

- [ ] **Step 1: Write failing tests for eDPI live rendering, invalid-form messaging, recent/PB rendering, filter behavior, and data-reset confirmation.**
- [ ] **Step 2: Run screen tests; expect failures.**
- [ ] **Step 3: Implement the home hero/mode cards/last session, selection difficulty persistence/recommendation, four-step sensitivity flow/calibration controls, live crosshair controls, records filters/detail, ready/countdown/HUD/pause, and result comparison/feedback/retry controls.**
- [ ] **Step 4: Run all unit tests and build; expect pass.**
- [ ] **Step 5: Commit \`feat: complete trainer screens and flows\`.**

### Task 10: Verify browser behavior, polish resilience, and ship

**Files:**
- Modify: \`README.md\`, \`src/app/App.ts\`, \`src/engine/TrainingEngine.ts\`, \`src/domain/StorageService.ts\`
- Create: \`docs/qa/manual-browser-checklist.md\`

**Interfaces:** No new public interface. This task verifies all existing contracts in the target browser.

- [ ] **Step 1: Write failing regression tests for corrupted stored fragments, save exception warning, and ten repeated engine disposal cycles.**
- [ ] **Step 2: Run affected tests; expect failures.**
- [ ] **Step 3: Implement regression fixes, add startup WebGL/desktop checks, a <50 FPS warning, and Korean README setup/limitations/fan-project disclaimer. Document manual verification for raw/standard Pointer Lock, ESC and focus pause, resize, all 18 mode-difficulty combinations, session persistence, records clearing, and reset.**
- [ ] **Step 4: Run \`npm test -- --run\`, \`npm run build\`, and manual Chrome checklist; expect no failing tests, a production build, and no lifecycle leak after repeated sessions.**
- [ ] **Step 5: Commit and push**

\`\`\`bash
git add README.md docs src tests
git commit -m "feat: complete valorant aim trainer mvp"
git push -u origin main
\`\`\`

## Plan Self-Review

- Spec coverage: Tasks 1–3 cover UI/state, sensitivity, persistence, analytics, and settings; Tasks 4–7 cover all six mode rules and difficulties; Task 8 covers arena, 3D input, lifecycle, audio, and raycasting; Task 9 covers all screens/results/records; Task 10 covers environment fallback, QA, documentation, performance warning, and release.
- Placeholder scan: no future-work placeholders or undefined task references remain.
- Type consistency: \`AimModeId\`, \`Difficulty\`, \`TrainingMode\`, \`AimTrainingResult\`, \`StorageService\`, and \`TrainingEngine\` are introduced before their consuming tasks.
