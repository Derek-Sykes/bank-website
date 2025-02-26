import React, { createContext, useState, useEffect } from "react";
import {
  getUserSession,
  loginUser,
  logoutUser,
  registerUser,
} from "../src/api_requests/users";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

// Define user type based on backend response
interface User {
  user_id: number;
  email: string;
  f_name: string;
  l_name: string;
}

// Define AuthContext type
interface AuthContextType {
  user: User | null;
  accessToken: string | null; // ✅ Store accessToken in memory
  loading: boolean; // ✅ New loading state
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    f_name: string,
    l_name: string
  ) => Promise<void>;
  updateAccessTokenMem: (At: string) => void;
}

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null); // ✅ Store accessToken in memory
  const [loading, setLoading] = useState<boolean>(true); // ✅ New loading state
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🔥 useEffect is running on page refresh..."); // ✅ Debugging log

    const checkUserSession = async () => {
      try {
        console.log("📡 Calling getUserSession()..."); // ✅ Debug log
        const response = await getUserSession();
        console.log("✅ Session Restored:", response.data); // ✅ Check response

        if (response.data) {
          setUser(response.data); // ✅ Restore user session
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("❌ Session check failed:", error.message);
        } else {
          console.error(
            "❌ Session check failed with an unknown error:",
            error
          );
        }
        setUser(null);
      } finally {
        setLoading(false); // ✅ Mark loading as finished
      }
    };

    checkUserSession();
  }, []); // ✅ Runs only once on mount

  useEffect(() => {
    console.log("📍 Current Route:", location.pathname);
    console.log("🔑 User Auth Status:", user);
  }, [user, navigate, loading]);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginUser(email, password);
      console.log("Login Response:", response.data); // ✅ Debugging step

      if (
        !response.data ||
        !response.data.userDetails ||
        !response.data.accessToken
      ) {
        console.error(
          "No user details or access token in response:",
          response.data
        );
        return;
      }

      setUser(response.data.userDetails);
      setAccessToken(response.data.accessToken); // ✅ Store accessToken in memory
      console.log("User set in context:", response.data.userDetails);
      console.log(
        "✅ Access Token Stored in Memory:",
        response.data.accessToken
      );
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.error("Login failed:", error.response?.data || error.message);
      } else if (error instanceof Error) {
        console.error("Login failed:", error.message);
      } else {
        console.error("Login failed with an unexpected error:", error);
      }
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setAccessToken(null); // ✅ Clear access token from memory
  };

  const register = async (
    email: string,
    password: string,
    f_name: string,
    l_name: string
  ) => {
    await registerUser(email, password, f_name, l_name);
    await login(email, password);
  };
  const updateAccessTokenMem = (At: string) => {
    setAccessToken(At);
    console.log("should have updated at: ", At);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
        register,
        updateAccessTokenMem,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
