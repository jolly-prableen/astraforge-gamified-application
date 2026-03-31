import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { addXp, calculateLevel, getOrCreateProgress, upsertProgress } from "./services/progressService.js";

const app = express();
const PORT = Number.parseInt(process.env.PORT || "5000", 10);
const SALT_ROUNDS = 10;

// In-memory user store (resets whenever the server restarts).
const users = [];

app.use(cors());
app.use(express.json());

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

const sendDataSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

const isValidProgressPayload = (payload) => {
  if (payload.xp !== undefined && (!Number.isInteger(payload.xp) || payload.xp < 0)) {
    return "xp must be a non-negative integer.";
  }

  if (payload.level !== undefined && (!Number.isInteger(payload.level) || payload.level < 1)) {
    return "level must be an integer greater than or equal to 1.";
  }

  if (payload.badges !== undefined) {
    if (!Array.isArray(payload.badges) || payload.badges.some((item) => typeof item !== "string")) {
      return "badges must be an array of strings.";
    }
  }

  if (
    payload.xp !== undefined &&
    payload.level !== undefined &&
    payload.level !== calculateLevel(payload.xp)
  ) {
    return "level must match formula: floor(xp / 100) + 1.";
  }

  return null;
};

const validateCredentials = (username, password) => {
  if (!username || !password) {
    return "Username and password are required.";
  }
  if (typeof username !== "string" || typeof password !== "string") {
    return "Username and password must be strings.";
  }
  if (username.trim().length < 3) {
    return "Username must be at least 3 characters long.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  return null;
};

// POST /signup
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const validationError = validateCredentials(username, password);

    if (validationError) {
      return sendError(res, validationError, 400);
    }

    const normalizedUsername = username.trim();
    const existingUser = users.find((user) => user.username === normalizedUsername);

    if (existingUser) {
      return sendError(res, "User already exists.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      username: normalizedUsername,
      hashedPassword,
      data: {
        totalXP: 0,
        taskSets: [],
        personality: null
      }
    };

    users.push(newUser);
    getOrCreateProgress(newUser.username);

    return sendSuccess(
      res,
      "Signup successful.",
      { username: newUser.username, data: newUser.data },
      201
    );
  } catch (error) {
    console.error("Signup error:", error);
    return sendError(res, "Internal server error during signup.", 500);
  }
});

// POST /login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const validationError = validateCredentials(username, password);

    if (validationError) {
      return sendError(res, validationError, 400);
    }

    const normalizedUsername = username.trim();
    const user = users.find((item) => item.username === normalizedUsername);

    if (!user) {
      return sendError(res, "Invalid username or password.", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordMatches) {
      return sendError(res, "Invalid username or password.", 401);
    }

    return sendSuccess(res, "Login successful.", {
      username: user.username,
      data: user.data
    });
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, "Internal server error during login.", 500);
  }
});

// POST /save
app.post("/save", (req, res) => {
  try {
    const { username, data } = req.body;

    if (!username || typeof username !== "string") {
      return sendError(res, "A valid username is required.", 400);
    }

    if (!data || typeof data !== "object") {
      return sendError(res, "A valid data object is required.", 400);
    }

    const normalizedUsername = username.trim();
    const user = users.find((item) => item.username === normalizedUsername);

    if (!user) {
      return sendError(res, "User not found.", 404);
    }

    user.data = {
      ...user.data,
      ...data
    };

    if (Number.isInteger(data.totalXP) && data.totalXP >= 0) {
      upsertProgress(user.username, { xp: data.totalXP });
    }

    return sendSuccess(res, "User data saved successfully.", {
      username: user.username,
      data: user.data
    });
  } catch (error) {
    console.error("Save error:", error);
    return sendError(res, "Internal server error during save.", 500);
  }
});

// GET /data/:username
app.get("/data/:username", (req, res) => {
  try {
    const { username } = req.params;

    if (!username || typeof username !== "string") {
      return sendError(res, "A valid username parameter is required.", 400);
    }

    const normalizedUsername = username.trim();
    const user = users.find((item) => item.username === normalizedUsername);

    if (!user) {
      return sendError(res, "User not found.", 404);
    }

    const progress = getOrCreateProgress(user.username);
    const mergedData = {
      ...user.data,
      totalXP: progress.xp
    };

    return sendSuccess(res, "User data fetched successfully.", {
      username: user.username,
      data: mergedData
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return sendError(res, "Internal server error while fetching data.", 500);
  }
});

// GET /api/progress/:userId
app.get("/api/progress/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      return sendError(res, "A valid userId parameter is required.", 400);
    }

    const progress = getOrCreateProgress(userId);
    return sendDataSuccess(res, progress, 200);
  } catch (error) {
    console.error("Get progress error:", error);
    return sendError(res, "Internal server error while fetching progress.", 500);
  }
});

// POST /api/progress/:userId
app.post("/api/progress/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const payload = req.body || {};

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      return sendError(res, "A valid userId parameter is required.", 400);
    }

    const validationError = isValidProgressPayload(payload);
    if (validationError) {
      return sendError(res, validationError, 400);
    }

    const progress = upsertProgress(userId, {
      xp: payload.xp,
      level: payload.level,
      badges: payload.badges
    });

    return sendDataSuccess(res, progress, 200);
  } catch (error) {
    console.error("Upsert progress error:", error);
    return sendError(res, "Internal server error while saving progress.", 500);
  }
});

// POST /api/progress/:userId/add-xp
app.post("/api/progress/:userId/add-xp", (req, res) => {
  try {
    const { userId } = req.params;
    const { xpToAdd } = req.body || {};

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      return sendError(res, "A valid userId parameter is required.", 400);
    }

    if (!Number.isInteger(xpToAdd) || xpToAdd <= 0) {
      return sendError(res, "xpToAdd must be a positive integer.", 400);
    }

    const progress = addXp(userId, xpToAdd);
    return sendDataSuccess(res, progress, 200);
  } catch (error) {
    console.error("Add XP error:", error);
    return sendError(res, "Internal server error while adding XP.", 500);
  }
});

// GET /health
app.get("/health", (_req, res) => {
  return sendSuccess(res, "ASTRAFORGE backend is running.");
});

app.listen(PORT, () => {
  console.log(`ASTRAFORGE backend listening on http://localhost:${PORT}`);
});
