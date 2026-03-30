import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";

const app = express();
const PORT = 3001;
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

    return sendSuccess(res, "User data fetched successfully.", {
      username: user.username,
      data: user.data
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return sendError(res, "Internal server error while fetching data.", 500);
  }
});

// GET /health
app.get("/health", (_req, res) => {
  return sendSuccess(res, "ASTRAFORGE backend is running.");
});

app.listen(PORT, () => {
  console.log(`ASTRAFORGE backend listening on http://localhost:${PORT}`);
});
