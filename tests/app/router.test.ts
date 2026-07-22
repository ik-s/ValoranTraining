import { describe, expect, it } from "vitest";

import { AppRouter } from "../../src/app/AppRouter";

describe("AppRouter", () => {
  it("notifies the active screen after navigation", () => {
    const seen: string[] = [];
    const router = new AppRouter((screen) => seen.push(screen));

    router.navigate("records");

    expect(seen).toEqual(["home", "records"]);
  });

  it("returns to the previous screen", () => {
    const seen: string[] = [];
    const router = new AppRouter((screen) => seen.push(screen));

    router.navigate("sensitivity-settings");

    expect((router as AppRouter & { back?: () => string }).back?.()).toBe("home");
    expect(seen).toEqual(["home", "sensitivity-settings", "home"]);
  });
});
