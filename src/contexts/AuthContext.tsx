import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  display_name: string | null;
  wallet_address: string;
  total_wins?: number;
  total_predictions?: number;
  total_claimed_usd?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  register: (username: string, walletAddress: string) => Promise<boolean>;
  login: (username: string, walletAddress: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "muskmarket_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const saveUser = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  };

  const register = useCallback(
    async (username: string, walletAddress: string) => {
      setError(null);
      try {
        const { data, error: insertError } = await supabase
          .from("profiles")
          .insert({
            display_name: username,
            wallet_address: walletAddress,
          })
          .select("id, display_name, wallet_address, total_wins, total_predictions, total_claimed_usd")
          .single();

        if (insertError) {
          if (
            insertError.message?.includes("profiles_username_unique") ||
            insertError.message?.includes("display_name")
          ) {
            setError("Username is already taken.");
          } else if (
            insertError.message?.includes("profiles_wallet_unique") ||
            insertError.message?.includes("wallet_address")
          ) {
            setError("Wallet is already registered.");
          } else {
            setError(insertError.message);
          }
          return false;
        }

        if (data) {
          saveUser(data as UserProfile);
          return true;
        }

        setError("Registration failed.");
        return false;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Registration failed.");
        return false;
      }
    },
    []
  );

  const login = useCallback(
    async (username: string, walletAddress: string) => {
      setError(null);
      try {
        const { data, error: selectError } = await supabase
          .from("profiles")
          .select("id, display_name, wallet_address, total_wins, total_predictions, total_claimed_usd")
          .eq("display_name", username)
          .single();

        if (selectError || !data) {
          setError("User not found.");
          return false;
        }

        if (data.wallet_address !== walletAddress) {
          setError("Wallet address does not match this username.");
          return false;
        }

        saveUser(data as UserProfile);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Login failed.");
        return false;
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

