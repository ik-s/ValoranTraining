import { buildAimTrainingResult } from "../domain/ResultBuilder";
import type { AimTrainingResult } from "../domain/Results";
import {
  StorageService,
  type StoredAppData,
} from "../domain/StorageService";
import type { AimModeId, Difficulty } from "../domain/types";
import { TrainingEngine } from "../engine/TrainingEngine";
import { DomTrainingHud } from "../ui/DomTrainingHud";
import { filterTrainingResults, type DifficultyFilter, type ModeFilter } from "../ui/RecordsViewModel";
import { createSensitivityForm } from "../ui/SensitivityForm";
import { AppRouter } from "./AppRouter";
import type { AppScreen } from "./AppState";

interface ModeMeta {
  id: AimModeId;
  name: string;
  description: string;
  tag: string;
}

const modeMeta: ModeMeta[] = [
  { id: "grid-shot", name: "GRID SHOT", description: "넓은 각도의 반복 플릭과 빠른 표적 선택", tag: "FLICK" },
  { id: "micro-flick", name: "MICRO FLICK", description: "짧은 거리의 미세 조준 수정", tag: "PRECISION" },
  { id: "reaction-shot", name: "REACTION SHOT", description: "표적 인지부터 첫 클릭까지의 반응", tag: "REACTION" },
  { id: "target-switching", name: "TARGET SWITCHING", description: "지정 표적을 빠르게 전환", tag: "SWITCH" },
  { id: "strafe-track", name: "STRAFE TRACK", description: "이동 표적 추적과 복구", tag: "TRACK" },
  { id: "headshot-only", name: "HEADSHOT ONLY", description: "로봇 더미의 머리 정밀도", tag: "HEAD" },
];

const navItems: Array<{ screen: AppScreen; label: string }> = [
  { screen: "home", label: "TRAINING" },
  { screen: "records", label: "RECORDS" },
  { screen: "sensitivity-settings", label: "SETTINGS" },
];

export class App {
  private readonly storage: StorageService;
  private readonly router: AppRouter;
  private data: StoredAppData;
  private engine: TrainingEngine | null = null;
  private selectedMode: AimModeId;
  private selectedDifficulty: Difficulty;
  private currentResult: AimTrainingResult | null = null;
  private modeFilter: ModeFilter = "all";
  private difficultyFilter: DifficultyFilter = "all";
  private storageWarning: string | null = null;

  constructor(private readonly root: HTMLElement) {
    this.storage = new StorageService(window.localStorage);
    this.data = this.storage.load();
    this.selectedMode = this.data.lastSelection?.modeId ?? "grid-shot";
    this.selectedDifficulty = this.data.lastSelection?.difficulty ?? "normal";
    this.router = new AppRouter((screen) => this.render(screen));
  }

  mount(): void {
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("input", this.handleInput);
    this.root.addEventListener("change", this.handleChange);
    this.render(this.router.getCurrent());
  }

  dispose(): void {
    this.destroyEngine();
    this.root.removeEventListener("click", this.handleClick);
    this.root.removeEventListener("input", this.handleInput);
    this.root.removeEventListener("change", this.handleChange);
    this.root.replaceChildren();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>("button");
    if (!button) {
      return;
    }
    const screen = button.dataset.screen as AppScreen | undefined;
    if (screen) {
      this.router.navigate(screen);
      return;
    }
    switch (button.dataset.action) {
      case "quick-start":
        this.router.navigate(
          this.data.sensitivity ? "training-select" : "sensitivity-settings",
        );
        break;
      case "select-mode":
        this.selectedMode = button.dataset.mode as AimModeId;
        this.render("training-select");
        break;
      case "select-difficulty":
        this.selectedDifficulty = button.dataset.difficulty as Difficulty;
        this.render("training-select");
        break;
      case "open-training":
        this.router.navigate(
          this.data.sensitivity ? "training" : "sensitivity-settings",
        );
        break;
      case "start-session":
        void this.engine?.start();
        break;
      case "resume-session":
        void this.engine?.start();
        break;
      case "end-session":
        this.engine?.abort();
        this.router.navigate("training-select");
        break;
      case "retry":
        this.router.navigate("training");
        break;
      case "adjust-calibration":
        this.adjustCalibration(Number(button.dataset.delta));
        break;
      case "clear-records":
        if (window.confirm("훈련 기록만 삭제할까요? 감도와 크로스헤어는 유지됩니다.")) {
          if (this.reportStorageWrite(this.storage.clearRecords())) {
            this.data = this.storage.load();
          }
          this.render("records");
        }
        break;
      case "reset-data":
        if (window.confirm("모든 설정과 훈련 기록을 초기화할까요?")) {
          if (this.reportStorageWrite(this.storage.resetAll())) {
            this.data = this.storage.load();
          }
          this.router.navigate("home");
        }
        break;
    }
  };

  private readonly handleInput = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.crosshair) {
      return;
    }
    const key = input.dataset.crosshair as keyof typeof this.data.crosshair;
    const next = {
      ...this.data.crosshair,
      [key]:
        input.type === "checkbox"
          ? input.checked
          : key === "color"
            ? input.value
            : Number(input.value),
    };
    this.data = { ...this.data, crosshair: next };
    this.reportStorageWrite(this.storage.saveCrosshair(next));
    const preview = this.root.querySelector<HTMLElement>("[data-crosshair-preview]");
    if (preview) {
      preview.style.setProperty("--crosshair-color", next.color);
    }
  };

  private readonly handleChange = (event: Event): void => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    if (select.name === "mode-filter") {
      this.modeFilter = select.value as ModeFilter;
      this.render("records");
    }
    if (select.name === "difficulty-filter") {
      this.difficultyFilter = select.value as DifficultyFilter;
      this.render("records");
    }
  };

  private render(screen: AppScreen): void {
    if (screen !== "training") {
      this.destroyEngine();
    }
    const content = this.renderScreen(screen);
    const navigation = navItems
      .map(
        (item) =>
          '<button class="nav-button ' +
          (item.screen === screen ? "is-active" : "") +
          '" data-screen="' +
          item.screen +
          '" type="button">' +
          item.label +
          "</button>",
      )
      .join("");
    this.root.innerHTML =
      '<div class="app-shell"><header class="topbar">' +
      '<a class="brand" href="#home" aria-label="Valoran Training home">VALORAN <span>TRAINING</span></a>' +
      '<nav aria-label="주요 메뉴">' +
      navigation +
      "</nav></header>" +
      '<p class="storage-warning' +
      (this.storageWarning ? "" : " is-hidden") +
      '" data-storage-warning role="alert">' +
      (this.storageWarning ?? "") +
      "</p><main class=\"app-content\">" +
      content +
      "</main></div>";
    if (screen === "sensitivity-settings") {
      this.mountSensitivityForm();
    }
    if (screen === "training") {
      this.mountTraining();
    }
  }

  private renderScreen(screen: AppScreen): string {
    switch (screen) {
      case "home":
        return this.renderHome();
      case "training-select":
        return this.renderTrainingSelect();
      case "sensitivity-settings":
        return this.renderSensitivitySettings();
      case "sensitivity-calibration":
        return this.renderCalibration();
      case "crosshair-settings":
        return this.renderCrosshairSettings();
      case "records":
        return this.renderRecords();
      case "training":
        return this.renderTraining();
      case "result":
        return this.renderResult();
    }
  }

  private renderHome(): string {
    const sensitivity = this.data.sensitivity;
    const sensitivityCard = sensitivity
      ? '<div class="stat-grid"><div><span>DPI</span><strong>' + sensitivity.dpi + '</strong></div><div><span>SENS</span><strong>' + sensitivity.valorantSensitivity + '</strong></div><div><span>eDPI</span><strong>' + sensitivity.edpi + '</strong></div><div><span>CAL</span><strong>' + sensitivity.calibrationMultiplier.toFixed(3) + '</strong></div></div>'
      : '<div class="empty-state"><strong>SENSITIVITY NOT SET</strong><p>훈련을 시작하기 전에 감도를 입력해주세요.</p><button class="secondary-button" data-screen="sensitivity-settings">설정하기</button></div>';
    return (
      '<section class="hero-panel"><p class="eyebrow">DESKTOP AIM SYSTEM</p><h1>VALORANT AIM<br /><span>TRAINING</span></h1><p>게임에서 사용하는 감도를 설정하고 6가지 3D 훈련으로 에임을 분석하세요.</p><div class="button-row"><button class="primary-button" data-action="quick-start">빠른 훈련 시작</button><button class="secondary-button" data-screen="sensitivity-settings">감도 설정</button></div></section>' +
      '<section class="panel"><div class="section-heading"><p class="eyebrow">CURRENT LOADOUT</p><h2>현재 감도</h2></div>' +
      sensitivityCard +
      "</section>" +
      '<section><div class="section-heading"><p class="eyebrow">SIX DISCIPLINES</p><h2>훈련 모드</h2></div><div class="mode-grid">' +
      this.renderModeCards() +
      "</div></section>"
    );
  }

  private renderModeCards(): string {
    return modeMeta
      .map(
        (mode) =>
          '<article class="mode-card"><span class="mode-tag">' +
          mode.tag +
          "</span><h3>" +
          mode.name +
          "</h3><p>" +
          mode.description +
          '</p><button class="text-button" data-action="select-mode" data-mode="' +
          mode.id +
          '" data-screen="training-select">선택하기 →</button></article>',
      )
      .join("");
  }

  private renderTrainingSelect(): string {
    const selected = modeMeta.find((mode) => mode.id === this.selectedMode)!;
    const difficulties: Difficulty[] = ["easy", "normal", "hard"];
    return (
      '<section class="panel"><p class="eyebrow">TRAINING SELECT</p><h1>훈련을 선택하세요</h1><div class="mode-grid">' +
      this.renderModeCards() +
      '</div><div class="selection-summary"><p>SELECTED MODE</p><h2>' +
      selected.name +
      '</h2><p>' +
      selected.description +
      '</p><div class="difficulty-row">' +
      difficulties
        .map(
          (difficulty) =>
            '<button class="difficulty-button ' +
            (difficulty === this.selectedDifficulty ? "is-selected" : "") +
            '" data-action="select-difficulty" data-difficulty="' +
            difficulty +
            '">' +
            difficulty.toUpperCase() +
            "</button>",
        )
        .join("") +
      '</div><button class="primary-button" data-action="open-training">60초 훈련 준비</button></div></section>'
    );
  }

  private renderSensitivitySettings(): string {
    return (
      '<section class="panel settings-panel"><p class="eyebrow">STEP 01 / 04</p><h1>감도 설정</h1><p>브라우저는 마우스 DPI를 자동으로 알 수 없습니다. 실제 하드웨어 DPI와 VALORANT 인게임 감도를 입력해주세요.</p><div data-sensitivity-form></div><div class="settings-links"><button class="secondary-button" data-screen="sensitivity-calibration">360° 보정</button><button class="secondary-button" data-screen="crosshair-settings">크로스헤어 설정</button></div></section>'
    );
  }

  private renderCalibration(): string {
    const sensitivity = this.data.sensitivity;
    if (!sensitivity) {
      return '<section class="panel"><h1>감도 설정이 필요합니다</h1><button class="primary-button" data-screen="sensitivity-settings">감도 입력</button></section>';
    }
    return (
      '<section class="panel calibration-panel"><p class="eyebrow">STEP 03 / 04</p><h1>360° 감도 보정</h1><p>실제 마우스 패드에서 한 바퀴를 돌린 뒤 체감에 맞게 배율을 미세 조정하세요. Raw Input을 사용할 수 없는 환경에서는 특히 권장합니다.</p><output class="calibration-value">' +
      sensitivity.calibrationMultiplier.toFixed(3) +
      '</output><div class="button-row"><button class="secondary-button" data-action="adjust-calibration" data-delta="-0.01">덜 회전함</button><button class="primary-button" data-action="adjust-calibration" data-delta="0.001">정확히 일치</button><button class="secondary-button" data-action="adjust-calibration" data-delta="-0.001">더 회전함</button></div><button class="text-button" data-screen="training-select">모드 선택으로 이동 →</button></section>'
    );
  }

  private renderCrosshairSettings(): string {
    const crosshair = this.data.crosshair;
    return (
      '<section class="panel"><p class="eyebrow">CROSSHAIR</p><h1>크로스헤어 설정</h1><div class="crosshair-layout"><div class="crosshair-preview" data-crosshair-preview style="--crosshair-color:' +
      crosshair.color +
      '"><i></i><b></b><em></em><span></span></div><div class="settings-form"><label>COLOR<input data-crosshair="color" type="color" value="' +
      crosshair.color +
      '" /></label><label>LINE LENGTH<input data-crosshair="lineLength" type="range" min="2" max="20" value="' +
      crosshair.lineLength +
      '" /></label><label>THICKNESS<input data-crosshair="lineThickness" type="range" min="1" max="6" value="' +
      crosshair.lineThickness +
      '" /></label><label>CENTER GAP<input data-crosshair="centerGap" type="range" min="0" max="12" value="' +
      crosshair.centerGap +
      '" /></label><label class="checkbox-label"><input data-crosshair="showCenterDot" type="checkbox" ' +
      (crosshair.showCenterDot ? "checked" : "") +
      ' /> CENTER DOT</label></div></div><button class="primary-button" data-screen="training-select">훈련 선택으로 이동</button></section>'
    );
  }

  private renderRecords(): string {
    const all = Object.values(this.data.records.aim.recent)
      .flat()
      .sort((first, second) => second.playedAt.localeCompare(first.playedAt));
    const results = filterTrainingResults(all, this.modeFilter, this.difficultyFilter);
    const personalBests = filterTrainingResults(
      Object.values(this.data.records.aim.personalBests).filter(
        (result): result is AimTrainingResult => result !== undefined,
      ),
      this.modeFilter,
      this.difficultyFilter,
    ).sort((first, second) => second.score - first.score);
    const bestRows =
      personalBests.length === 0
        ? '<p class="muted-copy">아직 개인 최고 기록이 없습니다.</p>'
        : personalBests
            .map(
              (result) =>
                '<article class="record-row personal-best"><span>' +
                result.modeId.toUpperCase() +
                "</span><span>" +
                result.difficulty.toUpperCase() +
                "</span><strong>" +
                result.score +
                '</strong><span>PERSONAL BEST</span></article>',
            )
            .join("");
    const rows =
      results.length === 0
        ? '<div class="empty-state"><strong>NO RECORDS YET</strong><p>첫 60초 훈련을 완료하면 결과가 여기에 저장됩니다.</p></div>'
        : results
            .map(
              (result) =>
                '<article class="record-row"><span>' +
                result.modeId.toUpperCase() +
                "</span><span>" +
                result.difficulty.toUpperCase() +
                "</span><strong>" +
                result.score +
                "</strong><span>" +
                new Date(result.playedAt).toLocaleDateString("ko-KR") +
                "</span></article>",
            )
            .join("");
    return (
      '<section class="panel"><p class="eyebrow">LOCAL PERFORMANCE LOG</p><h1>기록</h1><div class="filter-row"><label>MODE<select name="mode-filter"><option value="all">ALL</option>' +
      modeMeta
        .map(
          (mode) =>
            '<option value="' +
            mode.id +
            '"' +
            (this.modeFilter === mode.id ? " selected" : "") +
            ">" +
            mode.name +
            "</option>",
        )
        .join("") +
      '</select></label><label>DIFFICULTY<select name="difficulty-filter"><option value="all">ALL</option><option value="easy"' +
      (this.difficultyFilter === "easy" ? " selected" : "") +
      '>EASY</option><option value="normal"' +
      (this.difficultyFilter === "normal" ? " selected" : "") +
      '>NORMAL</option><option value="hard"' +
      (this.difficultyFilter === "hard" ? " selected" : "") +
      '>HARD</option></select></label></div><h2 class="records-subheading">PERSONAL BEST</h2><div class="record-list">' +
      bestRows +
      '</div><h2 class="records-subheading">RECENT SESSIONS</h2><div class="record-list">' +
      rows +
      '</div><div class="button-row"><button class="secondary-button" data-action="clear-records">기록 삭제</button><button class="text-button" data-action="reset-data">전체 데이터 초기화</button></div></section>'
    );
  }

  private renderTraining(): string {
    if (!this.data.sensitivity || !this.isDesktopReady()) {
      return '<section class="panel desktop-required"><p class="eyebrow">DESKTOP REQUIRED</p><h1>PC Chrome과 WebGL이 필요합니다</h1><p>이 훈련은 물리 마우스, Pointer Lock, WebGL을 사용하는 데스크톱 전용 기능입니다.</p><button class="primary-button" data-screen="home">홈으로 이동</button></section>';
    }
    const selected = modeMeta.find((mode) => mode.id === this.selectedMode)!;
    return (
      '<section class="training-shell"><div class="training-topline"><span>' +
      selected.name +
      "</span><span>" +
      this.selectedDifficulty.toUpperCase() +
      '</span><span data-hud-input>MOUSE LOCK READY</span></div><div class="arena" data-training-arena></div><div class="training-hud" data-training-hud><div class="hud-time" data-hud-time>60</div><div class="hud-score"><small>SCORE</small><strong data-hud-score>0</strong></div><div class="hud-meta"><span>ACC <b data-hud-accuracy>0%</b></span><span>COMBO <b data-hud-combo>0</b></span></div><div class="countdown" data-hud-countdown></div><p class="performance-warning is-hidden" data-hud-performance>PERFORMANCE BELOW 50 FPS · 그래픽 설정을 낮추거나 다른 탭을 닫아주세요.</p></div><div class="training-controls"><button class="primary-button" data-action="start-session">클릭하여 시작</button><button class="secondary-button" data-action="resume-session">재개</button><button class="text-button" data-action="end-session">훈련 종료</button></div><p class="training-help">MOUSE 시야 이동 · LMB 사격 · ESC 일시정지</p></section>'
    );
  }

  private renderResult(): string {
    const fallback = Object.values(this.data.records.aim.recent).flat()[0] ?? null;
    const result = this.currentResult ?? fallback;
    if (!result) {
      return '<section class="panel"><h1>결과가 없습니다</h1><button class="primary-button" data-screen="training-select">훈련 선택</button></section>';
    }
    const metrics = Object.entries(result.modeMetrics)
      .map(
        ([key, value]) =>
          '<div><span>' +
          key.replace(/([A-Z])/g, " $1").toUpperCase() +
          "</span><strong>" +
          (typeof value === "number" ? value.toFixed(2) : "—") +
          "</strong></div>",
      )
      .join("");
    return (
      '<section class="panel result-panel"><p class="eyebrow">60 SECONDS COMPLETE</p><h1>' +
      result.modeId.toUpperCase() +
      '</h1><output class="result-score">' +
      result.score +
      '</output><p>' +
      result.difficulty.toUpperCase() +
      " · " +
      result.sensitivitySnapshot.edpi +
      ' eDPI · ' +
      result.inputSnapshot.pointerLockMode.toUpperCase() +
      '</p><div class="stat-grid"><div><span>HITS</span><strong>' +
      result.hits +
      '</strong></div><div><span>ACCURACY</span><strong>' +
      (result.accuracy === null ? "—" : Math.round(result.accuracy * 100) + "%") +
      '</strong></div><div><span>MAX COMBO</span><strong>' +
      result.maxCombo +
      '</strong></div></div><div class="metric-grid">' +
      metrics +
      '</div><div class="feedback-grid"><p><b>강점</b> ' +
      (result.feedback.strength ?? "충분한 방향 표본이 쌓이면 강점을 분석합니다.") +
      '</p><p><b>개선</b> ' +
      (result.feedback.improvement ?? "다음 훈련에서 방향별 표본을 늘려보세요.") +
      '</p></div><div class="button-row"><button class="primary-button" data-action="retry">같은 설정으로 재도전</button><button class="secondary-button" data-screen="training-select">난이도 변경</button><button class="text-button" data-screen="records">기록 보기</button></div></section>'
    );
  }

  private mountSensitivityForm(): void {
    const host = this.root.querySelector<HTMLElement>("[data-sensitivity-form]");
    if (!host) {
      return;
    }
    host.append(
      createSensitivityForm(this.data.sensitivity, (sensitivity) => {
        if (this.reportStorageWrite(this.storage.saveSensitivity(sensitivity))) {
          this.data = this.storage.load();
        } else {
          this.data = { ...this.data, sensitivity };
        }
        this.router.navigate("sensitivity-calibration");
      }),
    );
  }

  private mountTraining(): void {
    const arena = this.root.querySelector<HTMLElement>("[data-training-arena]");
    const hudRoot = this.root.querySelector<HTMLElement>("[data-training-hud]");
    if (!arena || !hudRoot || !this.data.sensitivity) {
      return;
    }
    const hud = new DomTrainingHud(hudRoot);
    this.engine = new TrainingEngine(arena, hud, {
      onComplete: (metrics, pointerLockMode) => {
        const result = buildAimTrainingResult(
          {
            modeId: this.selectedMode,
            difficulty: this.selectedDifficulty,
            sensitivity: this.data.sensitivity!,
          },
          metrics,
          pointerLockMode === "unavailable" ? "standard" : pointerLockMode,
        );
        this.currentResult = result;
        if (this.reportStorageWrite(this.storage.record(result))) {
          this.data = this.storage.load();
        }
        this.router.navigate("result");
      },
    });
    this.engine.prepare({
      modeId: this.selectedMode,
      difficulty: this.selectedDifficulty,
      durationSeconds: 60,
      sensitivity: this.data.sensitivity,
      crosshair: this.data.crosshair,
    });
  }

  private adjustCalibration(delta: number): void {
    if (!this.data.sensitivity || !Number.isFinite(delta)) {
      return;
    }
    const multiplier = Math.min(
      1.5,
      Math.max(0.5, this.data.sensitivity.calibrationMultiplier + delta),
    );
    const sensitivity = {
      ...this.data.sensitivity,
      calibrationMultiplier: Number(multiplier.toFixed(3)),
      calibratedAt: new Date().toISOString(),
    };
    if (this.reportStorageWrite(this.storage.saveSensitivity(sensitivity))) {
      this.data = this.storage.load();
    } else {
      this.data = { ...this.data, sensitivity };
    }
    this.render("sensitivity-calibration");
  }

  private reportStorageWrite(success: boolean): boolean {
    this.storageWarning = success
      ? null
      : "브라우저 저장공간에 기록하지 못했습니다. 이번 세션은 계속할 수 있지만 새로고침하면 변경사항이 사라집니다.";
    const notice = this.root.querySelector<HTMLElement>("[data-storage-warning]");
    if (notice) {
      notice.textContent = this.storageWarning ?? "";
      notice.classList.toggle("is-hidden", !this.storageWarning);
    }
    return success;
  }

  private destroyEngine(): void {
    this.engine?.dispose();
    this.engine = null;
  }

  private isDesktopReady(): boolean {
    if (window.innerWidth < 700 || navigator.maxTouchPoints > 0) {
      return false;
    }
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }
}
