# Profile Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Add a first-login profile setup flow with nickname and profile photo, plus a compact avatar account menu in the existing header.

**Architecture:** Extend the existing \`profiles\` row with completion and avatar data, store user-owned photos in a Supabase Storage bucket, and keep browser/backend calls in \`SupabaseAccountService\`. Add a dedicated profile form and \`profile\` application screen; \`App\` owns routing, first-login redirection, and account-menu state.

**Tech Stack:** TypeScript, Vite, Vitest/JSDOM, Supabase Auth, Postgres RLS, Supabase Storage.

## Global Constraints

- Preserve the existing dark VALORAN TRAINING visual system and topbar navigation.
- Show only an avatar button immediately right of \`SETTINGS\`; show account actions only after it is clicked.
- First authenticated session with \`profile_completed = false\` must route to \`profile\`.
- Allow JPEG, PNG, and WebP photos up to 2 MiB; derive the Storage path from the active auth user.
- Do not add dependencies or expose Supabase privileged keys in the client.
- Develop on \`main\` with inline execution, as explicitly authorized by the user.

---

### Task 1: Model profile completion and avatar storage in the account service

**Files:**
- Modify: \`src/infrastructure/SupabaseAccountService.ts\`
- Test: \`tests/infrastructure/supabase-account-service.test.ts\`

**Interfaces:**
- Produces \`AccountProfile { id: string; displayName: string; avatarUrl: string | null; profileCompleted: boolean }\`.
- Produces \`ProfileSaveInput { displayName: string; avatarFile: File | null }\`.
- Produces \`saveProfile(input: ProfileSaveInput): Promise<AccountProfile>\`.

- [ ] **Step 1: Write the failing account-profile tests**

~~~ts
it("uses profile completion and the Google avatar fallback", async () => {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { display_name: "서버 닉네임", avatar_url: null, profile_completed: false },
    error: null,
  });
  const service = new SupabaseAccountService({
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) }),
  } as never);

  await expect(service.getProfile({ id: "a-b", user_metadata: { avatar_url: "https://google.example/me.png" } } as never))
    .resolves.toEqual({ id: "a-b", displayName: "서버 닉네임", avatarUrl: "https://google.example/me.png", profileCompleted: false });
});

it("rejects an unsupported avatar before upload", async () => {
  const service = new SupabaseAccountService({ auth: { getUser: vi.fn() } } as never);
  await expect(service.saveProfile({ displayName: "훈련생", avatarFile: new File(["x"], "avatar.gif", { type: "image/gif" }) }))
    .rejects.toThrow("JPEG, PNG, WebP");
});
~~~

- [ ] **Step 2: Run the focused test to verify it fails**

Run: \`npm test -- tests/infrastructure/supabase-account-service.test.ts\`

Expected: FAIL because \`avatarUrl\`, \`profileCompleted\`, and \`saveProfile\` do not exist.

- [ ] **Step 3: Implement the minimal service behavior**

~~~ts
export interface ProfileSaveInput {
  displayName: string;
  avatarFile: File | null;
}

const avatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxAvatarBytes = 2 * 1024 * 1024;

async saveProfile(input: ProfileSaveInput): Promise<AccountProfile> {
  const { data, error } = await this.client.auth.getUser();
  if (error || !data.user) throw new Error("로그인이 필요합니다.");
  const displayName = input.displayName.trim();
  if (displayName.length < 3 || displayName.length > 32) {
    throw new Error("닉네임은 3~32자로 입력해주세요.");
  }
  // Validate the optional file, upload it to data.user.id + "/avatar",
  // update the signed-in user's row, then return the parsed AccountProfile.
}
~~~

- [ ] **Step 4: Run the focused test to verify it passes**

Run: \`npm test -- tests/infrastructure/supabase-account-service.test.ts\`

Expected: PASS.

- [ ] **Step 5: Commit the service and tests**

~~~bash
git add src/infrastructure/SupabaseAccountService.ts tests/infrastructure/supabase-account-service.test.ts
git commit -m "feat: add profile account data service"
~~~

### Task 2: Create a profile setup form and route it from first login

**Files:**
- Create: \`src/ui/ProfileForm.ts\`
- Modify: \`src/app/AppState.ts\`
- Modify: \`src/app/App.ts\`
- Modify: \`src/styles/app.css\`
- Test: \`tests/ui/profile-form.test.ts\`
- Test: \`tests/app/app-flow.test.ts\`

**Interfaces:**
- Consumes \`AccountProfile\` and \`ProfileSaveInput\` from Task 1.
- Produces \`createProfileForm(profile, onSave): HTMLFormElement\`.
- Produces the \`"profile"\` \`AppScreen\` and \`mountProfileForm()\`.

- [ ] **Step 1: Write the failing UI and route tests**

~~~ts
it("opens profile setup after restoring an incomplete account", async () => {
  const { root } = mountApp({
    getCurrentAccount: vi.fn().mockResolvedValue({ id: "me", displayName: "훈련생", avatarUrl: null, profileCompleted: false }),
    getOwnRuns: vi.fn().mockResolvedValue([]),
    observeAuthChanges: vi.fn().mockReturnValue(() => undefined),
  } as unknown as SupabaseAccountService);

  await vi.waitFor(() => expect(root.querySelector("[data-profile-form]")).not.toBeNull());
});

it("submits a trimmed nickname and selected image", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const form = createProfileForm({ id: "me", displayName: "훈련생", avatarUrl: null, profileCompleted: false }, save);
  form.querySelector<HTMLInputElement>("[name=displayName]")!.value = "  조준왕  ";
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(save).toHaveBeenCalledWith({ displayName: "조준왕", avatarFile: null }));
});
~~~

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: \`npm test -- tests/ui/profile-form.test.ts tests/app/app-flow.test.ts\`

Expected: FAIL because the form module and \`profile\` screen do not exist.

- [ ] **Step 3: Implement the profile screen and first-login guard**

~~~ts
export const appScreens = [/* existing screens */, "profile"] as const;

if (this.account && !this.account.profileCompleted) {
  this.router.navigate("profile");
  return;
}

await onSave({ displayName: nickname.value.trim(), avatarFile: selectedAvatar });
~~~

Render the screen with the existing panel and heading components. Show an actual image preview only when Google or uploaded image data exists; otherwise emphasize the photo chooser. Save through \`accountService.saveProfile\`, replace \`this.account\` with the returned profile, and navigate to \`home\`.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: \`npm test -- tests/ui/profile-form.test.ts tests/app/app-flow.test.ts\`

Expected: PASS.

- [ ] **Step 5: Commit the profile route and form**

~~~bash
git add src/app/App.ts src/app/AppState.ts src/ui/ProfileForm.ts src/styles/app.css tests/app/app-flow.test.ts tests/ui/profile-form.test.ts
git commit -m "feat: add first-login profile setup"
~~~

### Task 3: Replace the topbar account text with an accessible avatar menu

**Files:**
- Modify: \`src/app/App.ts\`
- Modify: \`src/styles/app.css\`
- Test: \`tests/app/app-flow.test.ts\`

**Interfaces:**
- Consumes completed \`AccountProfile\` from Task 1.
- Produces \`toggle-account-menu\` and \`data-screen="profile"\`.

- [ ] **Step 1: Write the failing header-menu test**

~~~ts
it("shows account actions only after the avatar is clicked", async () => {
  const { root } = mountApp({
    getCurrentAccount: vi.fn().mockResolvedValue({ id: "me", displayName: "조준왕", avatarUrl: "https://images.example/avatar.png", profileCompleted: true }),
    getOwnRuns: vi.fn().mockResolvedValue([]),
    observeAuthChanges: vi.fn().mockReturnValue(() => undefined),
  } as unknown as SupabaseAccountService);

  await vi.waitFor(() => expect(root.querySelector("[data-action=toggle-account-menu]")).not.toBeNull());
  expect(root.textContent).not.toContain("LOG OUT");
  root.querySelector<HTMLButtonElement>("[data-action=toggle-account-menu]")!.click();
  expect(root.textContent).toContain("프로필 설정");
  expect(root.textContent).toContain("LOG OUT");
});
~~~

- [ ] **Step 2: Run the focused test to verify it fails**

Run: \`npm test -- tests/app/app-flow.test.ts\`

Expected: FAIL because the signed-in header has no avatar menu.

- [ ] **Step 3: Implement the compact account menu**

~~~ts
private accountMenuOpen = false;

case "toggle-account-menu":
  this.accountMenuOpen = !this.accountMenuOpen;
  this.renderAfterAccountChange();
  return;
~~~

Use one 34px circular button immediately after the nav, with \`aria-haspopup="menu"\` and \`aria-expanded\`. Render \`프로필 설정\` and \`LOG OUT\` only while it is open, close it after either action, and close it on Escape or a click outside \`.account-control\`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: \`npm test -- tests/app/app-flow.test.ts\`

Expected: PASS.

- [ ] **Step 5: Commit the header menu**

~~~bash
git add src/app/App.ts src/styles/app.css tests/app/app-flow.test.ts
git commit -m "feat: add compact avatar account menu"
~~~

### Task 4: Apply the secure Supabase schema and verify the complete feature

**Files:**
- Create: \`supabase/migrations/20260723000003_profile_setup.sql\`
- Modify: \`docs/superpowers/specs/2026-07-23-profile-setup-design.md\`

**Interfaces:**
- Produces \`profiles.avatar_url text\`, \`profiles.profile_completed boolean\`, and \`profiles.updated_at timestamptz\`.
- Produces public \`profile-avatars\` bucket with owner-scoped Storage policies.

- [ ] **Step 1: Write migration acceptance checks before applying it**

~~~sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('avatar_url', 'profile_completed', 'updated_at');

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'profile-avatars';
~~~

Expected after migration: all three profile columns and one public 2 MiB avatar bucket.

- [ ] **Step 2: Create and apply the migration**

~~~sql
alter table public.profiles
  add column avatar_url text,
  add column profile_completed boolean not null default false,
  add column updated_at timestamptz not null default now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
~~~

Add owner-only \`insert\`, \`update\`, and \`delete\` policies on \`storage.objects\` that require \`bucket_id = 'profile-avatars'\` and \`(storage.foldername(name))[1] = (select auth.uid()::text)\`. Add public \`select\` only for this bucket. Expand the existing \`profiles\` column grant and update policy without allowing a user to change \`id\`.

- [ ] **Step 3: Apply the migration through the Supabase migration tool and run security advisors**

Expected: migration applies once, policy scan reports no new error-level finding, and an authenticated user can only write their own folder.

- [ ] **Step 4: Run all automated checks**

Run: \`npm test -- --run && npm run build\`

Expected: all tests pass and Vite build completes.

- [ ] **Step 5: Commit migration, then push and deploy**

~~~bash
git add supabase/migrations/20260723000003_profile_setup.sql docs/superpowers/specs/2026-07-23-profile-setup-design.md
git commit -m "feat: secure profile avatar storage"
git push origin main
~~~

Deploy the current \`main\` source to the existing public Sites project, then verify Google sign-in, first-login redirect, profile save, avatar menu, and logout in the deployed application.
