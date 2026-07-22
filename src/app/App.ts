import { AppRouter } from "./AppRouter";
import type { AppScreen } from "./AppState";
import { screenLabels } from "./AppState";

const navItems: Array<{ screen: AppScreen; label: string }> = [
  { screen: "home", label: "TRAINING" },
  { screen: "records", label: "RECORDS" },
  { screen: "sensitivity-settings", label: "SETTINGS" },
];

export class App {
  private readonly router: AppRouter;

  constructor(private readonly root: HTMLElement) {
    this.router = new AppRouter((screen) => this.render(screen));
  }

  mount(): void {
    this.root.addEventListener("click", this.handleClick);
    this.render(this.router.getCurrent());
  }

  dispose(): void {
    this.root.removeEventListener("click", this.handleClick);
    this.root.replaceChildren();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>("[data-screen]");
    const screen = button?.dataset.screen as AppScreen | undefined;
    if (screen) {
      this.router.navigate(screen);
    }
  };

  private render(screen: AppScreen): void {
    const navigation = navItems
      .map(({ screen: itemScreen, label }) =>
        '<button class="nav-button ' + (itemScreen === screen ? "is-active" : "") +
        '" data-screen="' + itemScreen + '" type="button">' + label + "</button>")
      .join("");
    this.root.innerHTML =
      '<div class="app-shell">' +
      '<header class="topbar">' +
      '<a class="brand" href="#home" aria-label="Valoran Training home">VALORAN <span>TRAINING</span></a>' +
      '<nav aria-label="주요 메뉴">' + navigation + "</nav></header>" +
      '<main class="app-content"><section class="placeholder-panel" aria-live="polite">' +
      '<p class="eyebrow">SYSTEM ONLINE</p><h1>' + screenLabels[screen] + "</h1>" +
      "<p>VALORANT 감도 기반 훈련 시스템을 준비하고 있습니다.</p>" +
      "</section></main></div>";
  }
}
