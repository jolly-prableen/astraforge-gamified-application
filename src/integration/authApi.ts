export type BackendUserData = {
  totalXP?: number;
  taskSets?: unknown[];
  personality?: string | null;
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

const API_BASE_URL = "http://localhost:3001";

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
