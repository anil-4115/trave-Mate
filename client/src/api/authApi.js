const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const TOKEN_KEY = "travelmate_token";
const USER_KEY = "travelmate_user";
export function getAuthToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    }
    catch {
        return null;
    }
}
export function setAuthToken(token) {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    }
    catch {
        // ignore
    }
}
export function clearAuthToken() {
    try {
        localStorage.removeItem(TOKEN_KEY);
        clearStoredUser();
    }
    catch {
        // ignore
    }
}
export function getStoredUser() {
    try {
        const token = getAuthToken();
        if (!token) {
            return null;
        }
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) {
            return null;
        }
        const user = JSON.parse(raw);
        if (!user || typeof user._id !== "string" || !user.email) {
            return null;
        }
        return user;
    }
    catch {
        return null;
    }
}
export function setStoredUser(user) {
    try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    catch {
        // ignore
    }
}
export function clearStoredUser() {
    try {
        localStorage.removeItem(USER_KEY);
    }
    catch {
        // ignore
    }
}
function getAuthHeaders() {
    const token = getAuthToken();
    if (!token) {
        return {};
    }
    return {
        Authorization: `Bearer ${token}`,
    };
}
export async function registerUser(name, email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to register");
    }
    return result.data;
}
export async function loginUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Failed to login");
    }
    return result.data;
}
export { getAuthHeaders, API_BASE_URL };
