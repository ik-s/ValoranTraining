import type {
  AccountProfile,
  ProfileSaveInput,
} from "../infrastructure/SupabaseAccountService";

const displayPreview = (
  container: HTMLElement,
  profile: AccountProfile,
  source: string | null,
): void => {
  container.replaceChildren();
  if (!source) {
    const copy = document.createElement("p");
    copy.className = "profile-photo-empty";
    copy.textContent = "프로필 사진을 선택해주세요";
    container.append(copy);
    return;
  }
  const image = document.createElement("img");
  image.src = source;
  image.alt = profile.displayName + " 프로필 사진";
  container.append(image);
};

export const createProfileForm = (
  profile: AccountProfile,
  onSave: (input: ProfileSaveInput) => Promise<void>,
): HTMLFormElement => {
  const form = document.createElement("form");
  form.className = "settings-form profile-form";
  form.dataset.profileForm = "";

  const photoGroup = document.createElement("div");
  photoGroup.className = "profile-photo-group";
  const preview = document.createElement("div");
  preview.className = "profile-photo-preview";
  displayPreview(preview, profile, profile.avatarUrl);

  const photoLabel = document.createElement("label");
  photoLabel.textContent = "PROFILE PHOTO";
  const photoInput = document.createElement("input");
  photoInput.name = "avatar";
  photoInput.type = "file";
  photoInput.accept = "image/jpeg,image/png,image/webp";
  photoLabel.append(photoInput);
  const photoHelp = document.createElement("small");
  photoHelp.textContent = "JPEG, PNG, WebP · 최대 2MB";
  photoLabel.append(photoHelp);
  photoGroup.append(preview, photoLabel);

  const nicknameLabel = document.createElement("label");
  nicknameLabel.textContent = "NICKNAME";
  const nicknameInput = document.createElement("input");
  nicknameInput.name = "displayName";
  nicknameInput.type = "text";
  nicknameInput.minLength = 3;
  nicknameInput.maxLength = 32;
  nicknameInput.required = true;
  nicknameInput.value = profile.displayName;
  nicknameLabel.append(nicknameInput);

  const message = document.createElement("p");
  message.className = "form-message";
  message.setAttribute("role", "status");
  const submit = document.createElement("button");
  submit.className = "primary-button";
  submit.type = "submit";
  submit.textContent = "프로필 저장";
  form.append(photoGroup, nicknameLabel, message, submit);

  let selectedAvatar: File | null = null;
  let previewObjectUrl: string | null = null;
  photoInput.addEventListener("change", () => {
    selectedAvatar = photoInput.files?.[0] ?? null;
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
    if (selectedAvatar && typeof URL.createObjectURL === "function") {
      previewObjectUrl = URL.createObjectURL(selectedAvatar);
      displayPreview(preview, profile, previewObjectUrl);
      return;
    }
    displayPreview(preview, profile, profile.avatarUrl);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const displayName = nicknameInput.value.trim();
    if (displayName.length < 3 || displayName.length > 32) {
      message.textContent = "닉네임은 3~32자로 입력해주세요.";
      return;
    }
    submit.disabled = true;
    message.textContent = "프로필을 저장하고 있습니다…";
    try {
      await onSave({ displayName, avatarFile: selectedAvatar });
    } catch (error) {
      message.textContent =
        error instanceof Error ? error.message : "프로필을 저장하지 못했습니다.";
      submit.disabled = false;
    }
  });

  return form;
};
