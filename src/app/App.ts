import { buildAimTrainingResult } from "../domain/ResultBuilder";
import type { AimTrainingResult } from "../domain/Results";
import {
  applyCrosshairStyles,
  crosshairStyleAttribute,
} from "../domain/Crosshair";
import {
  modeDifficultyKey,
  StorageService,
  type StoredAppData,
} from "../domain/StorageService";
import type { AimModeId, CrosshairSettings, Difficulty } from "../domain/types";
import { TrainingEngine } from "../engine/TrainingEngine";
import type { User } from "@supabase/supabase-js";
import {
  SupabaseAccountService,
  type AccountProfile,
  type LeaderboardEntry,
} from "../infrastructure/SupabaseAccountService";
import { getSupabasePublicConfig } from "../infrastructure/SupabaseConfig";
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
  { screen: "ranking", label: "RANKING" },
  { screen: "sensitivity-settings", label: "SETTINGS" },
];

const resultModeTranslations: Record<AimModeId, string> = {
  "grid-shot": "격자 표적 사격",
  "micro-flick": "미세 플릭",
  "reaction-shot": "반응 사격",
  "target-switching": "표적 전환",
  "strafe-track": "이동 표적 추적",
  "headshot-only": "헤드샷 전용",
};

const difficultyTranslations: Record<Difficulty, string> = {
  easy: "쉬움 난이도",
  normal: "보통 난이도",
  hard: "어려움 난이도",
};

const trainingDurations = [30, 60] as const;
type TrainingDuration = (typeof trainingDurations)[number];

const difficultySummaries: Record<AimModeId, Record<Difficulty, string>> = {
  "grid-shot": {
    easy: "큰 표적 · 좁은 생성 범위 · 표적 3개",
    normal: "중간 표적 · 넓어진 생성 범위 · 표적 3개",
    hard: "작은 표적 · 넓은 생성 범위 · 표적 간격 증가",
  },
  "micro-flick": {
    easy: "큰 표적 · 가까운 미세 조준",
    normal: "중간 표적 · 더 먼 미세 조준",
    hard: "작은 표적 · 가장 먼 미세 조준",
  },
  "reaction-shot": {
    easy: "큰 표적 · 1.5초 노출",
    normal: "중간 표적 · 1초 노출",
    hard: "작은 표적 · 0.7초 노출",
  },
  "target-switching": {
    easy: "큰 표적 · 4개 표적 · 8초마다 이동",
    normal: "중간 표적 · 5개 표적 · 6초마다 이동",
    hard: "작은 표적 · 6개 표적 · 4초마다 이동",
  },
  "strafe-track": {
    easy: "큰 표적 · 느린 좌우 이동",
    normal: "중간 표적 · 빠른 상하 이동",
    hard: "작은 표적 · 가장 빠른 상하 이동",
  },
  "headshot-only": {
    easy: "큰 헤드 표적 · 3초 유지",
    normal: "중간 헤드 표적 · 2초 유지",
    hard: "작은 헤드 표적 · 1.3초 유지",
  },
};

type ResultMetricFormat = "count" | "ratio" | "seconds" | "degrees" | "hits-per-second";

interface ResultMetricMeta {
  label: string;
  korean: string;
  format: ResultMetricFormat;
}

const resultMetricMeta: Record<string, ResultMetricMeta> = {
  hitsPerSecond: { label: "HITS PER SECOND", korean: "초당 명중", format: "hits-per-second" },
  averageTransitionTime: { label: "AVERAGE TRANSITION TIME", korean: "평균 표적 전환 시간", format: "seconds" },
  averageMicroAdjustmentTime: { label: "AVERAGE MICRO ADJUSTMENT TIME", korean: "평균 미세 조준 시간", format: "seconds" },
  medianReactionTime: { label: "MEDIAN REACTION TIME", korean: "반응 시간 중앙값", format: "seconds" },
  falseStarts: { label: "FALSE STARTS", korean: "성급한 사격", format: "count" },
  timeouts: { label: "TIMEOUTS", korean: "제한 시간 초과", format: "count" },
  wrongTargetHits: { label: "WRONG TARGET HITS", korean: "오표적 명중", format: "count" },
  emptyMisses: { label: "EMPTY MISSES", korean: "빗나간 사격", format: "count" },
  trackingAccuracy: { label: "TRACKING ACCURACY", korean: "추적 정확도", format: "ratio" },
  insideRatio: { label: "ON TARGET RATIO", korean: "표적 유지 비율", format: "ratio" },
  averageAngularError: { label: "AVERAGE ANGULAR ERROR", korean: "평균 조준 오차", format: "degrees" },
  longestContinuousTracking: { label: "LONGEST CONTINUOUS TRACKING", korean: "최장 연속 추적", format: "seconds" },
  headHits: { label: "HEAD HITS", korean: "헤드샷 명중", format: "count" },
  headshotRatio: { label: "HEADSHOT RATIO", korean: "헤드샷 비율", format: "ratio" },
  bodyHits: { label: "BODY HITS", korean: "몸통 명중", format: "count" },
};

const hasGenericShotMetrics = (result: AimTrainingResult): boolean =>
  result.modeId !== "strafe-track" && result.modeId !== "headshot-only";

const formatResultMetric = (value: number, format: ResultMetricFormat): string => {
  switch (format) {
    case "ratio":
      return Math.round(value * 100) + "%";
    case "seconds":
      return value.toFixed(2) + "초";
    case "degrees":
      return value.toFixed(1) + "°";
    case "hits-per-second":
      return value.toFixed(2) + "회/초";
    case "count":
      return String(Math.round(value));
  }
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderCrosshairReticle = (
  crosshair: CrosshairSettings,
  className: string,
  dataAttribute: string,
): string =>
  '<div class="crosshair-reticle ' +
  className +
  '" ' +
  dataAttribute +
  ' style="' +
  crosshairStyleAttribute(crosshair) +
  '" aria-hidden="true"><i></i><b></b><em></em></div>';

export interface AppDependencies {
  accountService?: SupabaseAccountService | null;
}

export class App {
  private readonly storage: StorageService;
  private readonly router: AppRouter;
  private data: StoredAppData;
  private engine: TrainingEngine | null = null;
  private selectedMode: AimModeId;
  private selectedDifficulty: Difficulty;
  private selectedDuration: TrainingDuration = 60;
  private currentResult: AimTrainingResult | null = null;
  private modeFilter: ModeFilter = "all";
  private difficultyFilter: DifficultyFilter = "all";
  private storageWarning: string | null = null;
  private readonly accountService: SupabaseAccountService | null;
  private account: AccountProfile | null = null;
  private accountMessage: string | null = null;
  private remoteResults: AimTrainingResult[] = [];
  private accountUnsubscribe: (() => void) | null = null;
  private rankingMode: AimModeId = "grid-shot";
  private rankingDifficulty: Difficulty = "normal";
  private rankingDuration: TrainingDuration = 60;
  private rankingEntries: LeaderboardEntry[] = [];
  private rankingStatus: "idle" | "loading" | "ready" | "error" | "unavailable" = "idle";
  private rankingRequestKey: string | null = null;
  private rankingMessage: string | null = null;

  constructor(
    private readonly root: HTMLElement,
    dependencies: AppDependencies = {},
  ) {
    this.storage = new StorageService(window.localStorage);
    this.data = this.storage.load();
    this.selectedMode = this.data.lastSelection?.modeId ?? "grid-shot";
    this.selectedDifficulty = this.data.lastSelection?.difficulty ?? "normal";
    const config = getSupabasePublicConfig();
    this.accountService =
      dependencies.accountService === undefined
        ? config
          ? SupabaseAccountService.fromPublicConfig(config)
          : null
        : dependencies.accountService;
    this.router = new AppRouter((screen) => this.render(screen));
  }

  mount(): void {
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("input", this.handleInput);
    this.root.addEventListener("change", this.handleChange);
    this.render(this.router.getCurrent());
    void this.initializeAccount();
  }

  dispose(): void {
    this.destroyEngine();
    this.root.removeEventListener("click", this.handleClick);
    this.root.removeEventListener("input", this.handleInput);
    this.root.removeEventListener("change", this.handleChange);
    this.accountUnsubscribe?.();
    this.accountUnsubscribe = null;
    this.root.replaceChildren();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const link = target.closest<HTMLAnchorElement>("a[data-screen]");
    if (link) {
      event.preventDefault();
      this.router.navigate(link.dataset.screen as AppScreen);
      return;
    }
    const button = target.closest<HTMLButtonElement>("button");
    if (!button) {
      return;
    }
    switch (button.dataset.action) {
      case "sign-in-google":
        void this.startGoogleSignIn();
        return;
      case "sign-out":
        void this.signOut();
        return;
      case "back":
        if (button.dataset.backScreen) {
          this.router.navigate(button.dataset.backScreen as AppScreen);
        } else {
          this.router.back();
        }
        return;
      case "quick-start":
        this.router.navigate(
          this.data.sensitivity ? "training-select" : "sensitivity-settings",
        );
        return;
      case "select-mode":
        this.selectedMode = button.dataset.mode as AimModeId;
        this.router.navigate("training-select");
        return;
      case "show-record": {
        const recordId = button.dataset.recordId;
        const record = this.getAllResults().find((result) => result.id === recordId);
        if (!record) {
          return;
        }
        this.currentResult = record;
        this.router.navigate("result");
        return;
      }
      case "select-difficulty":
        this.selectedDifficulty = button.dataset.difficulty as Difficulty;
        this.render("training-select");
        return;
      case "select-duration":
        this.selectedDuration = Number(button.dataset.duration) as TrainingDuration;
        this.render("training-select");
        return;
      case "open-training":
        this.router.navigate(
          this.data.sensitivity ? "training" : "sensitivity-settings",
        );
        return;
      case "start-session":
        void this.engine?.start();
        return;
      case "resume-session":
        void this.engine?.start();
        return;
      case "end-session":
        this.engine?.abort();
        this.router.navigate("training-select");
        return;
      case "retry":
        this.router.navigate("training");
        return;
      case "clear-records":
        if (window.confirm("훈련 기록만 삭제할까요? 감도와 크로스헤어는 유지됩니다.")) {
          if (this.reportStorageWrite(this.storage.clearRecords())) {
            this.data = this.storage.load();
          }
          this.render("records");
        }
        return;
      case "reset-data":
        if (window.confirm("모든 설정과 훈련 기록을 초기화할까요?")) {
          if (this.reportStorageWrite(this.storage.resetAll())) {
            this.data = this.storage.load();
          }
          this.router.navigate("home");
        }
        return;
    }
    const screen = button.dataset.screen as AppScreen | undefined;
    if (screen) {
      this.router.navigate(screen);
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
      applyCrosshairStyles(preview, next);
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
    if (select.name === "ranking-mode") {
      this.rankingMode = select.value as AimModeId;
      this.resetLeaderboard();
    }
    if (select.name === "ranking-difficulty") {
      this.rankingDifficulty = select.value as Difficulty;
      this.resetLeaderboard();
    }
    if (select.name === "ranking-duration") {
      this.rankingDuration = Number(select.value) as TrainingDuration;
      this.resetLeaderboard();
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
    const accountControl = this.renderAccountControl();
    this.root.innerHTML =
      '<div class="app-shell"><header class="topbar">' +
      '<a class="brand" href="#home" data-screen="home" aria-label="Valoran Training home">VALORAN <span>TRAINING</span></a>' +
      '<div class="topbar-actions"><nav aria-label="주요 메뉴">' +
      navigation +
      "</nav>" +
      accountControl +
      "</div></header>" +
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
    if (screen === "ranking") {
      void this.loadLeaderboard();
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
      case "crosshair-settings":
        return this.renderCrosshairSettings();
      case "records":
        return this.renderRecords();
      case "ranking":
        return this.renderRanking();
      case "training":
        return this.renderTraining();
      case "result":
        return this.renderResult();
    }
  }

  private renderPanelHeading(
    eyebrow: string,
    title: string,
    backScreen?: AppScreen,
  ): string {
    return (
      '<div class="panel-heading"><button class="panel-back" data-action="back"' +
      (backScreen ? ' data-back-screen="' + backScreen + '"' : "") +
      ' type="button">← 이전</button><div><p class="eyebrow">' +
      eyebrow +
      "</p><h1>" +
      title +
      "</h1></div></div>"
    );
  }

  private renderAccountControl(): string {
    const message = this.accountMessage
      ? '<small class="account-message">' + escapeHtml(this.accountMessage) + "</small>"
      : "";
    if (this.account) {
      return (
        '<div class="account-control"><span class="account-name">' +
        escapeHtml(this.account.displayName) +
        '</span><button class="account-button" data-action="sign-out" type="button">LOG OUT</button>' +
        message +
        "</div>"
      );
    }
    if (this.accountService) {
      return (
        '<div class="account-control"><button class="account-button" data-action="sign-in-google" type="button">GOOGLE LOGIN</button>' +
        message +
        "</div>"
      );
    }
    return '<span class="account-unavailable">ONLINE FEATURES<small>온라인 기능 설정 필요</small></span>';
  }

  private renderHome(): string {
    const sensitivity = this.data.sensitivity;
    const sensitivityCard = sensitivity
      ? '<div class="stat-grid stat-grid--three"><div><span>DPI</span><strong>' + sensitivity.dpi + '</strong></div><div><span>SENS</span><strong>' + sensitivity.valorantSensitivity + '</strong></div><div><span>eDPI</span><strong>' + sensitivity.edpi + '</strong></div></div>'
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
        (mode) => {
          const isSelected = mode.id === this.selectedMode;
          return (
          '<button class="mode-card ' +
          (isSelected ? "is-selected" : "") +
          '" data-action="select-mode" data-mode="' +
          mode.id +
          '" type="button" aria-pressed="' +
          (isSelected ? "true" : "false") +
          '"><span class="mode-tag">' +
          mode.tag +
          "</span><h3>" +
          mode.name +
          "</h3><p>" +
          mode.description +
          '</p><span class="mode-card-action">선택하기 →</span></button>'
          );
        },
      )
      .join("");
  }

  private renderTrainingSelect(): string {
    const selected = modeMeta.find((mode) => mode.id === this.selectedMode)!;
    const difficulties: Difficulty[] = ["easy", "normal", "hard"];
    return (
      '<section class="panel training-select-panel">' +
      this.renderPanelHeading("TRAINING SELECT", "훈련을 선택하세요", "home") +
      '<div class="mode-grid">' +
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
      '</div><p class="difficulty-summary" data-difficulty-summary><strong>난이도 요약</strong>' +
      difficultySummaries[this.selectedMode][this.selectedDifficulty] +
      '</p><div class="duration-selector"><p>TRAINING TIME <small>훈련 시간</small></p><div class="duration-row">' +
      trainingDurations
        .map(
          (duration) =>
            '<button class="duration-button ' +
            (duration === this.selectedDuration ? "is-selected" : "") +
            '" data-action="select-duration" data-duration="' +
            duration +
            '">' +
            duration +
            "초</button>",
        )
        .join("") +
      '</div></div><button class="primary-button training-ready-button" data-action="open-training">' +
      this.selectedDuration +
      "초 훈련 준비</button></div></section>"
    );
  }

  private renderSensitivitySettings(): string {
    return (
      '<section class="panel settings-panel">' +
      this.renderPanelHeading("STEP 01 / 03", "감도 설정") +
      '<p><strong>VALORANT 프로필</strong>이 적용됩니다. 브라우저는 마우스 DPI를 자동으로 알 수 없으니, 마우스 소프트웨어에 설정된 실제 DPI와 VALORANT 인게임 감도를 입력해주세요. DPI 입력값은 eDPI·360° 거리 계산용이며 하드웨어 DPI를 변경하지 않습니다. 훈련은 VALORANT 회전 계수와 시야각을 사용하며, 원시 마우스 입력이 지원되는 환경에서 1:1 회전을 기대할 수 있습니다.</p><div data-sensitivity-form></div><div class="settings-links"><button class="secondary-button" data-screen="crosshair-settings">크로스헤어 설정</button></div></section>'
    );
  }

  private renderCrosshairSettings(): string {
    const crosshair = this.data.crosshair;
    return (
      '<section class="panel">' +
      this.renderPanelHeading("STEP 02 / 03 · CROSSHAIR", "크로스헤어 설정") +
      '<div class="crosshair-layout"><div class="crosshair-preview">' +
      renderCrosshairReticle(crosshair, "crosshair-reticle--preview", "data-crosshair-preview") +
      '</div><div class="settings-form"><label>COLOR<input data-crosshair="color" type="color" value="' +
      crosshair.color +
      '" /></label><label>LINE LENGTH<input data-crosshair="lineLength" type="range" min="0" max="20" value="' +
      crosshair.lineLength +
      '" /></label><label>THICKNESS<input data-crosshair="lineThickness" type="range" min="1" max="6" value="' +
      crosshair.lineThickness +
      '" /></label><label>CENTER GAP<input data-crosshair="centerGap" type="range" min="0" max="12" value="' +
      crosshair.centerGap +
      '" /></label><label class="checkbox-label"><input data-crosshair="showCenterDot" type="checkbox" ' +
      (crosshair.showCenterDot ? "checked" : "") +
      ' /> CENTER DOT</label><label>DOT SIZE<input data-crosshair="centerDotSize" type="range" min="1" max="8" value="' +
      crosshair.centerDotSize +
      '" /></label></div></div><button class="primary-button" data-screen="training-select">훈련 선택으로 이동</button></section>'
    );
  }

  private renderRecords(): string {
    const all = this.getAllResults();
    const results = filterTrainingResults(all, this.modeFilter, this.difficultyFilter);
    const personalBests = filterTrainingResults(
      this.getPersonalBests(all),
      this.modeFilter,
      this.difficultyFilter,
    ).sort((first, second) => second.score - first.score);
    const bestRows =
      personalBests.length === 0
        ? '<p class="muted-copy">아직 개인 최고 기록이 없습니다.</p>'
        : personalBests
              .map(
                (result) =>
                '<button class="record-row record-row-button personal-best" data-action="show-record" data-record-id="' +
                result.id +
                '" type="button"><span>' +
                result.modeId.toUpperCase() +
                "</span><span>" +
                result.difficulty.toUpperCase() +
                " · " +
                result.durationSeconds +
                "초" +
                "</span><strong>" +
                result.score +
                '</strong><span>PERSONAL BEST</span></button>',
              )
              .join("");
    const rows =
      results.length === 0
        ? '<div class="empty-state"><strong>NO RECORDS YET</strong><p>첫 훈련을 완료하면 결과가 여기에 저장됩니다.</p></div>'
        : results
              .map(
                (result) =>
                '<button class="record-row record-row-button" data-action="show-record" data-record-id="' +
                result.id +
                '" type="button"><span>' +
                result.modeId.toUpperCase() +
                "</span><span>" +
                result.difficulty.toUpperCase() +
                " · " +
                result.durationSeconds +
                "초" +
                "</span><strong>" +
                result.score +
                "</strong><span>" +
                new Date(result.playedAt).toLocaleDateString("ko-KR") +
                "</span></button>",
              )
              .join("");
    return (
      '<section class="panel">' +
      this.renderPanelHeading("PERFORMANCE LOG", "기록") +
      '<div class="filter-row"><label>MODE<select name="mode-filter"><option value="all">ALL</option>' +
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
      '</div><p class="records-sync-status">' +
      (this.account
        ? "Google 계정에 저장된 기록을 함께 표시합니다."
        : "이 기기의 기록입니다. Google 로그인 후에는 온라인 기록과 랭킹을 이용할 수 있습니다.") +
      '</p><div class="button-row"><button class="secondary-button" data-action="clear-records">기록 삭제</button><button class="text-button" data-action="reset-data">전체 데이터 초기화</button></div></section>'
    );
  }

  private getAllResults(): AimTrainingResult[] {
    const unique = new Map<string, AimTrainingResult>();
    for (const result of Object.values(this.data.records.aim.recent).flat()) {
      unique.set(result.id, result);
    }
    for (const result of this.remoteResults) {
      unique.set(result.id, result);
    }
    return [...unique.values()].sort((first, second) =>
      second.playedAt.localeCompare(first.playedAt),
    );
  }

  private getPersonalBests(all: AimTrainingResult[]): AimTrainingResult[] {
    const bestByMode = new Map<string, AimTrainingResult>();
    for (const result of all) {
      const key = modeDifficultyKey(
        result.modeId,
        result.difficulty,
        result.durationSeconds,
      );
      const current = bestByMode.get(key);
      if (!current || result.score > current.score) {
        bestByMode.set(key, result);
      }
    }
    return [...bestByMode.values()];
  }

  private renderRanking(): string {
    const entries =
      this.rankingStatus === "ready" && this.rankingEntries.length === 0
        ? '<div class="empty-state"><strong>NO RANKS YET</strong><p>첫 공개 기록을 기다리고 있습니다.</p></div>'
        : this.rankingStatus === "ready"
          ? this.rankingEntries
              .map(
                (entry) =>
                  '<article class="leaderboard-row"><strong>#' +
                  entry.rank +
                  '</strong><span>' +
                  escapeHtml(entry.displayName) +
                  '</span><span>' +
                  Math.round(entry.score).toLocaleString("ko-KR") +
                  '</span><span>' +
                  (entry.accuracy === null
                    ? "—"
                    : Math.round(entry.accuracy * 100) + "%") +
                  '</span><time datetime="' +
                  entry.completedAt +
                  '">' +
                  new Date(entry.completedAt).toLocaleDateString("ko-KR") +
                  "</time></article>",
              )
              .join("")
          : this.rankingStatus === "error"
            ? '<div class="empty-state"><strong>RANKING UNAVAILABLE</strong><p>' +
              escapeHtml(this.rankingMessage ?? "랭킹을 불러오지 못했습니다.") +
              "</p></div>"
            : this.rankingStatus === "unavailable"
              ? '<div class="empty-state"><strong>ONLINE RANKING SETUP REQUIRED</strong><p>온라인 랭킹은 서비스 연결 후 사용할 수 있습니다.</p></div>'
              : '<p class="muted-copy">랭킹을 불러오는 중입니다.</p>';
    return (
      '<section class="panel ranking-panel">' +
      this.renderPanelHeading("GLOBAL PERFORMANCE", "랭킹", "home") +
      '<p class="ranking-copy">모드·난이도·훈련 시간별 최고 점수입니다. 닉네임과 공개 점수만 표시됩니다.</p><div class="filter-row"><label>MODE<select name="ranking-mode">' +
      modeMeta
        .map(
          (mode) =>
            '<option value="' +
            mode.id +
            '"' +
            (mode.id === this.rankingMode ? " selected" : "") +
            ">" +
            mode.name +
            "</option>",
        )
        .join("") +
      '</select></label><label>DIFFICULTY<select name="ranking-difficulty"><option value="easy"' +
      (this.rankingDifficulty === "easy" ? " selected" : "") +
      '>EASY</option><option value="normal"' +
      (this.rankingDifficulty === "normal" ? " selected" : "") +
      '>NORMAL</option><option value="hard"' +
      (this.rankingDifficulty === "hard" ? " selected" : "") +
      '>HARD</option></select></label><label>TIME<select name="ranking-duration"><option value="30"' +
      (this.rankingDuration === 30 ? " selected" : "") +
      '>30초</option><option value="60"' +
      (this.rankingDuration === 60 ? " selected" : "") +
      '>60초</option></select></label></div><div class="leaderboard-list"><div class="leaderboard-row leaderboard-row--header"><span>RANK</span><span>PLAYER</span><span>SCORE</span><span>ACC</span><span>DATE</span></div>' +
      entries +
      "</div></section>"
    );
  }

  private resetLeaderboard(): void {
    this.rankingEntries = [];
    this.rankingStatus = "idle";
    this.rankingMessage = null;
    this.rankingRequestKey = null;
    this.render("ranking");
  }

  private rankingKey(): string {
    return (
      this.rankingMode +
      ":" +
      this.rankingDifficulty +
      ":" +
      this.rankingDuration
    );
  }

  private async loadLeaderboard(): Promise<void> {
    if (!this.accountService) {
      this.rankingStatus = "unavailable";
      return;
    }
    const requestKey = this.rankingKey();
    if (this.rankingRequestKey === requestKey && this.rankingStatus !== "idle") {
      return;
    }
    this.rankingRequestKey = requestKey;
    this.rankingStatus = "loading";
    try {
      const entries = await this.accountService.getLeaderboard({
        modeId: this.rankingMode,
        difficulty: this.rankingDifficulty,
        durationSeconds: this.rankingDuration,
      });
      if (requestKey !== this.rankingKey()) {
        return;
      }
      this.rankingEntries = entries;
      this.rankingStatus = "ready";
      this.rankingMessage = null;
    } catch (error) {
      if (requestKey !== this.rankingKey()) {
        return;
      }
      this.rankingStatus = "error";
      this.rankingMessage =
        error instanceof Error ? error.message : "랭킹을 불러오지 못했습니다.";
    }
    if (this.router.getCurrent() === "ranking") {
      this.render("ranking");
    }
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
      '</span><span data-hud-input>MOUSE LOCK READY</span></div><div class="arena" data-training-arena></div><div class="training-hud" data-training-hud><div class="training-crosshair">' +
      renderCrosshairReticle(this.data.crosshair, "crosshair-reticle--training", "data-training-crosshair") +
      '</div><div class="hud-time" data-hud-time>' +
      this.selectedDuration +
      '</div><div class="hud-score"><small>SCORE</small><strong data-hud-score>0</strong></div><div class="hud-meta"><span>ACC <b data-hud-accuracy>0%</b></span><span>COMBO <b data-hud-combo>0</b></span></div><div class="countdown" data-hud-countdown></div><p class="performance-warning is-hidden" data-hud-performance>PERFORMANCE BELOW 50 FPS · 그래픽 설정을 낮추거나 다른 탭을 닫아주세요.</p></div><div class="training-controls" data-training-controls><button class="primary-button" data-action="start-session">클릭하여 시작</button><button class="secondary-button" data-action="resume-session">재개</button><button class="text-button" data-action="end-session">훈련 종료</button></div><p class="training-help" data-training-help>MOUSE 시야 이동 · LMB 사격 · ESC 일시정지</p></section>'
    );
  }

  private renderResult(): string {
    const fallback = Object.values(this.data.records.aim.recent).flat()[0] ?? null;
    const result = this.currentResult ?? fallback;
    if (!result) {
      return '<section class="panel"><h1>결과가 없습니다</h1><button class="primary-button" data-screen="training-select">훈련 선택</button></section>';
    }
    const metrics = Object.entries(result.modeMetrics)
      .flatMap(([key, value]) => {
        const meta = resultMetricMeta[key];
        if (!meta || typeof value !== "number") {
          return [];
        }
        return [
          '<div><span>' +
            meta.label +
            "<small>" +
            meta.korean +
            "</small></span><strong>" +
            formatResultMetric(value, meta.format) +
            "</strong></div>",
        ];
      })
      .join("");
    const modeName = resultModeTranslations[result.modeId];
    const difficultyName = difficultyTranslations[result.difficulty];
    const inputName =
      result.inputSnapshot.pointerLockMode === "raw"
        ? "원시 마우스 입력"
        : "표준 마우스 입력";
    const genericShotMetrics = hasGenericShotMetrics(result)
      ? '<div class="stat-grid stat-grid--three"><div><span>HITS<small>명중</small></span><strong>' +
        result.hits +
        '</strong></div><div><span>ACCURACY<small>명중률</small></span><strong>' +
        (result.accuracy === null ? "—" : Math.round(result.accuracy * 100) + "%") +
        '</strong></div><div><span>MAX COMBO<small>최고 연속 명중</small></span><strong>' +
        result.maxCombo +
        "</strong></div></div>"
      : "";
    return (
      '<section class="panel result-panel">' +
      this.renderPanelHeading(
        result.durationSeconds +
          " SECONDS COMPLETE<small>" +
          result.durationSeconds +
          "초 훈련 완료</small>",
        result.modeId.toUpperCase(),
      ) +
      '<p class="result-mode-translation">' +
      modeName +
      '</p><div class="result-score-block"><span>SCORE<small>점수</small></span><output class="result-score">' +
      Math.round(result.score).toLocaleString("ko-KR") +
      '</output></div><div class="result-context"><div><span>' +
      result.difficulty.toUpperCase() +
      "<small>" +
      difficultyName +
      "</small></span></div><div><span>" +
      result.sensitivitySnapshot.edpi +
      ' eDPI<small>유효 감도</small></span></div><div><span>' +
      result.inputSnapshot.pointerLockMode.toUpperCase() +
      "<small>" +
      inputName +
      '</small></span></div></div>' +
       genericShotMetrics +
       '<div class="metric-grid">' +
       metrics +
       "</div>" +
       this.renderResultAccountPrompt() +
       '<div class="button-row"><button class="primary-button" data-action="retry">같은 설정으로 재도전</button><button class="secondary-button" data-screen="training-select">훈련 선택</button><button class="text-button" data-screen="records">기록 보기</button></div></section>'
    );
  }

  private renderResultAccountPrompt(): string {
    if (this.account) {
      return '<p class="result-account-prompt">Google 계정에 이 기록을 저장하고 있습니다.</p>';
    }
    if (this.accountService) {
      return '<p class="result-account-prompt">Google 로그인으로 이 기록을 온라인에 저장하고 랭킹에 참여하세요. <button class="text-button" data-action="sign-in-google" type="button">GOOGLE LOGIN</button></p>';
    }
    return "";
  }

  private renderAfterAccountChange(): void {
    const screen = this.router.getCurrent();
    if (screen !== "training") {
      this.render(screen);
    }
  }

  private async initializeAccount(): Promise<void> {
    if (!this.accountService) {
      return;
    }
    try {
      this.account = await this.accountService.getCurrentAccount();
      this.remoteResults = this.account
        ? await this.accountService.getOwnRuns()
        : [];
      await this.syncLocalRecords();
      this.accountUnsubscribe = this.accountService.observeAuthChanges((user) => {
        void this.syncAccount(user);
      });
    } catch {
      // A missing or stale browser session must not look like a failed login.
      // The sign-in button remains the recovery path for a guest visitor.
      this.account = null;
      this.remoteResults = [];
      this.accountMessage = null;
    }
    this.renderAfterAccountChange();
  }

  private async syncAccount(user: User | null): Promise<void> {
    if (!this.accountService) {
      return;
    }
    try {
      this.account = user ? await this.accountService.getProfile(user) : null;
      this.remoteResults = this.account
        ? await this.accountService.getOwnRuns()
        : [];
      await this.syncLocalRecords();
      this.accountMessage = null;
    } catch {
      this.accountMessage = "Google 로그인 정보를 동기화하지 못했습니다.";
    }
    this.renderAfterAccountChange();
  }

  private async startGoogleSignIn(): Promise<void> {
    if (!this.accountService) {
      this.accountMessage = "온라인 기능 설정이 필요합니다.";
      this.renderAfterAccountChange();
      return;
    }
    try {
      await this.accountService.signInWithGoogle(window.location.origin + "/");
    } catch {
      this.accountMessage = "Google 로그인을 시작하지 못했습니다.";
      this.renderAfterAccountChange();
    }
  }

  private async signOut(): Promise<void> {
    if (!this.accountService) {
      return;
    }
    try {
      await this.accountService.signOut();
      this.account = null;
      this.remoteResults = [];
      this.accountMessage = null;
    } catch {
      this.accountMessage = "로그아웃하지 못했습니다.";
    }
    this.renderAfterAccountChange();
  }

  private async saveRemoteRun(result: AimTrainingResult): Promise<void> {
    if (!this.accountService || !this.account) {
      return;
    }
    try {
      await this.accountService.saveRun(result);
      this.remoteResults = [
        result,
        ...this.remoteResults.filter((existing) => existing.id !== result.id),
      ];
      this.accountMessage = null;
    } catch {
      this.accountMessage =
        "온라인 저장에 실패했습니다. 이 기기의 기록은 유지됩니다.";
    }
    this.renderAfterAccountChange();
  }

  private async syncLocalRecords(): Promise<void> {
    if (!this.accountService || !this.account) {
      return;
    }
    const syncedIds = new Set(this.remoteResults.map((result) => result.id));
    const pending = Object.values(this.data.records.aim.recent)
      .flat()
      .filter((result) => !syncedIds.has(result.id));
    for (const result of pending) {
      try {
        await this.accountService.saveRun(result);
        this.remoteResults = [
          result,
          ...this.remoteResults.filter((existing) => existing.id !== result.id),
        ];
      } catch {
        this.accountMessage =
          "일부 로컬 기록을 온라인에 저장하지 못했습니다. 이 기기의 기록은 유지됩니다.";
        return;
      }
    }
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
        this.router.navigate("crosshair-settings");
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
      onStatusChange: () => this.syncTrainingOverlay(),
      onComplete: (metrics, pointerLockMode) => {
        const result = buildAimTrainingResult(
          {
            modeId: this.selectedMode,
            difficulty: this.selectedDifficulty,
            durationSeconds: this.selectedDuration,
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
        void this.saveRemoteRun(result);
      },
    });
    this.engine.prepare({
      modeId: this.selectedMode,
      difficulty: this.selectedDifficulty,
      durationSeconds: this.selectedDuration,
      sensitivity: this.data.sensitivity,
      crosshair: this.data.crosshair,
    });
  }

  private syncTrainingOverlay(): void {
    const status = this.engine?.getStatus();
    const isTrainingActive = status === "countdown" || status === "running";
    this.root
      .querySelector<HTMLElement>("[data-training-controls]")
      ?.classList.toggle("is-hidden", isTrainingActive);
    this.root
      .querySelector<HTMLElement>("[data-training-help]")
      ?.classList.toggle("is-hidden", isTrainingActive);
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
