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
}

interface Item {
  item_id: number;
  name: string;
  description?: string | null;
  cost?: number | null;
  balance?: number | null;
  allocatedAmount?: number | null;
  allocationPercent?: number | null;
  category_id: number | null;
  status?: string | null;
}

interface ActivityLog {
  activity_log_id: number;
  type: string;
  message: string;
  created_at: string;
}

const CategoryPage: React.FC = () => {
  const location = useLocation();
  const { category } = location.state as { category: Category };
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const { getItems, createItem, updateItem, cancelItem, getActivityLogs } =
    useItemsApi();

  const [items, setItems] = useState<Item[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  // For the options dropdown on each account
  const [activeOptions, setActiveOptions] = useState<number | null>(null);

  // Update modal state
  const [itemToUpdate, setItemToUpdate] = useState<Item | null>(null);
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

  const fetchActivityLogs = async () => {
    try {
      const response = await getActivityLogs(category.category_id);
      if (!response.data?.accessToken) {
        setActivityLogs(response.data);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchActivityLogs();
    // Re-fetch category data only after auth state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.accessToken]);

  // Opens the update modal and pre-fills form with current data
  const openUpdateModal = (item: Item) => {
    setItemToUpdate(item);
    setUpdateName(item.name);
    setUpdateCost(Number(item.cost ?? 0));
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
      if (updateCost < Number(itemToUpdate.balance ?? 0)) {
        setUpdateError(
          "Cost cannot be lower than balance. Please move money out of this account first.",
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
              : item,
          ),
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

  const handleCancelGoal = async (goal: Item) => {
    try {
      await cancelItem(goal.item_id);
      setActiveOptions(null);
      await fetchItems();
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error cancelling goal:", error);
    }
  };

  if (!auth) return <p>Loading...</p>;

  const activeGoals = items.filter((item) => item.status !== "CANCELLED");
  const cancelledGoals = items.filter((item) => item.status === "CANCELLED");

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
          <p style={styles.infoText}>Loading goals...</p>
        ) : activeGoals.length > 0 ? (
          activeGoals.map((item, index) => (
            <div key={item.item_id || index} style={styles.accountCard}>
              <div style={styles.accountInfo}>
                <h3 style={styles.accountName}>{item.name}</h3>
                <p style={styles.accountDetails}>
                  Allocated: $
                  {Number(item.allocatedAmount ?? item.balance ?? 0).toFixed(2)}
                  &nbsp;|&nbsp; Allocation:
                  {Number(item.allocationPercent ?? 0).toFixed(2)}%
                  &nbsp;|&nbsp; Cost: ${Number(item.cost ?? 0).toFixed(2)}
                </p>
                <p style={styles.accountDescription}>{item.description}</p>
              </div>
              <div style={styles.optionsContainer}>
                <button
                  style={styles.optionsButton}
                  onClick={() =>
                    setActiveOptions(
                      activeOptions === item.item_id ? null : item.item_id,
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
                      onClick={() => handleCancelGoal(item)}
                    >
                      Cancel Goal / Reallocate
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p style={styles.noData}>No active goals found for this category.</p>
        )}

        {cancelledGoals.length > 0 && (
          <section>
            <h2 style={styles.sectionTitle}>Cancelled Goals</h2>
            {cancelledGoals.map((item) => (
              <div key={item.item_id} style={styles.cancelledCard}>
                <div style={styles.accountInfo}>
                  <h3 style={styles.accountName}>{item.name}</h3>
                  <p style={styles.accountDetails}>
                    <span style={styles.statusBadge}>Cancelled</span>
                    &nbsp;|&nbsp; Allocated: $
                    {Number(item.allocatedAmount ?? 0).toFixed(2)}
                    &nbsp;|&nbsp; Allocation:
                    {Number(item.allocationPercent ?? 0).toFixed(2)}%
                  </p>
                  <p style={styles.accountDescription}>{item.description}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        <section>
          <h2 style={styles.sectionTitle}>Activity History</h2>
          {activityLogs.length > 0 ? (
            <div style={styles.activityList}>
              {activityLogs.map((activity) => (
                <div key={activity.activity_log_id} style={styles.activityItem}>
                  <p style={styles.activityType}>{activity.type}</p>
                  <p style={styles.accountDescription}>{activity.message}</p>
                  <p style={styles.activityDate}>
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.noData}>No activity recorded for this category.</p>
          )}
        </section>

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
                  value={Number(itemToUpdate.balance ?? 0)}
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
  sectionTitle: {
    fontSize: "24px",
    fontWeight: 700,
    margin: "30px 0 15px",
    color: "#222",
  },
  cancelledCard: {
    backgroundColor: "#fff7f7",
    padding: "20px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #ffcdd2",
    marginBottom: "16px",
  },
  statusBadge: {
    backgroundColor: "#d32f2f",
    color: "#fff",
    padding: "3px 8px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 700,
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  activityItem: {
    backgroundColor: "#f5f8ff",
    border: "1px solid #dbe7ff",
    borderRadius: "8px",
    padding: "14px 16px",
  },
  activityType: {
    fontSize: "14px",
    color: "#1976d2",
    fontWeight: 700,
    margin: "0 0 6px 0",
  },
  activityDate: {
    fontSize: "13px",
    color: "#888",
    margin: "8px 0 0 0",
  },
};

export default CategoryPage;
