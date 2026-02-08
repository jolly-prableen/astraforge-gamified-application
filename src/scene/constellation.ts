import { mulberry32, randomInSphere, randomRange } from "./random";

export type Vec3 = [number, number, number];

export const generateConstellation = (seed: number, count: number): Vec3[] => {
  const rng = mulberry32(seed);
  const points: Vec3[] = [[0, 0, 0]];
  for (let i = 1; i < count; i += 1) {
    const [x, y, z] = randomInSphere(rng, randomRange(rng, 1.8, 4.2));
    points.push([x, y, z]);
  }
  return points;
};

export const generateBackgroundStars = (seed: number, count: number, spread: number) => {
  const rng = mulberry32(seed + 9999);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const [x, y, z] = randomInSphere(rng, spread);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};

export const generateOrbitalSpherePositions = (count: number, radius: number) => {
  const positions = new Float32Array(count * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const shells = [0.86, 0.94, 1.0, 1.08];
  const shellCounts = shells.map((_, index) => Math.round((count / shells.length) * (1 + index * 0.05)));

  let writeIndex = 0;
  for (let shellIndex = 0; shellIndex < shells.length; shellIndex += 1) {
    const shellRadius = radius * shells[shellIndex];
    const shellCount = shellCounts[shellIndex];
    for (let i = 0; i < shellCount && writeIndex < count; i += 1) {
      const t = i / Math.max(1, shellCount - 1);
      const y = 1 - t * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * (i + shellIndex * 17);
      positions[writeIndex * 3] = Math.cos(theta) * r * shellRadius;
      positions[writeIndex * 3 + 1] = y * shellRadius;
      positions[writeIndex * 3 + 2] = Math.sin(theta) * r * shellRadius;
      writeIndex += 1;
    }
  }

  if (writeIndex < count) {
    const shellRadius = radius * shells[shells.length - 1];
    for (let i = writeIndex; i < count; i += 1) {
      const t = (i - writeIndex) / Math.max(1, count - writeIndex - 1);
      const y = 1 - t * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      positions[i * 3] = Math.cos(theta) * r * shellRadius;
      positions[i * 3 + 1] = y * shellRadius;
      positions[i * 3 + 2] = Math.sin(theta) * r * shellRadius;
    }
  }

  return positions;
};

export const generateOrbitalStartPositions = (seed: number, count: number, spread: number) => {
  const rng = mulberry32(seed + 11777);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const [x, y, z] = randomInSphere(rng, spread);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};

