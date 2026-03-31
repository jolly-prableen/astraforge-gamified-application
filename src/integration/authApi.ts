export type BackendUserData = {
  totalXP?: number;
  taskSets?: unknown[];
  personality?: string | null;
};

export type ProgressPayload = {
  xp?: number;
  level?: number;
  badges?: string[];
};

export type ProgressData = {
  userId: string;
  xp: number;
  level: number;
  badges: string[];
  updatedAt: string;
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const parseJsonOrThrow = async <T,>(response: Response): Promise<T> => {
  const payload = (await response.json()) as T;
  if (!response.ok) {
    const errorPayload = payload as ApiResponse;
    throw new Error(errorPayload.message || "Request failed.");
  }
  return payload;
};

export const signupRequest = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  return parseJsonOrThrow<ApiResponse<{ username: string; data?: BackendUserData }>>(response);
};

export const loginRequest = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  return parseJsonOrThrow<ApiResponse<{ username: string; data: BackendUserData }>>(response);
};

export const fetchUserDataRequest = async (username: string) => {
  const response = await fetch(`${API_BASE_URL}/data/${encodeURIComponent(username)}`);
  return parseJsonOrThrow<ApiResponse<{ username: string; data: BackendUserData }>>(response);
};

export const saveUserDataRequest = async (username: string, data: BackendUserData) => {
  const response = await fetch(`${API_BASE_URL}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, data })
  });

  return parseJsonOrThrow<ApiResponse<{ username: string; data: BackendUserData }>>(response);
};

export const fetchProgress = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/progress/${encodeURIComponent(userId)}`);
  return parseJsonOrThrow<ApiResponse<ProgressData>>(response);
};

export const saveProgress = async (userId: string, data: ProgressPayload) => {
  const response = await fetch(`${API_BASE_URL}/api/progress/${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return parseJsonOrThrow<ApiResponse<ProgressData>>(response);
};

export const addXp = async (userId: string, xpToAdd: number) => {
  const response = await fetch(`${API_BASE_URL}/api/progress/${encodeURIComponent(userId)}/add-xp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ xpToAdd })
  });

  return parseJsonOrThrow<ApiResponse<ProgressData>>(response);
};
