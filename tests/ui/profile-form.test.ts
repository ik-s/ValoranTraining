import { describe, expect, it, vi } from "vitest";

import type { AccountProfile } from "../../src/infrastructure/SupabaseAccountService";
import { createProfileForm } from "../../src/ui/ProfileForm";

const incompleteProfile: AccountProfile = {
  id: "me",
  displayName: "훈련생-ABC123",
  avatarUrl: null,
  profileCompleted: false,
};

describe("createProfileForm", () => {
  it("submits a trimmed nickname with the selected profile image", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const form = createProfileForm(incompleteProfile, save);
    const nickname = form.querySelector<HTMLInputElement>("[name=displayName]");

    nickname!.value = "  조준왕  ";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(save).toHaveBeenCalledWith({
        displayName: "조준왕",
        avatarFile: null,
      });
    });
  });

  it("passes a newly selected profile image to the save action", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const form = createProfileForm(incompleteProfile, save);
    const fileInput = form.querySelector<HTMLInputElement>("[name=avatar]");
    const file = new File(["image"], "profile.png", { type: "image/png" });

    Object.defineProperty(fileInput, "files", { value: [file] });
    fileInput!.dispatchEvent(new Event("change", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(save).toHaveBeenCalledWith({
        displayName: "훈련생-ABC123",
        avatarFile: file,
      });
    });
  });
});
