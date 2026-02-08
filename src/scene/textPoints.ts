import type { Vec3 } from "./constellation";

type TextPointOptions = {
  fontFamily: string;
  fontSize: number;
  weight?: string;
  step?: number;
  width?: number;
  height?: number;
  scale?: number;
};

export const generateTextPoints = (text: string, options: TextPointOptions): Vec3[] => {
  const {
    fontFamily,
    fontSize,
    weight = "600",
    step = 6,
    width = 540,
    height = 200,
    scale = 0.02
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return [];
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height).data;
  const points: Vec3[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4 + 3;
      if (imageData[index] > 0) {
        const nx = (x - width / 2) * scale;
        const ny = (height / 2 - y) * scale;
        points.push([nx, ny, 0]);
      }
    }
  }

  return points;
};
