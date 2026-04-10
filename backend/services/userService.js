import { db } from "../db/sqlite.js";

const SELECT_USER_SQL = `
  SELECT username, hashed_password, data, created_at, updated_at
  FROM user_credentials
  WHERE username = ?
`;

const INSERT_USER_SQL = `
  INSERT INTO user_credentials (username, hashed_password, data, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`;

const UPDATE_USER_DATA_SQL = `
  UPDATE user_credentials
  SET data = ?, updated_at = ?
  WHERE username = ?
`;

const selectUserStatement = db.prepare(SELECT_USER_SQL);
const insertUserStatement = db.prepare(INSERT_USER_SQL);
const updateUserDataStatement = db.prepare(UPDATE_USER_DATA_SQL);

const normalizeUsername = (username) => {
  if (typeof username !== "string") {
    throw new Error("username must be a string.");
  }

  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error("username cannot be empty.");
  }

  return trimmed;
};

const parseUserData = (value) => {
  if (typeof value !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const mapUserRow = (row) => ({
  username: row.username,
  hashedPassword: row.hashed_password,
  data: parseUserData(row.data),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const getUserByUsername = (username) => {
  const normalizedUsername = normalizeUsername(username);
  const row = selectUserStatement.get(normalizedUsername);

  return row ? mapUserRow(row) : null;
};

export const createUser = ({ username, hashedPassword, data = {} }) => {
  const normalizedUsername = normalizeUsername(username);
  const now = new Date().toISOString();

  insertUserStatement.run(
    normalizedUsername,
    hashedPassword,
    JSON.stringify(data),
    now,
    now
  );

  return getUserByUsername(normalizedUsername);
};

export const updateUserData = (username, data = {}) => {
  const normalizedUsername = normalizeUsername(username);
  const existing = getUserByUsername(normalizedUsername);

  if (!existing) {
    return null;
  }

  const mergedData = {
    ...existing.data,
    ...data
  };

  updateUserDataStatement.run(JSON.stringify(mergedData), new Date().toISOString(), normalizedUsername);

  return getUserByUsername(normalizedUsername);
};
