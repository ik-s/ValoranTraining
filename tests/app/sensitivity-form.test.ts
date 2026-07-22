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

  it("shows the VALORANT 360 distance from DPI and sensitivity", () => {
    const form = createSensitivityForm(null, () => undefined);
    const dpi = form.querySelector<HTMLInputElement>('[name="dpi"]');
    const sensitivity = form.querySelector<HTMLInputElement>(
      '[name="valorantSensitivity"]',
    );
    const distance = form.querySelector<HTMLOutputElement>("[data-cm-per-360]");

    dpi!.value = "800";
    dpi!.dispatchEvent(new Event("input"));
    sensitivity!.value = "0.32";
    sensitivity!.dispatchEvent(new Event("input"));

    expect(distance?.value).toBe("51.0 cm");
  });

  it("explains that the DPI field does not change the hardware DPI", () => {
    const form = createSensitivityForm(null, () => undefined);

    expect(form.textContent).toContain(
      "이 숫자를 바꿔도 브라우저나 마우스 DPI는 바뀌지 않습니다",
    );
  });
});
