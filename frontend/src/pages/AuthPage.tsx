import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AuthPage: React.FC = () => {
  const [f_name, setFname] = useState("");
  const [l_name, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  if (!auth) return null;

  const handleAuth = async () => {
    // Clear previous error message
    setErrorMessage("");

    // Validate first and last name for registration
    if (isRegistering && (!f_name.trim() || !l_name.trim())) {
      setErrorMessage("Please enter both your first and last name.");
      return;
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
      // If the error comes from Axios and has a response with data, use that message.
      if (axios.isAxiosError(error) && error.response && error.response.data) {
        setErrorMessage(error.response.data);
      } else {
        setErrorMessage("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{isRegistering ? "Register" : "Login"}</h2>
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
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <button onClick={handleAuth} style={styles.primaryButton}>
            {isRegistering ? "Register" : "Login"}
          </button>
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            style={styles.toggleButton}
          >
            {isRegistering
              ? "Already have an account? Login"
              : "New user? Register"}
          </button>
          {errorMessage && <div style={styles.error}>{errorMessage}</div>}
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
  error: {
    color: "red",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "10px",
  },
};

export default AuthPage;
