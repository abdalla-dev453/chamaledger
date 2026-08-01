// src/store/useAuthStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, ApiError, onUnauthorized } from "../services/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null, // { id, group_id, full_name, phone_number, role }
      status: "idle", // idle | loading | error
      error: null,

      isAuthenticated: () => Boolean(get().token && get().user),
      isTreasurer: () => get().user?.role === "treasurer",

      async login({ phone_number, password }) {
        set({ status: "loading", error: null });
        try {
          const data = await api.auth.login({ phone_number, password });
          set({ token: data.access_token, user: data.user, status: "idle" });
          return data.user;
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
          set({ status: "error", error: message });
          throw err;
        }
      },

      async register(payload) {
        set({ status: "loading", error: null });
        try {
          const data = await api.auth.register(payload);
          set({ token: data.access_token, user: data.user, status: "idle" });
          return data.user;
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
          set({ status: "error", error: message });
          throw err;
        }
      },

      logout() {
        // Best-effort server-side logout; local state is cleared regardless.
        api.auth.logout().catch(() => {});
        set({ token: null, user: null, status: "idle", error: null });
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: "chamaledger-auth", // must match AUTH_STORAGE_KEY in services/api.js
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// Any 401 from the API (expired/invalid token) triggers a clean local logout.
onUnauthorized(() => {
  useAuthStore.setState({ token: null, user: null });
});