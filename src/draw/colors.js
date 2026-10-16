
export const PALETTE_COLORS = [
  [255, 255, 255], [0, 0, 0], [193, 193, 193], [80, 80, 80],
  [239, 19, 11], [116, 11, 7], [255, 113, 0], [194, 56, 0],
  [255, 228, 0], [232, 162, 0], [0, 204, 0], [0, 70, 25],
  [0, 255, 145], [0, 120, 93], [0, 178, 255], [0, 86, 158],
  [35, 31, 211], [14, 8, 101], [163, 0, 186], [85, 0, 105],
  [223, 105, 167], [135, 53, 84], [255, 172, 142], [204, 119, 77],
  [160, 82, 45], [99, 48, 13],
];


export const PALETTE_COLOR_NAMES = [
  "White", "Black", "Light Gray", "Gray", "Red", "Dark Red",
  "Orange", "Dark Orange", "Yellow", "Dark Yellow", "Green", "Dark Green",
  "Mint", "Dark Mint", "Skyblue", "Dark Skyblue", "Seablue", "Dark Seablue",
  "Purple", "Dark Purple", "Pink", "Dark Pink", "Beige", "Dark Beige",
  "Brown", "Dark Brown",
];


export function colorRgb(index) {
  const clamped = clampIndex(index, 0, PALETTE_COLORS.length);
  const [r, g, b] = PALETTE_COLORS[clamped];
  return { r, g, b };
}


export function rgbString(entry) {
  return "rgb(" + entry[0] + "," + entry[1] + "," + entry[2] + ")";
}

function clampIndex(value, min, max) {
  return value < min ? min : max < value ? max : value;
}
