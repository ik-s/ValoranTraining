import type { DirectionZone } from "./types";

export const classifyDirection = (yaw: number, pitch: number): DirectionZone => {
  if (Math.abs(yaw) <= 10 && Math.abs(pitch) <= 10) {
    return "center";
  }
  if (Math.abs(yaw) >= Math.abs(pitch)) {
    return yaw < 0 ? "left" : "right";
  }
  return pitch < 0 ? "down" : "up";
};
