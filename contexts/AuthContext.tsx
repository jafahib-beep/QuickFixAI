import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { storage, User } from "@/utils/storage";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const savedUser = await storage.getUser();
      setUser(savedUser);
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, _password: string): Promise<boolean> => {
    try {
      const savedUser = await storage.getUser();
      if (savedUser && savedUser.email === email) {
        setUser(savedUser);
        return true;
      }
      
      const newUser: User = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        email,
        displayName: email.split("@")[0],
        expertise: [],
        followers: 0,
        following: 0,
        createdAt: new Date().toISOString(),
      };
      await storage.setUser(newUser);
      setUser(newUser);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const register = async (email: string, _password: string, displayName: string): Promise<boolean> => {
    try {
      const newUser: User = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        email,
        displayName,
        expertise: [],
        followers: 0,
        following: 0,
        createdAt: new Date().toISOString(),
      };
      await storage.setUser(newUser);
      setUser(newUser);
      return true;
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await storage.clearUser();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      const updatedUser = await storage.updateUser(updates);
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
