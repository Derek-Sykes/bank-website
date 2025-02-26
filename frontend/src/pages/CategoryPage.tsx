import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useItemsApi } from "../api_requests/items";
import { AuthContext } from "../../context/AuthContext";
import { capitalize } from "../utils/generalUtils";

interface Category {
  category_id: number;
  name: string;
  description: string;
  user_id: number;
  // any other properties...
}

const CategoryPage: React.FC = () => {
  const location = useLocation();
  const { category } = location.state as { category: Category };
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  // Destructure transfer along with other API functions.
  const { getItems, createItem, updateItem, deleteItem, transfer } =
    useItemsApi();

  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  // For the options dropdown on each account
  const [activeOptions, setActiveOptions] = useState<number | null>(null);

  // Update modal state
  const [itemToUpdate, setItemToUpdate] = useState<any | null>(null);
  const [updateName, setUpdateName] = useState("");
  const [updateCost, setUpdateCost] = useState<number>(0);
  const [updateDescription, setUpdateDescription] = useState("");
  const [updateError, setUpdateError] = useState("");

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState<number>(100);
  const [newDescription, setNewDescription] = useState("");
  const [createError, setCreateError] = useState("");

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const response = await getItems({
        type: "category_id",
        value: category.category_id,
      });
      if (!response.data?.accessToken) {
        setItems(response.data);
        console.log("Items set:", response.data);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [auth?.accessToken]);

  // Opens the update modal and pre-fills form with current data
  const openUpdateModal = (item: any) => {
    setItemToUpdate(item);
    setUpdateName(item.name);
    setUpdateCost(item.cost);
    setUpdateDescription(item.description || "");
    setUpdateError("");
    setActiveOptions(null); // Close the options dropdown if open
  };

  // Closes the update modal
  const closeUpdateModal = () => {
    setItemToUpdate(null);
    setUpdateError("");
  };

  // Submit updated data after validating cost; include category_id to keep it the same
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemToUpdate) {
      if (updateCost < itemToUpdate.balance) {
        setUpdateError(
          "Cost cannot be lower than balance. Please move money out of this account first."
        );
        return;
      }
      try {
        const updatedData = {
          name: updateName,
          cost: updateCost,
          description: updateDescription,
          category_id: itemToUpdate.category_id, // Keep the same category_id
        };
        await updateItem(itemToUpdate.item_id, updatedData);
        setItems((prev) =>
          prev.map((item) =>
            item.item_id === itemToUpdate.item_id
              ? { ...item, ...updatedData }
              : item
          )
        );
        closeUpdateModal();
      } catch (error) {
        console.error("Error updating item:", error);
      }
    }
  };

  // Opens the create modal and resets form fields
  const openCreateModal = () => {
    setNewName("");
    setNewCost(100);
    setNewDescription("");
    setCreateError("");
    setIsCreateModalOpen(true);
  };

  // Closes the create modal
  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateError("");
  };

  // Submit new account data after validating cost
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Since balance is preset to 0, cost must be at least 0.
    if (newCost < 0) {
      setCreateError("Cost cannot be negative.");
      return;
    }
    try {
      const newItemData = {
        name: newName || "New Account",
        balance: 0,
        cost: newCost,
        description: newDescription,
        category_id: category.category_id,
      };
      const response = await createItem(newItemData);
      setItems((prev) => [...prev, response.data]);
      fetchItems();
      closeCreateModal();
    } catch (error) {
      console.error("Error creating item:", error);
    }
  };

  // New function: Delete an account with auto-transfer if it has a balance.
  const handleDeleteAccount = async (account: any) => {
    // If account has a non-zero balance, automatically transfer its funds to the main account.
    if (Number(account.balance) > 0) {
      try {
        // Get main account by calling getItems with category_id = null.
        const response = await getItems({ type: "category_id", value: null });
        if (
          response &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          const mainAccount = response.data[0];
          // Transfer funds: from the account to be deleted (account.item_id) to the main account.
          await transfer(account.item_id, mainAccount.item_id, account.balance);
          console.log(
            `Transferred $${account.balance} from account ${account.item_id} to main account ${mainAccount.item_id}`
          );
        } else {
          console.error("Main account not found. Cannot transfer funds.");
        }
      } catch (error) {
        console.error("Error during transfer:", error);
        return; // Stop deletion if transfer fails.
      }
    }
    // After transferring funds (if necessary), delete the account.
    try {
      await deleteItem(account.item_id);
      setItems((prev) =>
        prev.filter((item) => item.item_id !== account.item_id)
      );
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  if (!auth) return <p>Loading...</p>;

  // Fallback dummy data if no items are fetched.
  const miniAccounts = items;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{capitalize(category.name)} Accounts</h1>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          Back
        </button>
      </header>

      {/* Create account button at the top */}
      <section style={styles.topButtons}>
        <button style={styles.actionButton} onClick={openCreateModal}>
          Create New Account
        </button>
      </section>

      <main style={styles.mainContent}>
        {loadingItems ? (
          <p style={styles.infoText}>Loading accounts...</p>
        ) : miniAccounts.length > 0 ? (
          miniAccounts.map((item, index) => (
            <div key={item.item_id || index} style={styles.accountCard}>
              <div style={styles.accountInfo}>
                <h3 style={styles.accountName}>{item.name}</h3>
                <p style={styles.accountDetails}>
                  Balance: ${item.balance ? item.balance.toFixed(2) : "0"}{" "}
                  &nbsp;|&nbsp; Cost: ${item.cost ? item.cost.toFixed(2) : "0"}
                </p>
                <p style={styles.accountDescription}>{item.description}</p>
              </div>
              <div style={styles.optionsContainer}>
                <button
                  style={styles.optionsButton}
                  onClick={() =>
                    setActiveOptions(
                      activeOptions === item.item_id ? null : item.item_id
                    )
                  }
                >
                  ⋮
                </button>
                {activeOptions === item.item_id && (
                  <div style={styles.optionsDropdown}>
                    <button
                      style={styles.dropdownItem}
                      onClick={() => openUpdateModal(item)}
                    >
                      Modify
                    </button>
                    <button
                      style={styles.dropdownItem}
                      onClick={() => {
                        handleDeleteAccount(item);
                        setActiveOptions(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p style={styles.noData}>No accounts found for this category.</p>
        )}
        <Link to="/" style={styles.linkButton}>
          Back to Home
        </Link>
      </main>

      {/* Update Modal */}
      {itemToUpdate && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Update Account</h2>
            <form onSubmit={handleSubmitUpdate}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name:</label>
                <input
                  type="text"
                  value={updateName}
                  onChange={(e) => setUpdateName(e.target.value)}
                  style={styles.inputField}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Cost:</label>
                <input
                  type="number"
                  value={updateCost}
                  onChange={(e) => setUpdateCost(parseFloat(e.target.value))}
                  style={styles.inputField}
                  step="0.01"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description:</label>
                <input
                  type="text"
                  value={updateDescription}
                  onChange={(e) => setUpdateDescription(e.target.value)}
                  style={styles.inputField}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Balance:</label>
                <input
                  type="number"
                  value={itemToUpdate.balance}
                  style={{ ...styles.inputField, backgroundColor: "#f0f0f0" }}
                  readOnly
                />
              </div>
              {updateError && <p style={styles.errorText}>{updateError}</p>}
              <div style={styles.modalButtons}>
                <button type="submit" style={styles.modalButton}>
                  Save
                </button>
                <button
                  type="button"
                  style={styles.modalButton}
                  onClick={closeUpdateModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Create New Account</h2>
            <form onSubmit={handleSubmitCreate}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={styles.inputField}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Cost:</label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(parseFloat(e.target.value))}
                  style={styles.inputField}
                  step="0.01"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description:</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={styles.inputField}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Balance:</label>
                <input
                  type="number"
                  value={0}
                  style={{ ...styles.inputField, backgroundColor: "#f0f0f0" }}
                  readOnly
                />
              </div>
              {createError && <p style={styles.errorText}>{createError}</p>}
              <div style={styles.modalButtons}>
                <button type="submit" style={styles.modalButton}>
                  Create
                </button>
                <button
                  type="button"
                  style={styles.modalButton}
                  onClick={closeCreateModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
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
  topButtons: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "30px",
  },
  actionButton: {
    backgroundColor: "#388e3c",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s ease",
  },
  mainContent: {
    textAlign: "left",
  },
  infoText: {
    fontSize: "18px",
    color: "#555",
    textAlign: "center",
  },
  accountCard: {
    backgroundColor: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: "20px",
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: "22px",
    fontWeight: 600,
    margin: "0 0 5px 0",
    color: "#333",
  },
  accountDetails: {
    fontSize: "16px",
    color: "#666",
    margin: "0 0 8px 0",
  },
  accountDescription: {
    fontSize: "15px",
    color: "#777",
    margin: 0,
  },
  optionsContainer: {
    position: "relative",
    marginLeft: "15px",
  },
  optionsButton: {
    background: "transparent",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#888",
  },
  optionsDropdown: {
    position: "absolute",
    top: "35px",
    right: 0,
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 10,
    overflow: "hidden",
  },
  dropdownItem: {
    display: "block",
    padding: "10px 16px",
    width: "100%",
    background: "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "16px",
    color: "#333",
    transition: "background 0.2s ease",
  },
  noData: {
    fontSize: "18px",
    color: "#777",
    textAlign: "center",
    margin: "40px 0",
  },
  linkButton: {
    display: "inline-block",
    marginTop: "30px",
    backgroundColor: "#1976d2",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "16px",
    transition: "background-color 0.3s ease",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "450px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  modalTitle: {
    margin: "0 0 20px 0",
    fontSize: "26px",
    fontWeight: 600,
    color: "#333",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "16px",
    color: "#555",
  },
  inputField: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "16px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    outline: "none",
    transition: "border-color 0.3s ease",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: "14px",
    marginTop: "5px",
  },
  modalButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "15px",
    marginTop: "20px",
  },
  modalButton: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "16px",
    backgroundColor: "#1976d2",
    color: "#fff",
    transition: "background-color 0.3s ease",
  },
};

export default CategoryPage;
