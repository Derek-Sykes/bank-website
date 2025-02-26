import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useItemsApi } from "../api_requests/items";

interface Account {
  item_id: number;
  category_id: string | null;
  name: string;
  balance: number;
  goal?: number;
  // additional properties as needed
}

const AccountsPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const { getItems } = useItemsApi();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all user accounts using getItems (with no parameters)
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const response = await getItems();
        if (response && response.data) {
          setAccounts(response.data);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [auth?.accessToken]);

  // Main account is assumed to have category_id === null
  const mainAccount = accounts.find((acc) => acc.category_id === null);
  // Mini accounts are those with a non-null category
  const miniAccounts = accounts.filter((acc) => acc.category_id !== null);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>All Accounts</h1>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          Back
        </button>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {loading ? (
          <p style={styles.infoText}>Loading accounts...</p>
        ) : (
          <>
            {mainAccount && (
              <div style={styles.accountCard}>
                <h2 style={styles.accountTitle}>
                  {mainAccount.name || "Main Account"}
                </h2>
                <p style={styles.accountBalance}>
                  ${parseFloat(mainAccount.balance.toString()).toFixed(2)}
                </p>
              </div>
            )}

            {miniAccounts.length > 0 && (
              <>
                <h2 style={styles.sectionTitle}>Mini Accounts</h2>
                {miniAccounts.map((account) => (
                  <div key={account.item_id} style={styles.accountCard}>
                    <h3 style={styles.accountTitle}>{account.name}</h3>
                    <p style={styles.accountBalance}>
                      ${parseFloat(account.balance.toString()).toFixed(2)}
                      {account.goal && (
                        <span>
                          {" "}
                          / ${parseFloat(account.goal.toString()).toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <Link to="/home" style={styles.footerLink}>
          Return Home
        </Link>
      </footer>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "900px",
    margin: "40px auto",
    padding: "30px",
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    fontFamily: "'Roboto', sans-serif",
    color: "#333",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    borderBottom: "2px solid #e0e0e0",
    paddingBottom: "10px",
  },
  title: {
    fontSize: "32px",
    fontWeight: 700,
    color: "#222",
    margin: 0,
  },
  backButton: {
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s ease",
  },
  mainContent: {
    textAlign: "center",
    marginBottom: "40px",
  },
  infoText: {
    fontSize: "18px",
    color: "#555",
  },
  accountCard: {
    backgroundColor: "#f8f9fa",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    marginBottom: "20px",
    textAlign: "center",
  },
  accountTitle: {
    fontSize: "24px",
    fontWeight: 600,
    marginBottom: "10px",
  },
  accountBalance: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#28a745",
  },
  sectionTitle: {
    fontSize: "28px",
    fontWeight: 600,
    marginBottom: "20px",
    textAlign: "center",
  },
  footer: {
    borderTop: "1px solid #ddd",
    paddingTop: "10px",
    textAlign: "center",
  },
  footerLink: {
    fontSize: "16px",
    color: "#1976d2",
    textDecoration: "none",
  },
};

export default AccountsPage;
