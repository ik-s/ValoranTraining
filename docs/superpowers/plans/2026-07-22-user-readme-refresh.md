# User README Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a Korean, end-user-oriented README with the 공개 사이트 URL and 실제 동작 application screenshots, then align `.gitignore` with the project's source-control policy.

**Architecture:** Keep the application unchanged. Store two JPEG screenshots under `docs/images/`, then make `README.md` the single public entry point that links to the live site and references those local assets. Expand `.gitignore` only for generated, local, or secret-bearing files so deployment metadata and source assets remain versioned.

**Tech Stack:** GitHub-flavored Markdown, JPEG assets, Git ignore patterns, the existing public Sites deployment.

## Global Constraints

- Write the README for Korean general users; omit developer commands, test commands, build instructions, and internal storage details.
- Capture only real running application states from the public deployment; do not use mockups or generated images.
- Keep `.openai/hosting.json`, `docs/`, `scripts/`, and `tests/` tracked.
- Ignore `.env` and `.env.*`, but do not ignore `.env.example`.
- Do not put credentials, tokens, or secrets in any documentation or committed file.

---

### Task 1: Capture real application screenshots

**Files:**
- Create: `docs/images/valoran-training-home.jpg`
- Create: `docs/images/valoran-training-session.jpg`

**Interfaces:**
- Consumes: the public site at `https://valoran-training.peter2385.chatgpt.site`
- Produces: two versioned JPEG files used by the README Markdown image links

- [ ] **Step 1: Open the public home screen in the existing browser**

Navigate to `https://valoran-training.peter2385.chatgpt.site/#home`, wait for the page to render, and use the standard desktop viewport already used for the app. Do not capture browser chrome or annotation overlays.

- [ ] **Step 2: Save the home or training-selection screenshot**

Capture a rendered screen that shows the product name and training selection context. Save it exactly as `docs/images/valoran-training-home.jpg`.

- [ ] **Step 3: Save the running-session screenshot**

Start a short training session through the visible UI, then capture the arena with the target, crosshair, and training HUD visible. Save it exactly as `docs/images/valoran-training-session.jpg`.

- [ ] **Step 4: Verify both assets are real PNG files**

Run:

```powershell
Get-Item "docs/images/valoran-training-home.jpg", "docs/images/valoran-training-session.jpg" | Select-Object Name, Length
```

Expected: both files exist and have non-zero lengths.

- [ ] **Step 5: Commit the screenshot assets**

```powershell
git add docs/images/valoran-training-home.jpg docs/images/valoran-training-session.jpg
git commit -m "docs: add training screenshots"
```

### Task 2: Replace the README with user-facing guidance

**Files:**
- Modify: `README.md`
- Consumes: `docs/images/valoran-training-home.jpg`, `docs/images/valoran-training-session.jpg`
- Produces: a public Korean project guide with working relative image links and a live-site link

**Interfaces:**
- Reads image assets through `docs/images/valoran-training-home.jpg` and `docs/images/valoran-training-session.jpg`
- Links users to `https://valoran-training.peter2385.chatgpt.site`

- [ ] **Step 1: Write the replacement README content**

Replace the existing developer-oriented README with this exact structure and copy, keeping the image paths unchanged:

```markdown
# VALORAN TRAINING

> VALORANT 감도를 기준으로, 브라우저에서 바로 시작하는 3D 에임 훈련

[**훈련 시작하기**](https://valoran-training.peter2385.chatgpt.site)

![Valoran Training 훈련 선택 화면](docs/images/valoran-training-home.jpg)

## 이렇게 시작하세요

1. **감도 입력** — 마우스 소프트웨어에 설정된 실제 DPI와 VALORANT 인게임 감도를 입력합니다.
2. **크로스헤어 설정** — 색상, 선 길이, 굵기, 중앙 간격, 센터 도트를 원하는 형태로 맞춥니다.
3. **훈련 선택** — 모드와 난이도, 30초 또는 60초 훈련 시간을 선택한 뒤 시작합니다.

## 실제 훈련 화면

![Valoran Training 실행 중 화면](docs/images/valoran-training-session.jpg)

마우스로 시야를 움직이고 왼쪽 클릭으로 표적에 반응하세요. `Esc`를 누르면 훈련을 일시정지할 수 있습니다.

## 6가지 훈련 모드

| 모드 | 이런 훈련에 좋아요 |
| --- | --- |
| GRID SHOT | 넓은 각도의 플릭과 빠른 표적 선택 |
| MICRO FLICK | 짧은 거리에서의 미세 조준 수정 |
| REACTION SHOT | 표적을 보고 첫 클릭을 하기까지의 반응 |
| TARGET SWITCHING | 여러 표적 사이를 빠르게 전환하는 능력 |
| STRAFE TRACK | 움직이는 표적을 따라가는 추적 능력 |
| HEADSHOT ONLY | 머리 표적을 정확하게 맞히는 연습 |

모든 모드는 **Easy / Normal / Hard** 난이도를 제공하며, 난이도에 따라 표적 크기·거리·이동·노출 시간이 달라집니다.

## 감도와 DPI 안내

- DPI에는 **현재 마우스 소프트웨어에 설정된 실제 값**을 입력하세요.
- 이 입력값을 바꿔도 브라우저나 마우스의 하드웨어 DPI가 변경되지는 않습니다.
- 입력한 DPI는 eDPI와 VALORANT 360° 거리 계산에 사용됩니다.
- 게임과 가장 비슷하게 사용하려면 VALORANT에서 쓰는 감도와 실제 DPI를 그대로 입력하세요.

## 사용 환경과 조작

- Windows 데스크톱 Chrome과 물리 마우스 환경을 권장합니다.
- WebGL과 Pointer Lock을 사용하므로, 훈련 시작 시 화면 클릭으로 마우스 잠금을 허용해야 합니다.
- 시야 이동: 마우스 · 사격: 왼쪽 클릭 · 일시정지: `Esc`

## 안내

Valoran Training은 비공식 팬 제작 연습 도구입니다. Riot Games 또는 VALORANT와 제휴하거나 승인받지 않았으며, Riot의 로고·맵·에이전트·UI·봇·사운드 자산을 사용하지 않습니다.
```

- [ ] **Step 2: Verify the required end-user content**

Run:

```powershell
$readme = Get-Content README.md -Raw
@("훈련 시작하기", "docs/images/valoran-training-home.jpg", "docs/images/valoran-training-session.jpg", "6가지 훈련 모드", "감도와 DPI 안내") | ForEach-Object { if (-not $readme.Contains($_)) { throw "README missing: $_" } }
```

Expected: the command exits with code 0.

- [ ] **Step 3: Commit the end-user README**

```powershell
git add README.md
git commit -m "docs: refresh user guide"
```

### Task 3: Harden the project ignore policy

**Files:**
- Modify: `.gitignore`
- Consumes: the project policy in `docs/superpowers/specs/2026-07-22-user-readme-design.md`
- Produces: local secrets, logs, macOS files, and analysis cache ignored without excluding deploy metadata or source documentation

**Interfaces:**
- Preserves tracked source paths: `.openai/hosting.json`, `docs/`, `scripts/`, `tests/`
- Adds ignore coverage for `.env`, `.env.local`, `npm-debug.log`, `.DS_Store`, and `.code-review-graph/graph.db`

- [ ] **Step 1: Append the explicit ignore patterns**

Add these lines after the existing build-output patterns:

```gitignore
# Local environment and secrets
.env
.env.*
!.env.example

# Logs and operating-system files
*.log
.DS_Store

# Local analysis cache
.code-review-graph/
```

- [ ] **Step 2: Verify expected ignore behavior**

Run:

```powershell
$ignored = @(".env", ".env.local", "npm-debug.log", ".DS_Store", ".code-review-graph/graph.db")
foreach ($path in $ignored) { git check-ignore -q -- $path; if ($LASTEXITCODE -ne 0) { throw "Expected ignored: $path" } }
git check-ignore -q -- .openai/hosting.json; if ($LASTEXITCODE -eq 0) { throw ".openai/hosting.json must remain tracked" }
```

Expected: the command exits with code 0.

- [ ] **Step 3: Commit the ignore policy**

```powershell
git add .gitignore
git commit -m "chore: ignore local artifacts"
```

### Task 4: Final documentation validation and publication

**Files:**
- Verify: `README.md`
- Verify: `.gitignore`
- Verify: `docs/images/valoran-training-home.jpg`
- Verify: `docs/images/valoran-training-session.jpg`

**Interfaces:**
- Verifies the README assets and ignore rules produced by Tasks 1–3
- Publishes the same committed `main` state to GitHub

- [ ] **Step 1: Run the full automated test suite**

Run:

```powershell
npm test -- --run
```

Expected: all existing tests pass.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm run build
```

Expected: TypeScript validation and the production build complete successfully.

- [ ] **Step 3: Confirm no unintended files are staged**

Run:

```powershell
git status --short
```

Expected: only the README, `.gitignore`, documented screenshot assets, and intentionally created planning files appear before their commits; the working tree is clean after the task commits.

- [ ] **Step 4: Push the committed main branch**

```powershell
git push origin main
```

Expected: the remote `main` branch accepts the documentation commits.
