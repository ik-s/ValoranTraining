# Accounts, Ranking, and Result Detail Design

## Goal

Add account-backed training records and a public leaderboard without adding a
password-based sign-up flow. Preserve the existing dark, high-contrast training
experience and allow guests to keep training without interruption.

## Product Decisions

- Authentication uses **Google only** through Supabase Auth.
- Training remains available while signed out. Signing in is required only to
  persist a run to the shared leaderboard and cloud record history.
- The leaderboard is a global, friends-comparison feature, not an anti-cheat
  competitive ladder. The client submits only completed, schema-validated runs.
- Existing local history remains available. Signed-in users additionally see
  their cloud history; a local run is uploaded only after a successful sign-in.

## Navigation and UI

- The top navigation adds `RANKING` and an account control. Signed-out users see
  `GOOGLE LOGIN`; signed-in users see their display name and a logout action.
- A training mode card is fully clickable and keyboard-accessible. Selecting a
  card updates the existing selected-mode panel without starting a session.
  The selected card uses the product's cyan accent border and a restrained
  tinted surface; its internal action uses the same selection handler.
- The records list uses buttons rather than inert rows. Selecting one opens the
  existing result detail presentation with the exact saved result, including
  mode-specific metrics, while preserving an explicit way back to records.
- The ranking screen defaults to `GRID SHOT / NORMAL / 60 seconds` and provides
  mode, difficulty, and duration filters. Each row exposes rank, nickname,
  score, accuracy where the mode measures it, and completed date.

## Data Model

Supabase owns three tables:

1. `profiles`: one row per `auth.users` id; contains a unique, safe display
   name and timestamps. Google email is never displayed publicly.
2. `training_runs`: immutable completed-run payloads, owner id, mode,
   difficulty, duration, score, completed time, and JSON mode metrics.
3. `leaderboard_runs`: a read-only view/function returning the best qualifying
   run per profile for a selected mode/difficulty/duration.

Row-level security permits an authenticated user to create and read only their
own profile and raw runs. A public, carefully limited leaderboard RPC/view
returns display name and non-sensitive aggregate fields only. Input constraints
limit modes, difficulties, supported durations, non-negative scores, and
bounded metrics. No service-role credential ships to the browser.

## Client Architecture

- Add a Supabase browser client only when `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` are configured. With neither value, all
  existing guest behavior stays functional and the account control explains
  that online features are unavailable rather than failing at runtime.
- Add an account service for session observation, Google redirect sign-in,
  profile lookup, result persistence, record retrieval, and leaderboard
  queries. Local storage remains the offline cache/guest-history source.
- Map persisted database rows to the existing `TrainingResult` contract rather
  than duplicating result rendering or inventing a second result UI.

## Acceptance Criteria

1. Clicking or pressing Enter/Space on any mode card selects it, and exactly
   one selected card is visibly emphasized.
2. A signed-out user can train normally; a signed-in Google user can sign out,
   save completed runs, and reload to see their cloud records.
3. Leaderboard filtering returns only the requested mode, difficulty, and
   duration, with no email or raw user id exposed.
4. Every record row can open a detail view that shows the saved general and
   mode-specific statistics.
5. RLS prevents one account from selecting, inserting, updating, or deleting
   another account's raw profile or training runs.
6. Unit tests cover card selection, result-detail navigation, row mapping,
   configuration fallback, and leaderboard filter requests. SQL policy checks
   are included with the migration.

## Rollout

1. Apply the checked-in Supabase migration to a Supabase project.
2. Add the public URL and local development URL to Google OAuth/Supabase redirect
   allowlists, then configure the two Vite public variables in the deployment.
3. Verify Google login, record upload, ranking visibility, RLS, and the signed-
   out fallback before publishing.
