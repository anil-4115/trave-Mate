const API_BASE_URL = "http://localhost:5000/api";

const TOKEN_KEY = "travelmate_token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: AuthUser;
  };
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  const result: AuthResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to register");
  }

  return result.data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const result: AuthResponse = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to login");
  }

  return result.data;
}

export { getAuthHeaders, API_BASE_URL };
