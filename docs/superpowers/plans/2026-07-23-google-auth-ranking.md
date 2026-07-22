# Google Auth, Ranking, and Record Detail Implementation Plan

> **Execution rule:** Complete one numbered task at a time. Add or update its
> tests before implementation, run the focused test command, then continue.

## 1. Make training selection and result records directly interactive

**Files**
- Modify: `src/app/App.ts`
- Modify: `src/styles.css` (or the stylesheet that owns `.mode-card`)
- Modify: `src/app/AppState.ts` and `src/app/AppRouter.ts` only if record detail
  needs an explicit source/back state
- Test: `tests/app/app-flow.test.ts`
- Test: `tests/app/result-view.test.ts`

**Steps**
1. Add failing DOM/app-flow tests proving that clicking a mode card, and using
   Enter/Space while it is focused, selects exactly that mode without starting a
   run. Assert the selected-card class/ARIA state is present exactly once.
2. Make each card a semantic button-like control with no nested interactive
   element conflict. Route its pointer and keyboard activation to the existing
   mode-selection handler. Apply the existing cyan/red visual language through
   a dedicated selected-state class.
3. Add a failing test that activates a stored record and verifies the result
   renderer receives that exact saved `AimTrainingResult`, including its
   mode-specific metrics and a records back destination.
4. Add record item identifiers/handlers and route selected records through the
   existing `renderResult` path instead of recreating result-stat markup.
5. Run `npm test -- --run tests/app/app-flow.test.ts tests/app/result-view.test.ts`.

## 2. Add typed account, remote-record, and ranking boundaries

**Files**
- Add: `src/infrastructure/SupabaseConfig.ts`
- Add: `src/infrastructure/SupabaseAccountService.ts`
- Add: `src/domain/RemoteTrainingRecords.ts`
- Modify: `src/domain/Results.ts` only if a non-rendering persisted row type is
  required
- Modify: `src/app/App.ts`
- Test: `tests/infrastructure/supabase-config.test.ts`
- Test: `tests/domain/remote-training-records.test.ts`

**Steps**
1. Add failing tests for absent Vite config (offline/guest fallback), valid
   public config, database-row-to-`AimTrainingResult` mapping, and leaderboard
   request parameters. Never test a real network call in unit tests.
2. Install `@supabase/supabase-js`; add a config factory that returns no client
   until both public browser values exist. Use only the project URL and
   publishable/anon key; never introduce a service-role value.
3. Create an account service with session observation, `signInWithGoogle`,
   `signOut`, profile retrieval, immutable run insertion, own-run retrieval,
   and a parameterized leaderboard RPC call.
4. Keep remote data normalization outside `App.ts` and validate allowed modes,
   difficulties, durations, score numbers, timestamps, and JSON metric shapes
   before rendering them.
5. Run `npm test -- --run tests/infrastructure/supabase-config.test.ts tests/domain/remote-training-records.test.ts`.

## 3. Integrate Google session, cloud records, and ranking screens

**Files**
- Modify: `src/app/App.ts`
- Modify: `src/app/AppState.ts`
- Modify: `src/app/AppRouter.ts`
- Modify: application stylesheet(s) containing the topbar, records, and panels
- Test: `tests/app/app-flow.test.ts`
- Add: `tests/app/ranking-view.test.ts`

**Steps**
1. Add failing UI tests for signed-out login affordance, signed-in account
   label/logout affordance, graceful no-config messaging, and completion-time
   cloud-save invocation that cannot block the local result screen.
2. Add a `RANKING` navigation target and render mode, difficulty, and 30/60
   second filters with a loading, empty, and error state. No private identity
   fields appear in markup.
3. Observe session changes during app startup. Keep training usable for guests;
   offer Google sign-in at topbar and after completing a guest run. On sign-in,
   read the profile and own cloud history, then combine/deduplicate it with
   local records using stable run identity rather than score alone.
4. Persist a completed run asynchronously only for authenticated users. A
   failed upload stays local and shows an actionable non-blocking status.
5. Run `npm test -- --run tests/app/app-flow.test.ts tests/app/ranking-view.test.ts`.

## 4. Provision and verify the Supabase schema and OAuth setup

**Files**
- Add: `supabase/migrations/20260723000000_accounts_and_ranking.sql`
- Add: `.env.example`
- Modify: `README.md`
- Test/verification: Supabase SQL checks and `npm test`

**Steps**
1. Add a migration that creates `profiles` and immutable `training_runs`, a
   profile-creation trigger, validation constraints, RLS policies, and a
   sanitizing `get_leaderboard(mode, difficulty, duration)` RPC. The RPC must
   return only rank, nickname, public score, nullable public accuracy, and
   completion time. Set a safe function search path and grant only execute.
2. Add public-only Vite variable names to `.env.example`; document Google OAuth
   redirect URLs for local development and the deployed public URL. Do not
   commit credentials.
3. After the user approves a `ValoranTraining` Supabase project/organization
   and confirms its displayed cost, apply the migration through the Supabase
   tool. Configure Google OAuth in the Supabase dashboard and add the deployed
   Sites URL as an allowed redirect.
4. Use direct SQL as both an authenticated user and an unrelated user to prove
   raw-profile/raw-run RLS isolation; call the leaderboard RPC to prove the
   limited public shape. Run Supabase security advisors after migration.
5. Run `npm test`, `npm run build`, browser-check signed-out training, Google
   sign-in, result upload, records detail, filters, and logout. Only then
   commit, push, and deploy when requested.
