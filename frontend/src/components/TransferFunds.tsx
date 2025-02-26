import React, { useState, useEffect } from "react";
import { useItemsApi } from "../api_requests/items";

interface Account {
  item_id: number;
  name: string;
  balance: number;
  // add other properties as needed
}

interface TransferFundsProps {
  onClose: () => void;
  onTransferSuccess?: () => void;
}

const TransferFunds: React.FC<TransferFundsProps> = ({
  onClose,
  onTransferSuccess,
}) => {
  const { transfer, getItems } = useItemsApi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fromAccount, setFromAccount] = useState<string>("");
  const [toAccount, setToAccount] = useState<string>("");
  // Change amount state from number to string so user can clear it
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      try {
        const response = await getItems();
        // Assume response.data is an array of accounts
        setAccounts(response.data);
      } catch (err) {
        console.error(err);
        setError("Error loading accounts.");
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fromAccount || !toAccount) {
      setError("Please select both accounts.");
      return;
    }
    if (fromAccount === toAccount) {
      setError("Please select different accounts for transfer.");
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid transfer amount.");
      return;
    }
    // Check if selected from-account has sufficient funds.
    const selectedFrom = accounts.find(
      (acc) => acc.item_id === Number(fromAccount)
    );
    if (selectedFrom && selectedFrom.balance < numericAmount) {
      setError("Insufficient funds in the selected 'from' account.");
      return;
    }

    try {
      await transfer(Number(fromAccount), Number(toAccount), numericAmount);
      if (onTransferSuccess) onTransferSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Transfer failed. Please try again.");
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h2 style={modalTitleStyle}>Transfer Funds</h2>
        {loading ? (
          <p style={infoTextStyle}>Loading accounts...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>From Account:</label>
              <select
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.item_id} value={account.item_id}>
                    {account.name} (Balance: ${account.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>To Account:</label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.item_id} value={account.item_id}>
                    {account.name} (Balance: ${account.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
                step="0.01"
              />
            </div>
            {error && <p style={errorTextStyle}>{error}</p>}
            <div style={buttonContainerStyle}>
              <button type="button" onClick={onClose} style={buttonStyle}>
                Cancel
              </button>
              <button type="submit" style={buttonStyle}>
                Transfer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  padding: "30px",
  borderRadius: "8px",
  width: "90%",
  maxWidth: "500px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
};

const modalTitleStyle: React.CSSProperties = {
  margin: "0 0 20px 0",
  fontSize: "26px",
  fontWeight: 600,
  color: "#333",
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: "15px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontSize: "16px",
  color: "#555",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "16px",
  borderRadius: "4px",
  border: "1px solid #ccc",
};

const buttonContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "4px",
  backgroundColor: "#1976d2",
  color: "#fff",
  cursor: "pointer",
  fontSize: "16px",
};

const errorTextStyle: React.CSSProperties = {
  color: "red",
  fontSize: "14px",
  marginTop: "5px",
};

const infoTextStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#555",
};

export default TransferFunds;
