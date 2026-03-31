import { db } from "../db/sqlite.js";

const SELECT_PROGRESS_SQL = `
  SELECT user_id, xp, level, badges, updated_at
  FROM user_progress
  WHERE user_id = ?
`;

const INSERT_PROGRESS_SQL = `
  INSERT INTO user_progress (user_id, xp, level, badges, updated_at)
  VALUES (?, ?, ?, ?, ?)
`;

const UPDATE_PROGRESS_SQL = `
  UPDATE user_progress
  SET xp = ?, level = ?, badges = ?, updated_at = ?
  WHERE user_id = ?
`;

const selectProgressStatement = db.prepare(SELECT_PROGRESS_SQL);
const insertProgressStatement = db.prepare(INSERT_PROGRESS_SQL);
const updateProgressStatement = db.prepare(UPDATE_PROGRESS_SQL);

export const calculateLevel = (xp) => Math.floor(xp / 100) + 1;

const normalizeUserId = (userId) => {
  if (typeof userId !== "string") {
    throw new Error("userId must be a string.");
  }

  const trimmed = userId.trim();
  if (!trimmed) {
    throw new Error("userId cannot be empty.");
  }

  return trimmed;
};

const parseBadges = (value) => {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
};

const normalizeBadges = (badges) => {
  if (!Array.isArray(badges)) {
    throw new Error("badges must be an array.");
  }

  return badges.filter((badge) => typeof badge === "string");
};

const mapProgressRow = (row) => ({
  userId: row.user_id,
  xp: row.xp,
  level: row.level,
  badges: parseBadges(row.badges),
  updatedAt: row.updated_at
});

const selectProgressRow = (userId) => {
  return selectProgressStatement.get(userId);
};

export const getOrCreateProgress = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  const existing = selectProgressRow(normalizedUserId);

  if (existing) {
    return mapProgressRow(existing);
  }

  const now = new Date().toISOString();
  insertProgressStatement.run(normalizedUserId, 0, 1, "[]", now);

  const created = selectProgressRow(normalizedUserId);
  return mapProgressRow(created);
};

export const upsertProgress = (userId, data = {}) => {
  const normalizedUserId = normalizeUserId(userId);
  const current = getOrCreateProgress(normalizedUserId);

  const nextXp = data.xp === undefined ? current.xp : data.xp;
  if (!Number.isInteger(nextXp) || nextXp < 0) {
    throw new Error("xp must be a non-negative integer.");
  }

  const nextBadges = data.badges === undefined ? current.badges : normalizeBadges(data.badges);
  const nextLevel = calculateLevel(nextXp);
  const now = new Date().toISOString();

  updateProgressStatement.run(nextXp, nextLevel, JSON.stringify(nextBadges), now, normalizedUserId);

  const updated = selectProgressRow(normalizedUserId);
  return mapProgressRow(updated);
};

export const addXp = (userId, xpToAdd) => {
  const normalizedUserId = normalizeUserId(userId);

  if (!Number.isInteger(xpToAdd) || xpToAdd <= 0) {
    throw new Error("xpToAdd must be a positive integer.");
  }

  const current = getOrCreateProgress(normalizedUserId);
  return upsertProgress(normalizedUserId, { xp: current.xp + xpToAdd, badges: current.badges });
};
