import {
  calculateEdpi,
  validateValorantSensitivity,
} from "../domain/ValorantSensitivityService";
import type { ValorantSensitivitySettings } from "../domain/types";

export const createSensitivityForm = (
  settings: ValorantSensitivitySettings | null,
  onSubmit: (settings: ValorantSensitivitySettings) => void,
): HTMLFormElement => {
  const form = document.createElement("form");
  form.className = "settings-form";
  form.innerHTML = [
    '<label>MOUSE DPI<input name="dpi" type="number" min="100" max="20000" step="1" required /></label>',
    '<label>VALORANT SENSITIVITY<input name="valorantSensitivity" type="number" min="0.001" max="10" step="0.0001" required /></label>',
    '<div class="edpi-readout"><span>eDPI</span><output data-edpi></output></div>',
    '<p class="form-message" data-message aria-live="polite"></p>',
    '<button class="primary-button" type="submit">설정 저장</button>',
  ].join("");
  const dpi = form.elements.namedItem("dpi") as HTMLInputElement;
  const sensitivity = form.elements.namedItem(
    "valorantSensitivity",
  ) as HTMLInputElement;
  const edpi = form.querySelector<HTMLOutputElement>("[data-edpi]")!;
  const message = form.querySelector<HTMLElement>("[data-message]")!;
  dpi.value = settings ? String(settings.dpi) : "";
  sensitivity.value = settings ? String(settings.valorantSensitivity) : "";

  const updateEdpi = (): void => {
    const dpiValue = Number(dpi.value);
    const sensitivityValue = Number(sensitivity.value);
    edpi.value =
      Number.isFinite(dpiValue) && Number.isFinite(sensitivityValue)
        ? String(calculateEdpi(dpiValue, sensitivityValue))
        : "—";
  };
  dpi.addEventListener("input", updateEdpi);
  sensitivity.addEventListener("input", updateEdpi);
  updateEdpi();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = {
      dpi: Number(dpi.value),
      valorantSensitivity: Number(sensitivity.value),
    };
    const validation = validateValorantSensitivity(input);
    if (!validation.isValid) {
      message.textContent = Object.values(validation.errors).join(" ");
      return;
    }
    message.textContent = validation.warnings.join(" ");
    onSubmit({
      ...input,
      edpi: calculateEdpi(input.dpi, input.valorantSensitivity),
      calibrationMultiplier: 1,
      calibratedAt: null,
    });
  });
  return form;
};
