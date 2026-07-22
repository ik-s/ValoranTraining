# Hidden Sensitivity Offset Design

**Date:** 2026-07-23  
**Status:** Approved for specification review

## Goal

Account for the observed browser input-scale gap so that the aim trainer
feels closer to VALORANT, without exposing an alternative sensitivity value
to players.

## User-facing behavior

- The player continues to enter and see their VALORANT in-game sensitivity
  everywhere in the product.
- Training configuration, the HUD, results, records, and eDPI calculations
  continue to show that original value.
- The training camera uses an internal effective sensitivity equal to the
  displayed sensitivity plus `0.19`.
- Example: an entered sensitivity of `0.24` remains displayed as `0.24`, while
  camera rotation is calculated with `0.43`.

## Implementation design

1. Define the temporary browser-input offset (`0.19`) in the sensitivity
   domain layer, alongside the existing VALORANT yaw coefficient.
2. Add one pure domain function that turns a displayed VALORANT sensitivity
   into its effective training value. It must validate/clamp values consistently
   with the current sensitivity validation rules before applying the offset.
3. Update the camera rotation path to call that domain function immediately
   before converting pointer movement to yaw and pitch.
4. Keep persisted settings unchanged: no effective sensitivity, calibration
   multiplier, or hidden value is written to local storage.
5. Do not create a visible settings control, diagnostic screen, route, helper
   text, or result field for this temporary adjustment.

## Scope and exclusions

- This is a global temporary offset for all aim-training modes and all
  difficulties.
- It affects live camera rotation only.
- It does not alter eDPI, cm/360 display calculations, sensitivity form
  validation/copy, records, scoring, target behavior, or crosshair settings.
- It deliberately replaces the previously discussed hidden diagnostic route;
  no diagnostic route will be added.
- It is a product calibration decision, not a claim of exact hardware-level
  VALORANT parity. A future measured calibration can replace this offset.

## Tests and acceptance criteria

- Unit test: `0.24` resolves to an effective sensitivity of `0.43`.
- Unit test: the offset is applied exactly once to rotation calculations.
- Unit test: the original displayed sensitivity is not mutated by the
  conversion.
- Existing camera-controller and pointer-lock test suites continue to pass.
- Manual smoke check: settings, training HUD, results, and records still show
  the entered sensitivity, while the trainer has the adjusted turning speed.

## Removal plan

The offset must be isolated in the domain layer behind a clearly named
constant/function so it can be changed or removed in one place after a proper
device/browser measurement exercise.
