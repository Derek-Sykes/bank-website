import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useItemsApi } from "../api_requests/items";
import { AppShell } from "../components/layout";
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
  description?: string;
  category_id?: number | null;
  status?: string;
};

type ItemForm = {
  name: string;
  cost: string;
  description: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const toNumber = (value: unknown) => Number(value || 0);
const remainingFor = (item: Item) => Math.max(0, toNumber(item.cost) - toNumber(item.balance));

const statusFor = (item: Item) => {
  const status = item.status?.toLowerCase();
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "purchased") return "purchased";
  if (toNumber(item.cost) > 0 && toNumber(item.balance) >= toNumber(item.cost)) return "fully funded";
  return "active";
};

const CategoryPage: React.FC = () => {
  const { category: categorySlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const category = (location.state as { category?: Category } | null)?.category;
  const { getItems, createItem, updateItem, deleteItem, transfer } = useItemsApi();

  const [items, setItems] = useState<Item[]>([]);
  const [mainAccount, setMainAccount] = useState<Item | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeOptions, setActiveOptions] = useState<number | null>(null);
  const [form, setForm] = useState<ItemForm>({ name: "", cost: "100", description: "" });
  const [formError, setFormError] = useState("");
  const [allocationAmounts, setAllocationAmounts] = useState<Record<number, string>>({});
  const [allocationMessage, setAllocationMessage] = useState("");

  const fetchItems = async () => {
    if (!category) {
      setLoadingItems(false);
      return;
    }

    setLoadingItems(true);
    try {
      const [itemsResponse, mainResponse] = await Promise.all([
        getItems({ type: "category_id", value: category.category_id }),
        getItems({ type: "category_id", value: null }),
      ]);
      if (!itemsResponse.data?.accessToken) setItems(itemsResponse.data || []);
      if (Array.isArray(mainResponse.data) && mainResponse.data.length > 0) setMainAccount(mainResponse.data[0]);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [auth?.accessToken, category?.category_id]);

  const totals = useMemo(() => {
    const totalBalance = items.reduce((sum, item) => sum + toNumber(item.balance), 0);
    const totalTarget = items.reduce((sum, item) => sum + toNumber(item.cost), 0);
    const unallocated = items.reduce((sum, item) => sum + Math.max(0, toNumber(item.balance) - toNumber(item.cost)), 0);
    return { totalBalance, totalTarget, unallocated };
  }, [items]);

  const sections = useMemo(() => {
    return {
      active: items.filter((item) => statusFor(item) === "active"),
      fullyFunded: items.filter((item) => statusFor(item) === "fully funded"),
      purchased: items.filter((item) => statusFor(item) === "purchased"),
      cancelled: items.filter((item) => statusFor(item) === "cancelled"),
    };
  }, [items]);

  const chartSegments = items.map((item, index) => ({
    label: item.name,
    value: toNumber(item.balance),
    color: ["#2563eb", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#22c55e"][index % 6],
  }));

  const openCreateModal = () => {
    setForm({ name: "", cost: "100", description: "" });
    setFormError("");
    setIsCreateModalOpen(true);
  };

  const openUpdateModal = (item: Item) => {
    setEditingItem(item);
    setForm({ name: item.name, cost: String(toNumber(item.cost)), description: item.description || "" });
    setFormError("");
    setActiveOptions(null);
  };

  const closeItemModal = () => {
    setEditingItem(null);
    setIsCreateModalOpen(false);
    setFormError("");
  };

  const handleSubmitItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!category) return;

    const cost = Number(form.cost);
    if (!form.name.trim()) {
      setFormError("Goal name is required.");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setFormError("Cost must be a positive number.");
      return;
    }
    if (editingItem && cost < toNumber(editingItem.balance)) {
      setFormError("Cost cannot be lower than the current balance.");
      return;
    }

    try {
      const payload = { name: form.name, cost, description: form.description, category_id: category.category_id };
      if (editingItem) {
        await updateItem(editingItem.item_id, payload);
      } else {
        await createItem({ ...payload, balance: 0 });
      }
      closeItemModal();
      fetchItems();
    } catch (error) {
      console.error("Error saving item:", error);
      setFormError("Unable to save goal. Please try again.");
    }
  };

  const handleDeleteItem = async (item: Item) => {
    try {
      if (toNumber(item.balance) > 0 && mainAccount) {
        await transfer(item.item_id, mainAccount.item_id, toNumber(item.balance));
      }
      await deleteItem(item.item_id);
      setActiveOptions(null);
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleAllocation = async (item: Item) => {
    if (!mainAccount) return;
    const amount = Number(allocationAmounts[item.item_id]);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAllocationMessage("Enter a positive allocation amount.");
      return;
    }
    if (amount > toNumber(mainAccount.balance)) {
      setAllocationMessage("That allocation is higher than your main account balance.");
      return;
    }
    if (amount > remainingFor(item)) {
      setAllocationMessage("This goal does not need that much funding.");
      return;
    }

    try {
      await transfer(mainAccount.item_id, item.item_id, amount);
      setAllocationAmounts((current) => ({ ...current, [item.item_id]: "" }));
      setAllocationMessage("Allocation saved.");
      fetchItems();
    } catch (error) {
      console.error("Allocation failed:", error);
      setAllocationMessage("Allocation failed. Please try again.");
    }
  };

  const allocateUnassignedFunds = async () => {
    if (!mainAccount) return;
    let available = toNumber(mainAccount.balance);
    if (available <= 0) {
      setAllocationMessage("No unassigned funds are available in the main account.");
      return;
    }

    try {
      for (const item of sections.active) {
        const amount = Math.min(available, remainingFor(item));
        if (amount > 0) {
          await transfer(mainAccount.item_id, item.item_id, amount);
          available -= amount;
        }
        if (available <= 0) break;
      }
      setAllocationMessage("Unassigned funds allocated to active goals.");
      fetchItems();
    } catch (error) {
      console.error("Auto-allocation failed:", error);
      setAllocationMessage("Auto-allocation failed. Please try again.");
    }
  };

  const renderSection = (title: string, list: Item[]) => (
    <Card className="itemSection">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">{title}</p>
          <h2>{list.length} items</h2>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="emptyState">No {title.toLowerCase()} items.</div>
      ) : (
        <div className="itemList">
          {list.map((item) => (
            <Card className="itemCard" key={item.item_id}>
              <div className="itemCard__header">
                <div>
                  <h3>{item.name}</h3>
                  <p className="muted">{item.description || "No description yet"}</p>
                </div>
                <button className="iconButton" type="button" onClick={() => setActiveOptions(activeOptions === item.item_id ? null : item.item_id)} aria-label={`Options for ${item.name}`}>
                  ⋯
                </button>
              </div>
              <span className="itemStatus">{statusFor(item)}</span>
              <ProgressBar value={toNumber(item.balance)} max={toNumber(item.cost) || 1} label={`${currency.format(toNumber(item.balance))} of ${currency.format(toNumber(item.cost))}`} />
              {activeOptions === item.item_id && (
                <div className="categoryCard__menu">
                  <button type="button" onClick={() => openUpdateModal(item)}>Modify</button>
                  <button type="button" onClick={() => handleDeleteItem(item)}>Delete</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Card>
  );

  if (!category) {
    return (
      <AppShell>
        <Card>
          <p className="eyebrow">Category not loaded</p>
          <h2>{capitalize(categorySlug || "category")}</h2>
          <p className="muted">Open a category from the dashboard so its account details can be loaded.</p>
          <Link className="button button--primary" to="/home">Back to dashboard</Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell onPrimaryAction={openCreateModal}>
      <div className="dashboardGrid">
        <div className="detailHeader">
          <Card tone="accent">
            <button className="button button--secondary" type="button" onClick={() => navigate(-1)}>Back</button>
            <h1 className="detailTitle">{capitalize(category.name)}</h1>
            <p className="muted">{category.description || "Track category goals, allocations, and funded purchases."}</p>
            <div className="kpiRow">
              <Card className="statCard">
                <span className="muted">Total balance</span>
                <strong>{currency.format(totals.totalBalance)}</strong>
              </Card>
              <Card className="statCard">
                <span className="muted">Unallocated</span>
                <strong>{currency.format(totals.unallocated)}</strong>
              </Card>
              <Card className="statCard">
                <span className="muted">Main account</span>
                <strong>{currency.format(toNumber(mainAccount?.balance))}</strong>
              </Card>
            </div>
          </Card>
          <Card>
            <p className="eyebrow">Category distribution</p>
            <DonutChart centerLabel="Saved" centerValue={currency.format(totals.totalBalance)} segments={chartSegments} />
          </Card>
        </div>

        <div className="itemSections">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Category detail</p>
              <h2>Goals and purchases</h2>
            </div>
            <button className="button button--primary" type="button" onClick={openCreateModal}>Create Item</button>
          </div>
          {loadingItems ? <Card><div className="emptyState">Loading items...</div></Card> : null}
          {renderSection("Active", sections.active)}
          {renderSection("Fully Funded", sections.fullyFunded)}
          {renderSection("Purchased", sections.purchased)}
          {renderSection("Cancelled", sections.cancelled)}
        </div>

        <aside className="allocationPanel">
          <Card>
            <p className="eyebrow">Allocation editor</p>
            <h2>Fund an item</h2>
            <p className="muted">Move money from the main account into active goals without exceeding their target.</p>
            <div className="allocationForm">
              {sections.active.length === 0 ? <div className="emptyState">No active items need funding.</div> : null}
              {sections.active.map((item) => (
                <div className="formField" key={item.item_id}>
                  <span>{item.name} · needs {currency.format(remainingFor(item))}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={allocationAmounts[item.item_id] || ""}
                    onChange={(event) => setAllocationAmounts((current) => ({ ...current, [item.item_id]: event.target.value }))}
                  />
                  <button className="button button--secondary" type="button" onClick={() => handleAllocation(item)}>Allocate</button>
                </div>
              ))}
            </div>
          </Card>
          <Card tone="dark">
            <p className="eyebrow">Allocate unassigned funds</p>
            <h2>{currency.format(toNumber(mainAccount?.balance))}</h2>
            <p className="muted">Automatically fill active goals from oldest to newest until the main account is empty or goals are funded.</p>
            <button className="button button--primary" type="button" onClick={allocateUnassignedFunds}>Allocate Unassigned Funds</button>
            {allocationMessage && <p>{allocationMessage}</p>}
          </Card>
        </aside>
      </div>

      <Modal title={editingItem ? "Update Item" : "Create Item"} isOpen={isCreateModalOpen || Boolean(editingItem)} onClose={closeItemModal}>
        <form className="formGrid" onSubmit={handleSubmitItem}>
          <label className="formField">
            Name
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="formField">
            Cost
            <input type="number" min="0" step="0.01" value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} />
          </label>
          <label className="formField">
            Description
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          {formError && <p className="errorText">{formError}</p>}
          <div className="actionRow">
            <button className="button button--primary" type="submit">Save Item</button>
            <button className="button button--ghost" type="button" onClick={closeItemModal}>Cancel</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};

export default CategoryPage;
