import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { forgotPassword, resetPassword } from "../api_requests/users";
import { validatePassword } from "../utils/passwordValidation";

type AuthMode = "login" | "register" | "forgot" | "reset";

const AuthPage: React.FC = () => {
  const [f_name, setFname] = useState("");
  const [l_name, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  if (!auth) return null;

  const isRegistering = mode === "register";

  const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.data) {
      const data = error.response.data;
      if (typeof data === "string") return data;
      if (typeof data.message === "string") return data.message;
    }

    return "An error occurred. Please try again.";
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleAuth = async () => {
    // Clear previous messages
    setErrorMessage("");
    setSuccessMessage("");

    // Validate first and last name for registration
    if (isRegistering && (!f_name.trim() || !l_name.trim())) {
      setErrorMessage("Please enter both your first and last name.");
      return;
    }

    if (isRegistering) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setErrorMessage(passwordError);
        return;
      }
    }

    try {
      if (isRegistering) {
        await auth.register(email, password, f_name, l_name);
      } else {
        await auth.login(email, password);
      }
      navigate("/home"); // Redirect after successful login/register
    } catch (error: unknown) {
      console.error("Authentication error:", error);
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await forgotPassword(email);
      setSuccessMessage(response.data.message);
    } catch (error: unknown) {
      console.error("Forgot password error:", error);
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    try {
      const response = await resetPassword(resetToken, password);
      setSuccessMessage(response.data.message);
      setPassword("");
      setResetToken("");
    } catch (error: unknown) {
      console.error("Reset password error:", error);
      setErrorMessage(getErrorMessage(error));
    }
  };

  const titleByMode = {
    login: "Login",
    register: "Register",
    forgot: "Forgot Password",
    reset: "Reset Password",
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{titleByMode[mode]}</h2>
        <div style={styles.formGroup}>
          {isRegistering && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={f_name}
                onChange={(e) => setFname(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={l_name}
                onChange={(e) => setLname(e.target.value)}
                style={styles.input}
              />
            </>
          )}
          {mode !== "reset" && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          )}
          {mode === "reset" && (
            <input
              type="text"
              placeholder="Reset Token"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              style={styles.input}
            />
          )}
          {mode !== "forgot" && (
            <input
              type="password"
              placeholder={mode === "reset" ? "New Password" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          )}
          {mode === "forgot" && (
            <p style={styles.helperText}>
              Enter your email to request a reset token. During the MVP, tokens
              are only logged by the backend in development.
            </p>
          )}
          {mode === "login" || mode === "register" ? (
            <button onClick={handleAuth} style={styles.primaryButton}>
              {isRegistering ? "Register" : "Login"}
            </button>
          ) : mode === "forgot" ? (
            <button onClick={handleForgotPassword} style={styles.primaryButton}>
              Request Reset Token
            </button>
          ) : (
            <button onClick={handleResetPassword} style={styles.primaryButton}>
              Reset Password
            </button>
          )}
          <button
            onClick={() => switchMode(isRegistering ? "login" : "register")}
            style={styles.toggleButton}
          >
            {isRegistering
              ? "Already have an account? Login"
              : "New user? Register"}
          </button>
          <button
            onClick={() => switchMode(mode === "forgot" ? "login" : "forgot")}
            style={styles.toggleButton}
          >
            {mode === "forgot" ? "Back to login" : "Forgot password?"}
          </button>
          <button
            onClick={() => switchMode(mode === "reset" ? "login" : "reset")}
            style={styles.toggleButton}
          >
            {mode === "reset" ? "Back to login" : "Have a reset token?"}
          </button>
          {errorMessage && <div style={styles.error}>{errorMessage}</div>}
          {successMessage && <div style={styles.success}>{successMessage}</div>}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    maxWidth: "400px",
    width: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: "24px",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  input: {
    padding: "12px 16px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "16px",
    outline: "none",
  },
  primaryButton: {
    padding: "12px 16px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor: "pointer",
  },
  toggleButton: {
    padding: "12px 16px",
    backgroundColor: "transparent",
    color: "#007bff",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    textDecoration: "underline",
  },
  helperText: {
    color: "#555",
    fontSize: "14px",
    lineHeight: 1.4,
    margin: 0,
    textAlign: "center",
  },
  error: {
    color: "red",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "10px",
  },
  success: {
    color: "green",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "10px",
  },
};

export default AuthPage;
