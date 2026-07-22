import type { AppScreen } from "./AppState";

export class AppRouter {
  private current: AppScreen = "home";

  constructor(private readonly onChange: (screen: AppScreen) => void) {
    this.onChange(this.current);
  }

  navigate(screen: AppScreen): void {
    this.current = screen;
    this.onChange(screen);
  }

  getCurrent(): AppScreen {
    return this.current;
  }
}
