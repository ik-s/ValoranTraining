import type { AppScreen } from "./AppState";

export class AppRouter {
  private current: AppScreen = "home";
  private readonly history: AppScreen[] = [];

  constructor(private readonly onChange: (screen: AppScreen) => void) {
    this.onChange(this.current);
  }

  navigate(screen: AppScreen): void {
    if (screen !== this.current) {
      this.history.push(this.current);
    }
    this.current = screen;
    this.onChange(screen);
  }

  back(): AppScreen {
    this.current = this.history.pop() ?? "home";
    this.onChange(this.current);
    return this.current;
  }

  getCurrent(): AppScreen {
    return this.current;
  }
}
