import { describe, expect, it } from "vitest";

import { AppRouter } from "../../src/app/AppRouter";

describe("AppRouter", () => {
  it("notifies the active screen after navigation", () => {
    const seen: string[] = [];
    const router = new AppRouter((screen) => seen.push(screen));

    router.navigate("records");

    expect(seen).toEqual(["home", "records"]);
  });
});
