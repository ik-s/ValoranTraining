import { describe, expect, it } from "vitest";

import { createSensitivityForm } from "../../src/ui/SensitivityForm";

describe("createSensitivityForm", () => {
  it("renders eDPI immediately when DPI and sensitivity change", () => {
    const form = createSensitivityForm(null, () => undefined);
    const dpi = form.querySelector<HTMLInputElement>('[name="dpi"]');
    const sensitivity = form.querySelector<HTMLInputElement>(
      '[name="valorantSensitivity"]',
    );
    const edpi = form.querySelector<HTMLOutputElement>("[data-edpi]");

    dpi!.value = "800";
    dpi!.dispatchEvent(new Event("input"));
    sensitivity!.value = "0.32";
    sensitivity!.dispatchEvent(new Event("input"));

    expect(edpi?.value).toBe("256");
  });
});
