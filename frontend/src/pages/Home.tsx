import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useCategoryApi } from "../api_requests/category";
import { useItemsApi } from "../api_requests/items";
import { AppShell } from "../components/layout";
import TransferFunds from "../components/TransferFunds";
import { Card, DonutChart, Modal, ProgressBar } from "../components/ui";
import { capitalize } from "../utils/generalUtils";

type Category = {
  category_id: number;
  name: string;
  description?: string;
};

type Item = {
  item_id: number;
  name: string;
  balance?: number;
  cost?: number;
  category_id?: number | null;
};

type CategoryForm = {
  name: string;
  description: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const chartColors = ["#2563eb", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#22c55e"];

const toNumber = (value: unknown) => Number(value || 0);

const HomePage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { getCategories, createCategory, updateCategory, deleteCategory } = useCategoryApi();
  const { getItems } = useItemsApi();

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [mainAccount, setMainAccount] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOptions, setActiveOptions] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>({ name: "", description: "" });
  const [formError, setFormError] = useState("");

  const refreshDashboard = async () => {
    setLoading(true);
    try {
      const [categoryResponse, allItemsResponse, mainResponse] = await Promise.all([
        getCategories(),
        getItems(),
        getItems({ type: "category_id", value: null }),
      ]);

      if (!categoryResponse.data?.accessToken) setCategories(categoryResponse.data || []);
      if (!allItemsResponse.data?.accessToken) setItems(allItemsResponse.data || []);
      if (Array.isArray(mainResponse.data) && mainResponse.data.length > 0) {
        setMainAccount(mainResponse.data[0]);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, [auth?.accessToken]);

  const categorySummaries = useMemo(() => {
    return categories.map((category, index) => {
      const categoryItems = items.filter((item) => item.category_id === category.category_id);
      const balance = categoryItems.reduce((sum, item) => sum + toNumber(item.balance), 0);
      const target = categoryItems.reduce((sum, item) => sum + toNumber(item.cost), 0);
      const fullyFunded = categoryItems.filter((item) => toNumber(item.cost) > 0 && toNumber(item.balance) >= toNumber(item.cost)).length;
      const unallocated = Math.max(0, balance - target);

      return {
        ...category,
        balance,
        target,
        fullyFunded,
        goalCount: categoryItems.length,
        unallocated,
        color: chartColors[index % chartColors.length],
      };
    });
  }, [categories, items]);

  const totalCategoryBalance = categorySummaries.reduce((sum, category) => sum + category.balance, 0);
  const categoryUnallocated = categorySummaries.reduce((sum, category) => sum + category.unallocated, 0);
  const goalCount = categorySummaries.reduce((sum, category) => sum + category.goalCount, 0);
  const fullyFundedCount = categorySummaries.reduce((sum, category) => sum + category.fullyFunded, 0);

  const openCreateModal = () => {
    setForm({ name: "", description: "" });
    setFormError("");
    setIsCreateModalOpen(true);
  };

  const openUpdateModal = (category: Category) => {
    setEditingCategory(category);
    setForm({ name: category.name, description: category.description || "" });
    setFormError("");
    setActiveOptions(null);
  };

  const closeCategoryModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategory(null);
    setFormError("");
  };

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Category name is required.");
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.category_id, form);
      } else {
        await createCategory(form);
      }
      closeCategoryModal();
      refreshDashboard();
    } catch (error) {
      console.error("Error saving category:", error);
      setFormError("Unable to save category. Please try again.");
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      await deleteCategory(categoryId, { transferToMain: true });
      setActiveOptions(null);
      refreshDashboard();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  return (
    <AppShell onPrimaryAction={() => setIsTransferModalOpen(true)}>
      <div className="dashboardGrid">
        <Card tone="accent" className="heroCard">
          <div>
            <p className="eyebrow">Main account balance</p>
            <div className="heroCard__balance">{loading ? "Loading" : currency.format(toNumber(mainAccount?.balance))}</div>
            <p className="muted">Unassigned funds ready to allocate into your plan.</p>
          </div>
          <div className="heroCard__actions">
            <button className="button button--primary" type="button" onClick={() => setIsTransferModalOpen(true)}>
              Add Money
            </button>
            <button className="button button--secondary" type="button" onClick={openCreateModal}>
              Create Category
            </button>
          </div>
        </Card>

        <div className="statsGrid">
          <Card className="statCard">
            <span className="muted">Category balance</span>
            <strong>{currency.format(totalCategoryBalance)}</strong>
          </Card>
          <Card className="statCard">
            <span className="muted">Category unallocated</span>
            <strong>{currency.format(categoryUnallocated)}</strong>
          </Card>
          <Card className="statCard">
            <span className="muted">Goals</span>
            <strong>{goalCount}</strong>
          </Card>
          <Card className="statCard">
            <span className="muted">Fully funded</span>
            <strong>{fullyFundedCount}</strong>
          </Card>
        </div>

        <Card className="chartCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Global distribution</p>
              <h2>Where your money lives</h2>
            </div>
          </div>
          <DonutChart
            centerLabel="Total"
            centerValue={currency.format(totalCategoryBalance)}
            segments={categorySummaries.map((category) => ({ label: capitalize(category.name), value: category.balance, color: category.color }))}
          />
        </Card>

        <Card className="categoriesPanel">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Categories</p>
              <h2>Funding plan</h2>
            </div>
            <button className="button button--primary" type="button" onClick={openCreateModal}>
              Create Category
            </button>
          </div>

          {loading ? (
            <div className="emptyState">Loading categories...</div>
          ) : categorySummaries.length === 0 ? (
            <div className="emptyState">Create your first category to start organizing money.</div>
          ) : (
            <div className="categoryGrid">
              {categorySummaries.map((category) => (
                <Card className="categoryCard" key={category.category_id}>
                  <div className="categoryCard__top">
                    <div>
                      <h3>{capitalize(category.name)}</h3>
                      <p className="muted">{category.description || "No description yet"}</p>
                    </div>
                    <button
                      className="iconButton"
                      type="button"
                      aria-label={`Options for ${category.name}`}
                      onClick={() => setActiveOptions(activeOptions === category.category_id ? null : category.category_id)}
                    >
                      ⋯
                    </button>
                  </div>
                  <div className="categoryCard__balance">{currency.format(category.balance)}</div>
                  <ProgressBar value={category.balance} max={category.target || category.balance || 1} label={`${category.fullyFunded}/${category.goalCount} fully funded`} />
                  <Link className="button button--ghost" to={`/category/${category.name}`} state={{ category }}>
                    View details
                  </Link>
                  {activeOptions === category.category_id && (
                    <div className="categoryCard__menu">
                      <button type="button" onClick={() => openUpdateModal(category)}>Modify</button>
                      <button type="button" onClick={() => handleDeleteCategory(category.category_id)}>Delete</button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {isTransferModalOpen && (
        <TransferFunds onClose={() => setIsTransferModalOpen(false)} onTransferSuccess={refreshDashboard} />
      )}

      <Modal title={editingCategory ? "Update Category" : "Create Category"} isOpen={isCreateModalOpen || Boolean(editingCategory)} onClose={closeCategoryModal}>
        <form className="formGrid" onSubmit={handleCategorySubmit}>
          <label className="formField">
            Name
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="formField">
            Description
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          {formError && <p className="errorText">{formError}</p>}
          <div className="actionRow">
            <button className="button button--primary" type="submit">Save Category</button>
            <button className="button button--ghost" type="button" onClick={closeCategoryModal}>Cancel</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};

export default HomePage;
