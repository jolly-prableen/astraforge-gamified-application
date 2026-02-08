export type Rng = () => number;

export const mulberry32 = (seed: number): Rng => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomRange = (rng: Rng, min: number, max: number) =>
  min + (max - min) * rng();

export const randomInSphere = (rng: Rng, radius: number): [number, number, number] => {
  const u = rng();
  const v = rng();
  const theta = u * Math.PI * 2;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(rng()) * radius;
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  ];
};
