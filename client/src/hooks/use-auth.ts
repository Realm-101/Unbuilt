import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiRequest } from "@/lib/queryClient";
import type { User, LoginData, RegisterData } from "@shared/schema";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  getProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  canSearch: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,

      login: async (data: LoginData) => {
        set({ loading: true });
        try {
          const response = await apiRequest("POST", "/api/auth/login", data);
          const result = await response.json();
          
          if (result.success && result.user) {
            set({ user: result.user, loading: false });
          } else {
            throw new Error("Login failed");
          }
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ loading: true });
        try {
          const response = await apiRequest("POST", "/api/auth/register", data);
          const result = await response.json();
          
          if (result.success && result.user) {
            set({ user: result.user, loading: false });
          } else {
            throw new Error("Registration failed");
          }
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ loading: true });
        try {
          await apiRequest("POST", "/api/auth/logout", {});
          set({ user: null, loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      getProfile: async () => {
        set({ loading: true });
        try {
          const response = await apiRequest("GET", "/api/auth/profile", {});
          const result = await response.json();
          
          if (result.user) {
            set({ user: result.user, loading: false });
          } else {
            set({ user: null, loading: false });
          }
        } catch (error) {
          set({ user: null, loading: false });
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ loading: true });
        try {
          const response = await apiRequest("PATCH", "/api/auth/profile", data);
          const result = await response.json();
          
          if (result.user) {
            set({ user: result.user, loading: false });
          } else {
            throw new Error("Profile update failed");
          }
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      canSearch: () => {
        const { user } = get();
        if (!user) return false;
        
        if (user.plan === 'pro' || user.plan === 'enterprise') {
          return true;
        }
        
        // Check if it's a new month for free users
        const lastReset = new Date(user.lastResetDate);
        const now = new Date();
        const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
        
        if (isNewMonth) {
          return true;
        }
        
        return user.searchCount < 5;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Initialize auth state on app load
export function initializeAuth() {
  const { getProfile } = useAuth.getState();
  getProfile();
}