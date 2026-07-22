export const VALORANT_HORIZONTAL_FOV = 103;

export const calculateValorantVerticalFov = (aspect: number): number =>
  (2 * Math.atan(Math.tan((VALORANT_HORIZONTAL_FOV * Math.PI) / 360) / aspect) *
    180) /
  Math.PI;
