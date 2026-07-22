import { DEFAULT_CROSSHAIR_SETTINGS } from "./Crosshair";
import type { AimTrainingResult } from "./Results";
import type {
  AimModeId,
  CrosshairSettings,
  Difficulty,
  ValorantSensitivitySettings,
} from "./types";

export const STORAGE_KEY = "valorant-aim-trainer:data";

export type ModeDifficultyKey = string;

export interface UserPreferences {
  fullscreenRecommended: boolean;
  fpsWarning: boolean;
  muted: boolean;
  volume: number;
}

export interface StoredTrainingRecords {
  aim: {
    recent: Record<ModeDifficultyKey, AimTrainingResult[]>;
    personalBests: Record<ModeDifficultyKey, AimTrainingResult | null>;
  };
}

export interface StoredAppData {
  version: 1;
  sensitivity: ValorantSensitivitySettings | null;
  crosshair: CrosshairSettings;
  preferences: UserPreferences;
  records: StoredTrainingRecords;
  lastSelection: {
    modeId: AimModeId;
    difficulty: Difficulty;
  } | null;
}

const defaultPreferences = (): UserPreferences => ({
  fullscreenRecommended: true,
  fpsWarning: true,
  muted: false,
  volume: 70,
});

export const createDefaultAppData = (): StoredAppData => ({
  version: 1,
  sensitivity: null,
  crosshair: { ...DEFAULT_CROSSHAIR_SETTINGS },
  preferences: defaultPreferences(),
  records: { aim: { recent: {}, personalBests: {} } },
  lastSelection: null,
});

export const modeDifficultyKey = (
  modeId: AimModeId,
  difficulty: Difficulty,
): ModeDifficultyKey => modeId + ":" + difficulty;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSensitivity = (
  value: unknown,
): value is ValorantSensitivitySettings =>
  isObject(value) &&
  typeof value.dpi === "number" &&
  typeof value.valorantSensitivity === "number" &&
  typeof value.edpi === "number" &&
  typeof value.calibrationMultiplier === "number" &&
  (typeof value.calibratedAt === "string" || value.calibratedAt === null);

const isAimResult = (value: unknown): value is AimTrainingResult =>
  isObject(value) &&
  value.resultType === "aim" &&
  typeof value.id === "string" &&
  typeof value.score === "number" &&
  typeof value.modeId === "string" &&
  typeof value.difficulty === "string";

const recoverCrosshair = (value: unknown): CrosshairSettings => {
  if (!isObject(value)) {
    return { ...DEFAULT_CROSSHAIR_SETTINGS };
  }
  return {
    color: typeof value.color === "string" ? value.color : DEFAULT_CROSSHAIR_SETTINGS.color,
    lineLength: typeof value.lineLength === "number" ? value.lineLength : DEFAULT_CROSSHAIR_SETTINGS.lineLength,
    lineThickness: typeof value.lineThickness === "number" ? value.lineThickness : DEFAULT_CROSSHAIR_SETTINGS.lineThickness,
    centerGap: typeof value.centerGap === "number" ? value.centerGap : DEFAULT_CROSSHAIR_SETTINGS.centerGap,
    showCenterDot: typeof value.showCenterDot === "boolean" ? value.showCenterDot : DEFAULT_CROSSHAIR_SETTINGS.showCenterDot,
    centerDotSize: typeof value.centerDotSize === "number" ? value.centerDotSize : DEFAULT_CROSSHAIR_SETTINGS.centerDotSize,
  };
};

const recoverRecords = (value: unknown): StoredTrainingRecords => {
  if (!isObject(value) || !isObject(value.aim)) {
    return { aim: { recent: {}, personalBests: {} } };
  }
  const aim = value.aim;
  const recent: Record<ModeDifficultyKey, AimTrainingResult[]> = {};
  if (isObject(aim.recent)) {
    for (const [key, entries] of Object.entries(aim.recent)) {
      if (Array.isArray(entries)) {
        recent[key] = entries.filter(isAimResult).slice(0, 10);
      }
    }
  }
  const personalBests: Record<ModeDifficultyKey, AimTrainingResult | null> = {};
  if (isObject(aim.personalBests)) {
    for (const [key, entry] of Object.entries(aim.personalBests)) {
      personalBests[key] = isAimResult(entry) ? entry : null;
    }
  }
  return { aim: { recent, personalBests } };
};

const recoverData = (raw: unknown): StoredAppData => {
  const defaults = createDefaultAppData();
  if (!isObject(raw) || raw.version !== 1) {
    return defaults;
  }
  const preferences = isObject(raw.preferences) ? raw.preferences : {};
  const lastSelection = isObject(raw.lastSelection) &&
    typeof raw.lastSelection.modeId === "string" &&
    typeof raw.lastSelection.difficulty === "string"
    ? {
        modeId: raw.lastSelection.modeId as AimModeId,
        difficulty: raw.lastSelection.difficulty as Difficulty,
      }
    : null;
  return {
    ...defaults,
    sensitivity: isSensitivity(raw.sensitivity) ? raw.sensitivity : null,
    crosshair: recoverCrosshair(raw.crosshair),
    preferences: {
      fullscreenRecommended:
        typeof preferences.fullscreenRecommended === "boolean"
          ? preferences.fullscreenRecommended
          : defaults.preferences.fullscreenRecommended,
      fpsWarning:
        typeof preferences.fpsWarning === "boolean"
          ? preferences.fpsWarning
          : defaults.preferences.fpsWarning,
      muted:
        typeof preferences.muted === "boolean"
          ? preferences.muted
          : defaults.preferences.muted,
      volume:
        typeof preferences.volume === "number"
          ? preferences.volume
          : defaults.preferences.volume,
    },
    records: recoverRecords(raw.records),
    lastSelection,
  };
};

export class StorageService {
  constructor(private readonly storage: Storage) {}

  load(): StoredAppData {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) {
        return createDefaultAppData();
      }
      return recoverData(JSON.parse(raw));
    } catch {
      return createDefaultAppData();
    }
  }

  saveSensitivity(sensitivity: ValorantSensitivitySettings): boolean {
    const data = this.load();
    return this.save({ ...data, sensitivity });
  }

  saveCrosshair(crosshair: CrosshairSettings): boolean {
    const data = this.load();
    return this.save({ ...data, crosshair });
  }

  record(result: AimTrainingResult): boolean {
    const data = this.load();
    const key = modeDifficultyKey(result.modeId, result.difficulty);
    const previousRecent = data.records.aim.recent[key] ?? [];
    const previousBest = data.records.aim.personalBests[key] ?? null;
    const recent = {
      ...data.records.aim.recent,
      [key]: [result, ...previousRecent].slice(0, 10),
    };
    const personalBests = {
      ...data.records.aim.personalBests,
      [key]:
        !previousBest || result.score > previousBest.score ? result : previousBest,
    };
    return this.save({
      ...data,
      records: { aim: { recent, personalBests } },
      lastSelection: { modeId: result.modeId, difficulty: result.difficulty },
    });
  }

  clearRecords(): boolean {
    const data = this.load();
    return this.save({ ...data, records: { aim: { recent: {}, personalBests: {} } } });
  }

  resetAll(): boolean {
    return this.save(createDefaultAppData());
  }

  private save(data: StoredAppData): boolean {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
}
