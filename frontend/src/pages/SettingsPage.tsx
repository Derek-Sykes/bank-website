import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";
import { useAccountApi } from "../api_requests/users";

const passwordMeetsRequirements = (password: string) =>
  password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);

const SettingsPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const { updateAccount, changePassword, softDeleteAccount } = useAccountApi(
    auth?.accessToken,
  );

  const [firstName, setFirstName] = useState(auth?.user?.f_name || "");
  const [lastName, setLastName] = useState(auth?.user?.l_name || "");
  const [profileMessage, setProfileMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  if (!auth?.user) return <p>Loading...</p>;

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMessage("");

    if (!firstName.trim() || !lastName.trim()) {
      setProfileMessage("First and last name are required.");
      return;
    }

    try {
      const response = await updateAccount({
        f_name: firstName.trim(),
        l_name: lastName.trim(),
      });
      auth.updateUserMem(response.data);
      setProfileMessage("Display name updated successfully.");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : "Unable to update display name.";
      setProfileMessage(message || "Unable to update display name.");
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");

    if (!passwordMeetsRequirements(newPassword)) {
      setPasswordMessage(
        "New password must be at least 8 characters and include a letter and a number.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed successfully.");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : "Unable to change password.";
      setPasswordMessage(message || "Unable to change password.");
    }
  };

  const handleSoftDelete = async () => {
    setDeleteMessage("");
    if (deleteConfirmation !== "DELETE") {
      setDeleteMessage("Type DELETE to confirm account deletion.");
      return;
    }

    try {
      await softDeleteAccount();
      auth.updateUserMem(null);
      auth.updateAccessTokenMem("");
      navigate("/auth");
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : "Unable to delete account.";
      setDeleteMessage(message || "Unable to delete account.");
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Account Settings</h1>
          <p style={styles.subtitle}>{auth.user.email}</p>
        </div>
        <button
          style={styles.secondaryButton}
          onClick={() => navigate("/home")}
        >
          Back to Home
        </button>
      </header>

      <main style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Display name</h2>
          <form onSubmit={handleProfileSubmit} style={styles.form}>
            <label style={styles.label}>
              First name
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Last name
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                style={styles.input}
              />
            </label>
            <button type="submit" style={styles.primaryButton}>
              Save display name
            </button>
            {profileMessage && <p style={styles.message}>{profileMessage}</p>}
          </form>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Change password</h2>
          <form onSubmit={handlePasswordSubmit} style={styles.form}>
            <label style={styles.label}>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                style={styles.input}
              />
            </label>
            <p style={styles.hint}>
              Password must be at least 8 characters and include a letter and a
              number.
            </p>
            <button type="submit" style={styles.primaryButton}>
              Change password
            </button>
            {passwordMessage && <p style={styles.message}>{passwordMessage}</p>}
          </form>
        </section>

        <section style={{ ...styles.card, ...styles.dangerCard }}>
          <h2 style={styles.sectionTitle}>Delete account</h2>
          <p style={styles.warning}>
            This is a soft delete. You will be signed out and prevented from
            logging in again, but your user data, categories, accounts, and
            history will be retained.
          </p>
          <label style={styles.label}>
            Type DELETE to confirm
            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              style={styles.input}
            />
          </label>
          <button
            type="button"
            style={styles.dangerButton}
            onClick={handleSoftDelete}
          >
            Soft delete my account
          </button>
          {deleteMessage && <p style={styles.message}>{deleteMessage}</p>}
        </section>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "32px 20px",
    fontFamily: "Arial, sans-serif",
    color: "#222",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "28px",
  },
  title: { margin: 0, fontSize: "32px" },
  subtitle: { margin: "8px 0 0", color: "#666" },
  grid: { display: "grid", gap: "20px" },
  card: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.08)",
    padding: "24px",
  },
  dangerCard: { borderColor: "#fecaca", backgroundColor: "#fff7f7" },
  sectionTitle: { margin: "0 0 16px", fontSize: "22px" },
  form: { display: "grid", gap: "14px" },
  label: { display: "grid", gap: "6px", fontWeight: 600 },
  input: {
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "16px",
  },
  hint: { margin: 0, color: "#666", fontSize: "14px" },
  warning: { color: "#991b1b", lineHeight: 1.5 },
  message: { margin: 0, color: "#1976d2", fontWeight: 600 },
  primaryButton: {
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    cursor: "pointer",
    fontSize: "16px",
  },
  secondaryButton: {
    backgroundColor: "#f3f4f6",
    color: "#111827",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    cursor: "pointer",
    fontSize: "16px",
  },
};

export default SettingsPage;
