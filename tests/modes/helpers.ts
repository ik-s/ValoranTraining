import type {
  TrainingModeContext,
  TrainingTarget,
} from "../../src/modes/TrainingMode";
import type { Difficulty } from "../../src/domain/types";

export const createModeContext = (
  difficulty: Difficulty,
  randomValues: number[] = [0.5],
): TrainingModeContext & {
  activeTargets: TrainingTarget[];
  addedTargets: TrainingTarget[];
  removedTargetIds: string[];
} => {
  let randomIndex = 0;
  let id = 0;
  const activeTargets: TrainingTarget[] = [];
  const addedTargets: TrainingTarget[] = [];
  const removedTargetIds: string[] = [];
  return {
    difficulty,
    random: () => {
      const value = randomValues[randomIndex % randomValues.length] ?? 0.5;
      randomIndex += 1;
      return value;
    },
    createId: () => String(++id),
    activeTargets,
    addedTargets,
    removedTargetIds,
    addTarget: (target) => {
      activeTargets.push(target);
      addedTargets.push(target);
    },
    updateTarget: (target) => {
      const index = activeTargets.findIndex((item) => item.id === target.id);
      if (index >= 0) {
        activeTargets[index] = target;
      }
    },
    removeTarget: (targetId) => {
      const index = activeTargets.findIndex((target) => target.id === targetId);
      if (index >= 0) {
        activeTargets.splice(index, 1);
      }
      removedTargetIds.push(targetId);
    },
  };
};
