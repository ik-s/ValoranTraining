# Hidden Sensitivity Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make all training camera rotation use a hidden +0.19 sensitivity offset while every player-facing surface continues to show the entered VALORANT sensitivity.

**Architecture:** Keep the temporary calibration policy in ValorantSensitivityService as a named exported constant and one pure conversion function. CameraController remains the only consumer of the effective value, so UI state, storage, eDPI, cm/360, results, and records retain the original value.

**Tech Stack:** TypeScript, Vitest, Three.js camera integration.

## Global Constraints

- Apply exactly +0.19 to the displayed sensitivity only for live training camera rotation.
- 0.24 must remain displayed/persisted as 0.24 and resolve to an effective value of 0.43 for camera rotation.
- Do not add a diagnostic route, a setting, helper copy, a stored effective value, or a result/record field.
- Do not alter eDPI, cm/360, crosshair, targets, scoring, difficulty, or pointer-lock behavior.
- Keep the offset isolated behind a named domain constant and function so it can later be removed in one edit.

---

## File Structure

- Modify: src/domain/ValorantSensitivityService.ts — own the temporary offset and convert a player-visible sensitivity into the effective training sensitivity.
- Modify: src/engine/CameraController.ts — consume the conversion once per movement axis before calculating yaw/pitch deltas.
- Modify: tests/domain/sensitivity.test.ts — lock down the conversion and non-mutation of the displayed scalar.
- Modify: tests/engine/camera-controller.test.ts — prove camera yaw uses the offset once, not zero or multiple times.

### Task 1: Isolate the temporary offset in the sensitivity domain

**Files:**
- Modify: tests/domain/sensitivity.test.ts:3-9, 13-18
- Modify: src/domain/ValorantSensitivityService.ts:1-40

**Interfaces:**
- Consumes: MIN_SENSITIVITY and MAX_SENSITIVITY already declared in ValorantSensitivityService.ts.
- Produces: TRAINING_SENSITIVITY_OFFSET: number and calculateEffectiveTrainingSensitivity(displayedSensitivity: number): number for engine code.

- [ ] **Step 1: Write the failing domain test**

Add the new imports and test to tests/domain/sensitivity.test.ts:

~~~ts
import {
  TRAINING_SENSITIVITY_OFFSET,
  VALORANT_YAW_COEFFICIENT,
  calculateEdpi,
  calculateEffectiveTrainingSensitivity,
  calculateRotationDelta,
  clampCalibrationMultiplier,
  validateValorantSensitivity,
} from "../../src/domain/ValorantSensitivityService";

it("adds the hidden training offset without changing the displayed sensitivity", () => {
  const displayedSensitivity = 0.24;

  expect(TRAINING_SENSITIVITY_OFFSET).toBe(0.19);
  expect(calculateEffectiveTrainingSensitivity(displayedSensitivity)).toBe(0.43);
  expect(displayedSensitivity).toBe(0.24);
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm test -- tests/domain/sensitivity.test.ts

Expected: FAIL because TRAINING_SENSITIVITY_OFFSET and calculateEffectiveTrainingSensitivity are not exported yet.

- [ ] **Step 3: Add the minimal domain implementation**

Add this immediately below VALORANT_YAW_COEFFICIENT in src/domain/ValorantSensitivityService.ts:

~~~ts
export const TRAINING_SENSITIVITY_OFFSET = 0.19;
~~~

Add this after clampCalibrationMultiplier and before calculateRotationDelta:

~~~ts
export const calculateEffectiveTrainingSensitivity = (
  displayedSensitivity: number,
): number =>
  Math.min(MAX_SENSITIVITY, Math.max(MIN_SENSITIVITY, displayedSensitivity)) +
  TRAINING_SENSITIVITY_OFFSET;
~~~

This clamps only the incoming displayed value to the same supported range as validation, then applies the required +0.19 offset. It does not modify storage or any player-visible calculation.

- [ ] **Step 4: Run the domain test to verify it passes**

Run: npm test -- tests/domain/sensitivity.test.ts

Expected: PASS, including the new 0.24 → 0.43 assertion.

- [ ] **Step 5: Commit the isolated domain policy**

~~~bash
git add src/domain/ValorantSensitivityService.ts tests/domain/sensitivity.test.ts
git commit -m "feat: add hidden training sensitivity offset"
~~~

### Task 2: Apply the effective sensitivity exactly once in camera rotation

**Files:**
- Modify: tests/engine/camera-controller.test.ts:3-15
- Modify: src/engine/CameraController.ts:1, 17-34

**Interfaces:**
- Consumes: calculateEffectiveTrainingSensitivity(displayedSensitivity: number): number from src/domain/ValorantSensitivityService.ts.
- Produces: camera yaw/pitch deltas calculated from displayedSensitivity + 0.19, with the original calibrationMultiplier still applied once.

- [ ] **Step 1: Write the failing camera integration test**

Replace the first test in tests/engine/camera-controller.test.ts with:

~~~ts
it("applies the hidden sensitivity offset exactly once to yaw", () => {
  const controller = new CameraController(0.32, 1);

  controller.applyMouseDelta(100, 0);

  expect(controller.getRotation().yaw).toBe(
    100 * VALORANT_YAW_COEFFICIENT * (0.32 + 0.19),
  );
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm test -- tests/engine/camera-controller.test.ts

Expected: FAIL because the controller still passes the displayed 0.32 directly into calculateRotationDelta.

- [ ] **Step 3: Apply the conversion once in CameraController**

Update the import in src/engine/CameraController.ts:

~~~ts
import {
  calculateEffectiveTrainingSensitivity,
  calculateRotationDelta,
} from "../domain/ValorantSensitivityService";
~~~

At the start of applyMouseDelta, create the effective value once and use it for both axes:

~~~ts
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
~~~

- [ ] **Step 4: Run focused tests to verify they pass**

Run: npm test -- tests/domain/sensitivity.test.ts tests/engine/camera-controller.test.ts

Expected: PASS. The camera test confirms one offset is used; the domain test confirms the visible scalar has not changed.

- [ ] **Step 5: Commit the camera integration**

~~~bash
git add src/engine/CameraController.ts tests/engine/camera-controller.test.ts
git commit -m "feat: apply training sensitivity offset to camera"
~~~

### Task 3: Verify the untouched product surfaces

**Files:**
- No production file changes.

**Interfaces:**
- Consumes: committed domain and camera changes from Tasks 1–2.
- Produces: evidence that no unrelated display/storage behavior regressed.

- [ ] **Step 1: Run the complete automated suite**

Run: npm test -- --run

Expected: PASS with no failed tests.

- [ ] **Step 2: Run the production build**

Run: npm run build

Expected: TypeScript type-check and Vite build complete successfully.

- [ ] **Step 3: Perform the manual smoke checklist**

In the existing app, enter 0.24 as VALORANT sensitivity, save it, start any training mode, and check:

~~~text
[ ] Settings continues to show 0.24.
[ ] Training HUD continues to show 0.24.
[ ] Results and records continue to show 0.24.
[ ] eDPI and cm/360 displays remain based on 0.24.
[ ] Camera turning speed follows the internally effective 0.43 value.
~~~

- [ ] **Step 4: Confirm the final diff is restricted to the plan scope**

Run: git diff HEAD~2..HEAD -- src/domain/ValorantSensitivityService.ts src/engine/CameraController.ts tests/domain/sensitivity.test.ts tests/engine/camera-controller.test.ts

Expected: only the named offset function/constant, its one camera use, and the corresponding test assertions appear.

