// src/services/api.js
// Thin fetch wrapper over the ChamaLedger Flask API (see backend/app/api/v1/*).
// Every namespaced method here maps 1:1 to a real backend route.

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"; // must match backend's API_PREFIX

// Must match the `name` used in the zustand persist config in store/useAuthStore.js.
const AUTH_STORAGE_KEY = "chamaledger-auth";

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

/** Reads the persisted JWT without importing the store (avoids a circular import). */
function getToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

// Registered by useAuthStore so a 401 anywhere can trigger a clean logout + redirect.
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

async function request(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0, null);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(payload?.message || response.statusText, response.status, payload);
  }

  return payload;
}

export const api = {
  auth: {
    register: (data) => request("/api/v1/auth/register", { method: "POST", body: data }),
    login: (data) => request("/api/v1/auth/login", { method: "POST", body: data }),
    logout: () => request("/api/v1/auth/logout", { method: "POST" }),
    me: () => request("/api/v1/auth/me"),
  },

  groups: {
    get: (groupId) => request(`/api/v1/groups/${groupId}`),
    update: (groupId, data) => request(`/api/v1/groups/${groupId}`, { method: "PATCH", body: data }),
    listMembers: (groupId) => request(`/api/v1/groups/${groupId}/members`),
    updateMember: (groupId, memberId, data) =>
      request(`/api/v1/groups/${groupId}/members/${memberId}`, { method: "PATCH", body: data }),
  },

  cycles: {
    list: (groupId) => request(`/api/v1/cycles/${groupId}`),
    create: (groupId, data) => request(`/api/v1/cycles/${groupId}`, { method: "POST", body: data }),
    close: (groupId, cycleId) => request(`/api/v1/cycles/${groupId}/${cycleId}/close`, { method: "PATCH" }),
    summary: (groupId, cycleId) => request(`/api/v1/cycles/${groupId}/${cycleId}/summary`),
  },

  contributions: {
    list: (groupId, cycleId) => request(`/api/v1/contributions/${groupId}/cycles/${cycleId}`),
    record: (groupId, cycleId, data) =>
      request(`/api/v1/contributions/${groupId}/cycles/${cycleId}`, { method: "POST", body: data }),
    updateStatus: (groupId, contributionId, status) =>
      request(`/api/v1/contributions/${groupId}/${contributionId}`, { method: "PATCH", body: { status } }),
  },

  loans: {
    list: (groupId) => request(`/api/v1/loans/${groupId}`),
    issue: (groupId, data) => request(`/api/v1/loans/${groupId}`, { method: "POST", body: data }),
    get: (groupId, loanId) => request(`/api/v1/loans/${groupId}/${loanId}`),
    repay: (groupId, loanId, data) =>
      request(`/api/v1/loans/${groupId}/${loanId}/repayments`, { method: "POST", body: data }),
  },

  reconcile: {
    upload: (groupId, cycleId, file) => {
      const formData = new FormData();
      formData.append("file", file);
      return request(`/api/v1/reconcile/${groupId}/${cycleId}/upload`, {
        method: "POST",
        body: formData,
        isFormData: true,
      });
    },
    unmatched: (groupId) => request(`/api/v1/reconcile/${groupId}/unmatched`),
  },
};