# VALORANT Aim Trainer MVP Design

> Source of truth: \`C:\Users\tjsvu\Downloads\2026-07-22-valorant-aim-trainer-design.md\` (design status: approved).

## Product intent

Build a free, desktop-first browser aim trainer for players who use VALORANT sensitivity. It must accept mouse DPI and VALORANT in-game sensitivity, calculate eDPI, let the player calibrate browser mouse rotation, run six 60-second 3D aim modes, and persist detailed local results. It is a fan portfolio project, not a Riot product.

## Scope and platform

- Target: Windows desktop Chrome, physical mouse, WebGL and Pointer Lock.
- Stack: Vite, TypeScript, Three.js, Vanilla CSS, Vitest, browser \`localStorage\`.
- No server, authentication, payments, advertising, rankings, maps, movement, recoil, weapon simulation, mobile play, or other FPS profiles.
- Show a clear desktop-required message when the browser is not supported.
- Do not use official VALORANT logos, agent images, maps, UI, bot models, textures, or game audio.

## Primary experience

\`\`\`text
Set DPI + VALORANT sensitivity → confirm eDPI → optionally calibrate 360°
→ configure crosshair → choose mode and difficulty → 3-second countdown
→ fixed-position 60-second 3D session → detailed result → retry or inspect records
\`\`\`

The app stores current settings, the last selected mode/difficulty, up to ten recent results, and one personal best for each of the six modes at each of three difficulties.

## Global interaction rules

- DPI is an integer from 100 to 20,000. Sensitivity is 0.001 to 10 with at most four decimal places. Unusual but valid values warn rather than block.
- \`eDPI = DPI × VALORANT sensitivity\`.
- Browser DPI cannot be detected or changed. It is display and calculation data only.
- Camera movement requests Pointer Lock with \`unadjustedMovement: true\`; on failure it retries standard Pointer Lock. Standard input remains playable and recommends calibration.
- Rotation is derived in one service: mouse movement × centralized VALORANT coefficient × sensitivity × calibration multiplier.
- Calibration multiplier is constrained to 0.5–1.5; coarse changes are 0.01 and fine changes are 0.001.
- All sessions have a 3-second countdown and a fixed 60-second running duration. Timing is based on \`performance.now()\`, never frames.
- ESC, Pointer Lock release, tab invisibility, focus loss, or unexpected fullscreen exit pauses the session. Resume requires user interaction and a new countdown.
- The player remains stationary. Mouse rotates the camera. Center-screen raycasting determines hits. There is no recoil, spread, magazine, reload, or screen shake.

## Visual and accessibility rules

- Use an original dark tactical simulation visual language: charcoal/black surfaces, restrained red for emphasis, cyan for success, angular panels, grids, and sparse glow.
- Body copy is Korean-first. Short tactical labels may be English.
- Never convey state by color alone. Normal controls need labels, focus visibility, contrast, and keyboard support.
- Crosshair options: color, line length, thickness, center gap, optional center dot, and center-dot size. Its visual center must equal the Three.js raycast origin.
- Use basic Three.js geometry for the original low-poly training robot; visual meshes and head/body hitboxes are separate.

## Training arena and engine

The fixed \`AimArenaScene\` owns floor, walls, frame, lighting, virtual spawn hemisphere, and player start position. The engine composes it with a mode; modes never create arena infrastructure. The engine owns renderer/camera/input lifecycle, game loop, resize handling, pointer lock, countdown/pause/complete state, hit testing, and disposal.

Modes expose renderer-independent rules through a shared interface:

\`\`\`ts
interface TrainingMode {
  initialize(context: TrainingModeContext): void;
  update(deltaTime: number, now: number): void;
  handleShot(hit: HitResult, now: number): void;
  getMetrics(): ModeMetrics;
  dispose(): void;
}
\`\`\`

## Difficulty and analytics

Every mode supports \`easy\`, \`normal\`, and \`hard\` through data presets rather than scattered conditionals. Target dimensions are specified as angular size and converted to world size at their target distance. Directional analytics use \`center | left | right | up | down\`: center is within 10° yaw and pitch; otherwise the largest signed axis selects the zone.

Clicking modes score a 100-point base hit plus speed/reaction and combo bonuses. Combo bonuses are 0 for 1–4, +10 for 5–9, +20 for 10–19, and +30 at 20+. Misses reset the combo without direct score loss unless a mode defines a penalty.

Every complete result includes its score, core metrics, sensitivity/input snapshots, direction metrics, and rule-based strongest/first-improvement feedback. Directions with fewer than five samples cannot be called a weakness. Track mode has no click accuracy and records it as \`null\`.

## Mode definitions

### Grid Shot

Keep three circular targets active. Recreate only the hit target; do not auto-expire targets; keep consecutive spawns separated. Difficulty is 5.0°/3.5°/2.3° target size, ±35°/±50°/±65° horizontal range, ±18°/±24°/±30° vertical range, and 12°/16°/20° minimum separation. Report hit rate, hits per second, transition time, flick angle buckets, direction performance, and max combo.

### Micro Flick

Keep one circular target. On a hit, spawn the next near the preceding target with balanced horizontal and vertical distribution. Difficulty sizes are 3.4°/2.4°/1.6° and target displacement ranges are 4–10°/6–14°/8–18°. Report micro-adjustment time, flick-angle buckets, axis asymmetry, hits per second, and max combo.

### Reaction Shot

Cycle waiting → visible target → hit or timeout → waiting. Clicking during waiting is a false start: minus 50, reset combo, restart waiting. Difficulty sizes are 4.5°/3.2°/2.1°; visibility windows 1.5/1.0/0.7 seconds; spawn waiting ranges 0.8–1.8/0.6–2.2/0.5–2.8 seconds. Report mean/median/fastest/slowest successful reaction, timeout count, false starts, direction reaction, and hit rate.

### Target Switching

Show 4/5/6 targets and highlight exactly one active target. A hit activates another target far enough from the prior one; reposition all targets every 8/6/4 correct hits. Inactive target hits score -30 and reset combo; empty clicks reset combo. Report switching time/angle, angle-bucket success, wrong-target and empty misses, opposite-direction performance, normal hits per second, and max combo.

### Strafe Track

Keep one target for all 60 seconds. It moves mainly left/right, reverses at boundaries, and changes speed and direction on a timer; normal/hard add slight vertical movement. There is no shooting. Each frame captures angular error, inside-target state, speed, and horizontal direction. Difficulty speed ranges are 12–18°/20–28°/30–42° per second with spans ±30°/±45°/±60°. Report tracking accuracy, inside ratio, mean angular error, longest continuous tracking, left/right accuracy, reversal recovery, and speed-bucket accuracy. Do not persist raw frames.

### Headshot Only

Show one original low-poly robot with independent head and body hitboxes. Head hits remove and respawn the robot; body hits keep it, subtract 50, and reset combo; empty shots reset combo; timeout respawns it. Head hits score 120 plus speed and combo bonuses. Difficulty head sizes are 3.4°/2.3°/1.5° with 3.0/2.0/1.3 second location holds. Report head hits, overall accuracy, headshot ratio, body/empty misses, average head-hit time, distance/direction head success, max head streak, and timeouts.

## Persistence and error handling

Only \`StorageService\` accesses \`localStorage\`, under the single root key \`valorant-aim-trainer:data\`. It validates and migrates versioned data, preserves valid portions of corrupted data, caps recents at ten per mode/difficulty, updates personal bests, can clear records without clearing settings, and can fully reset data.

If WebGL fails, clean up and return to mode selection without storing a result. If persistence fails after a completed session, retain the result screen and show a warning. An unsupported pointer-lock environment stays at the ready screen and offers retry. At under 50 FPS during preflight, warn but allow training. Dispose renderer resources, animation frames, listeners, pointer-lock listeners, audio, canvas, targets, geometry, and material references on every exit.

## Verification

Vitest must cover sensitivity calculation and validation, rotation and calibration bounds, score/combo/reaction math, direction zones, mode presets and renderer-free rules, strafe aggregates, headshot ratio, storage cap/PB/corruption/migration behavior, and feedback selection. Browser QA must cover Pointer Lock raw/standard fallback, countdown, pause/resume, timer completion, central raycast, crosshair alignment, persistence, reset, resize, repeated restarts, and unsupported environments.
