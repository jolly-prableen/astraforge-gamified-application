export type UserLevelInfo = {
  level: 1 | 2 | 3;
  title: "Cadet Initiate" | "Astral Voyager" | "Constellation Master";
  minXp: number;
  maxXp: number | null;
};

export const getUserLevel = (totalXP: number): UserLevelInfo => {
  if (totalXP >= 100) {
    return { level: 3, title: "Constellation Master", minXp: 100, maxXp: null };
  }

  if (totalXP >= 50) {
    return { level: 2, title: "Astral Voyager", minXp: 50, maxXp: 99 };
  }

  return { level: 1, title: "Cadet Initiate", minXp: 0, maxXp: 49 };
};
