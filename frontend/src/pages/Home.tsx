import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { capitalize } from "../utils/generalUtils";
import { useCategoryApi } from "../api_requests/category";
import { useItemsApi } from "../api_requests/items";
import TransferFunds from "../components/TransferFunds"; // Ensure correct path

type ConfirmDelete = {
  category_id: number;
  categoryName: string;
  accounts: any[];
};

const HomePage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const { getCategories, createCategory, updateCategory, deleteCategory } =
    useCategoryApi();
  const { getItems } = useItemsApi();

  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // State for the Main Account view
  const [mainAccount, setMainAccount] = useState<any>(null);
  const [loadingMainAccount, setLoadingMainAccount] = useState(true);

  // State for all accounts (used to compute category sums)
  const [allAccounts, setAllAccounts] = useState<any[]>([]);

  // State to hold the sum of balances for each category
  const [categorySums, setCategorySums] = useState<{ [key: number]: number }>(
    {}
  );

  // Options dropdown state for each category card
  const [activeOptions, setActiveOptions] = useState<number | null>(null);

  // Update modal state
  const [categoryToUpdate, setCategoryToUpdate] = useState<any | null>(null);
  const [updateName, setUpdateName] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");
  const [updateError, setUpdateError] = useState("");

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createError, setCreateError] = useState("");

  // Transfer modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Delete confirmation popup state
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(
    null
  );

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await getCategories();
      if (!response.data?.accessToken) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchMainAccount = async () => {
    setLoadingMainAccount(true);
    try {
      // getItems with parameters { type: "category_id", value: null } returns the Main Account (first element)
      const response = await getItems({ type: "category_id", value: null });
      if (
        !response.data?.accessToken &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        setMainAccount(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching main account:", error);
    } finally {
      setLoadingMainAccount(false);
    }
  };

  // Fetch all accounts once (with no parameters) to later compute sums
  const fetchAllAccounts = async () => {
    try {
      const response = await getItems();

      if (response && response.data && !response.data?.accessToken) {
        setAllAccounts(response.data);
      }
    } catch (error) {
      console.error("Error fetching all accounts:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchMainAccount();
    fetchAllAccounts();
  }, [auth?.accessToken]);

  // Compute category sums from the allAccounts array without making multiple API calls
  useEffect(() => {
    const sums: { [key: number]: number } = {};
    categories.forEach((cat: any) => {
      // Assume each account has a property category_id
      const accountsForCat = allAccounts.filter(
        (acc) => acc.category_id === cat.category_id
      );
      const sum = accountsForCat.reduce(
        (accum, account) => accum + Number(account.balance),
        0
      );
      sums[cat.category_id] = sum;
    });
    setCategorySums(sums);
  }, [categories, allAccounts]);

  // Opens the update modal with pre-filled category data
  const openUpdateModal = (cat: any) => {
    setCategoryToUpdate(cat);
    setUpdateName(cat.name);
    setUpdateDescription(cat.description || "");
    setUpdateError("");
    setActiveOptions(null);
  };

  // Closes the update modal
  const closeUpdateModal = () => {
    setCategoryToUpdate(null);
    setUpdateError("");
  };

  // Submit updated category data
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryToUpdate) {
      if (!updateName.trim()) {
        setUpdateError("Category name cannot be empty.");
        return;
      }
      try {
        const updatedData = {
          name: updateName,
          description: updateDescription,
        };
        await updateCategory(categoryToUpdate.category_id, updatedData);
        setCategories((prev) =>
          prev.map((cat) =>
            cat.category_id === categoryToUpdate.category_id
              ? { ...cat, ...updatedData }
              : cat
          )
        );
        closeUpdateModal();
      } catch (error) {
        console.error("Error updating category:", error);
      }
    }
  };

  // Opens the create modal and resets its fields
  const openCreateModal = () => {
    setNewName("");
    setNewDescription("");
    setCreateError("");
    setIsCreateModalOpen(true);
  };

  // Closes the create modal
  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateError("");
  };

  // Submit new category data
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError("Category name cannot be empty.");
      return;
    }
    try {
      const newCategoryData = {
        name: newName,
        description: newDescription,
      };
      await createCategory(newCategoryData);
      fetchCategories();
      closeCreateModal();
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  // Delete a category directly if no accounts exist
  const handleDeleteCategory = async (
    category_id: string | number,
    options?: any
  ) => {
    try {
      await deleteCategory(category_id, options);
      setCategories((prev) =>
        prev.filter((cat) => cat.category_id !== category_id)
      );
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  // When user clicks Delete from the options dropdown, check if category has accounts.
  const handleAttemptDelete = async (cat: any) => {
    const response = await getItems({
      type: "category_id",
      value: cat.category_id,
    });
    cat.accounts = response.data;
    if (cat.accounts && cat.accounts.length > 0) {
      setConfirmDelete({
        category_id: cat.category_id,
        categoryName: cat.name,
        accounts: cat.accounts,
      });
    } else {
      handleDeleteCategory(cat.category_id);
    }
    setActiveOptions(null);
  };

  // Handles the user's choice in the delete confirmation popup.
  const handleConfirmDeleteOption = async (option: "accounts" | "main") => {
    if (confirmDelete) {
      try {
        await handleDeleteCategory(confirmDelete.category_id, {
          redistribution: option,
        });
      } catch (error) {
        console.error("Error deleting category:", error);
      } finally {
        setConfirmDelete(null);
      }
    }
  };

  if (!auth) return <p>Loading...</p>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>BudgetWise</h1>
        <nav>
          <ul style={styles.navList}>
            <li style={styles.navItem}>
              <Link to="/about" style={styles.navLink}>
                About
              </Link>
            </li>
            <li style={styles.navItem}>
              <button onClick={auth.logout} style={styles.navButton}>
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <h2 style={styles.welcome}>
          Welcome, {capitalize(auth.user?.f_name)}{" "}
          {capitalize(auth.user?.l_name)}!
        </h2>
        <p style={styles.description}>
          BudgetWise helps you allocate funds into mini accounts for travel,
          gadgets, big buys, and more. Manage your categories below.
        </p>

        {/* Main Account View */}
        <section style={styles.mainAccountSection}>
          <h3 style={styles.sectionTitle}>Main Account</h3>
          {loadingMainAccount ? (
            <p style={styles.infoText}>Loading Main Account...</p>
          ) : mainAccount ? (
            <div style={styles.mainAccountCard}>
              <p style={styles.mainAccountBalance}>
                ${parseFloat(mainAccount.balance).toFixed(2)}
              </p>
            </div>
          ) : (
            <p style={styles.infoText}>No Main Account found.</p>
          )}
        </section>

        {/* Transfer Funds & View Accounts Buttons */}
        <div style={styles.buttonsContainer}>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            style={styles.actionButton}
          >
            Transfer Funds
          </button>
          <button
            onClick={() => navigate("/accounts")}
            style={styles.actionButton}
          >
            View All Accounts
          </button>
        </div>

        {/* Category Section */}
        <section style={styles.categorySection}>
          <div style={styles.categoryHeader}>
            <h3 style={styles.sectionTitle}>Account Categories</h3>
            <button style={styles.actionButton} onClick={openCreateModal}>
              Create New Category
            </button>
          </div>
          {loadingCategories ? (
            <p style={styles.infoText}>Loading categories...</p>
          ) : categories.length > 0 ? (
            categories.map((cat) => (
              <div key={cat.category_id} style={styles.categoryCard}>
                <Link
                  to={`/category/${cat.category_id}`}
                  state={{ category: cat }}
                  style={styles.categoryCardLink}
                >
                  <div style={styles.categoryInfo}>
                    <h4 style={styles.categoryName}>{capitalize(cat.name)}</h4>
                    <p style={styles.categoryDescription}>{cat.description}</p>
                    <p style={styles.categorySum}>
                      Total: $
                      {categorySums[cat.category_id] !== undefined
                        ? categorySums[cat.category_id].toFixed(2)
                        : "0.00"}
                    </p>
                  </div>
                </Link>
                <div style={styles.optionsContainer}>
                  <button
                    style={styles.optionsButton}
                    onClick={() =>
                      setActiveOptions(
                        activeOptions === cat.category_id
                          ? null
                          : cat.category_id
                      )
                    }
                  >
                    ⋮
                  </button>
                  {activeOptions === cat.category_id && (
                    <div style={styles.optionsDropdown}>
                      <button
                        style={styles.dropdownItem}
                        onClick={() => openUpdateModal(cat)}
                      >
                        Modify
                      </button>
                      <button
                        style={styles.dropdownItem}
                        onClick={() => handleAttemptDelete(cat)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p style={styles.noData}>No categories found.</p>
          )}
        </section>
      </main>

      {/* Transfer Funds Modal */}
      {isTransferModalOpen && (
        <TransferFunds
          onClose={() => setIsTransferModalOpen(false)}
          onTransferSuccess={() => {
            // Optionally refresh main account or accounts list after a successful transfer.
            fetchAllAccounts();
            fetchMainAccount();
          }}
        />
      )}

      {/* Update Modal */}
      {categoryToUpdate && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Update Category</h2>
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
                <label style={styles.label}>Description:</label>
                <input
                  type="text"
                  value={updateDescription}
                  onChange={(e) => setUpdateDescription(e.target.value)}
                  style={styles.inputField}
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
            <h2 style={styles.modalTitle}>Create New Category</h2>
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
                <label style={styles.label}>Description:</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={styles.inputField}
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

      {/* Delete Confirmation Popup */}
      {confirmDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Confirm Category Deletion</h2>
            <p>
              The category "
              <strong>{capitalize(confirmDelete.categoryName)}</strong>" has
              associated accounts. How would you like to handle the funds?
            </p>
            <div style={styles.modalButtons}>
              <button
                style={styles.modalButton}
                onClick={() => handleConfirmDeleteOption("accounts")}
              >
                Redistribute among accounts
              </button>
              <button
                style={styles.modalButton}
                onClick={() => handleConfirmDeleteOption("main")}
              >
                Send to main account
              </button>
              <button
                style={styles.modalButton}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "1000px",
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
  navList: {
    listStyle: "none",
    display: "flex",
    gap: "20px",
    margin: 0,
    padding: 0,
  },
  navItem: {},
  navLink: {
    textDecoration: "none",
    fontSize: "16px",
    color: "#1976d2",
  },
  navButton: {
    fontSize: "16px",
    color: "#1976d2",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
  },
  mainContent: {
    textAlign: "center",
    marginBottom: "40px",
  },
  welcome: {
    fontSize: "24px",
    fontWeight: 600,
    marginBottom: "10px",
  },
  description: {
    fontSize: "16px",
    marginBottom: "20px",
    lineHeight: "1.5",
  },
  mainAccountSection: {
    marginBottom: "30px",
    textAlign: "center",
  },
  mainAccountCard: {
    backgroundColor: "#e8f5e9",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    display: "inline-block",
  },
  mainAccountBalance: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#2e7d32",
  },
  categorySection: {
    textAlign: "left",
    marginBottom: "30px",
  },
  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  sectionTitle: {
    fontSize: "22px",
    fontWeight: 600,
    color: "#333",
  },
  actionButton: {
    backgroundColor: "#388e3c",
    color: "#fff",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s ease",
  },
  infoText: {
    fontSize: "18px",
    color: "#555",
    textAlign: "center",
  },
  categoryCard: {
    backgroundColor: "#f9f9f9",
    padding: "18px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: "15px",
  },
  categoryCardLink: {
    flex: 1,
    textDecoration: "none",
    color: "inherit",
  },
  categoryInfo: {},
  categoryName: {
    fontSize: "20px",
    fontWeight: 600,
    margin: "0 0 5px 0",
    color: "#333",
  },
  categoryDescription: {
    fontSize: "16px",
    color: "#666",
    margin: 0,
  },
  categorySum: {
    fontSize: "16px",
    color: "#2e7d32",
    fontWeight: 600,
    marginTop: "5px",
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
  buttonsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "30px",
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

export default HomePage;
