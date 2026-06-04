import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ACTIVITY_TYPES, useActivityApi } from "../api_requests/activity";
import { useCategoryApi } from "../api_requests/category";
import { useItemsApi } from "../api_requests/items";

type CategoryOption = {
  category_id: number;
  name: string;
};

type ItemOption = {
  item_id: number;
  name: string;
};

type ActivityLog = {
  activityLogId: number;
  timestamp: string;
  type: string;
  amount: number | null;
  categoryId: number | null;
  categoryName: string | null;
  itemId: number | null;
  itemName: string | null;
  metadata: Record<string, unknown> | null;
};

const formatType = (type: string) =>
  type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

const formatAmount = (amount: number | null) => {
  if (amount === null || amount === undefined) return "—";
  return `$${Number(amount).toFixed(2)}`;
};

const HistoryPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { getActivity } = useActivityApi();
  const { getCategories } = useCategoryApi();
  const { getItems } = useItemsApi();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [filters, setFilters] = useState({
    categoryId: "",
    itemId: "",
    type: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ""),
      ),
    [filters],
  );

  const fetchActivity = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getActivity(requestFilters);
      setLogs(response.data || []);
    } catch (activityError) {
      console.error("Error fetching activity:", activityError);
      setError("Unable to load activity history.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [categoryResponse, itemResponse] = await Promise.all([
        getCategories(),
        getItems(),
      ]);
      if (Array.isArray(categoryResponse.data)) {
        setCategories(categoryResponse.data);
      }
      if (Array.isArray(itemResponse.data)) {
        setItems(itemResponse.data);
      }
    } catch (optionError) {
      console.error("Error fetching history filter options:", optionError);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, [auth?.accessToken]);

  useEffect(() => {
    fetchActivity();
  }, [requestFilters, auth?.accessToken]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Activity History</h1>
          <p style={styles.subtitle}>
            Review account changes, funding events, purchases, and security
            updates.
          </p>
        </div>
        <nav style={styles.navLinks}>
          <Link to="/home" style={styles.navLink}>
            Dashboard
          </Link>
          <Link to="/accounts" style={styles.navLink}>
            Accounts
          </Link>
        </nav>
      </header>

      <section style={styles.filtersCard}>
        <label style={styles.filterLabel}>
          Category
          <select
            value={filters.categoryId}
            onChange={(event) =>
              handleFilterChange("categoryId", event.target.value)
            }
            style={styles.select}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.filterLabel}>
          Item
          <select
            value={filters.itemId}
            onChange={(event) =>
              handleFilterChange("itemId", event.target.value)
            }
            style={styles.select}
          >
            <option value="">All items</option>
            {items.map((item) => (
              <option key={item.item_id} value={item.item_id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.filterLabel}>
          Type
          <select
            value={filters.type}
            onChange={(event) => handleFilterChange("type", event.target.value)}
            style={styles.select}
          >
            <option value="">All activity</option>
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatType(type)}
              </option>
            ))}
          </select>
        </label>

        <button
          style={styles.clearButton}
          onClick={() => setFilters({ categoryId: "", itemId: "", type: "" })}
        >
          Clear filters
        </button>
      </section>

      {error && <p style={styles.errorText}>{error}</p>}

      <section style={styles.historyCard}>
        {loading ? (
          <p style={styles.infoText}>Loading activity...</p>
        ) : logs.length === 0 ? (
          <p style={styles.infoText}>No activity found for these filters.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>When</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.activityLogId}>
                    <td style={styles.td}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge}>{formatType(log.type)}</span>
                    </td>
                    <td style={styles.td}>{formatAmount(log.amount)}</td>
                    <td style={styles.td}>
                      {log.categoryName ||
                        (log.categoryId ? `Category #${log.categoryId}` : "—")}
                    </td>
                    <td style={styles.td}>
                      {log.itemName ||
                        (log.itemId ? `Item #${log.itemId}` : "—")}
                    </td>
                    <td style={styles.td}>
                      <pre style={styles.metadata}>
                        {JSON.stringify(log.metadata || {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "32px 20px",
    fontFamily: "Arial, sans-serif",
    color: "#222",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#666",
  },
  navLinks: {
    display: "flex",
    gap: "16px",
  },
  navLink: {
    color: "#1976d2",
    textDecoration: "none",
    fontWeight: 600,
  },
  filtersCard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
    backgroundColor: "#f7fbff",
    border: "1px solid #dbe9f6",
    borderRadius: "10px",
    padding: "18px",
    marginBottom: "22px",
  },
  filterLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontWeight: 600,
  },
  select: {
    padding: "10px 12px",
    border: "1px solid #c7d4e2",
    borderRadius: "6px",
    fontSize: "15px",
  },
  clearButton: {
    alignSelf: "end",
    padding: "10px 14px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#455a64",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  historyCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    boxShadow: "0 2px 14px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    backgroundColor: "#eef4f8",
    padding: "14px",
    fontSize: "14px",
    color: "#37474f",
  },
  td: {
    borderTop: "1px solid #edf1f5",
    padding: "14px",
    verticalAlign: "top",
    fontSize: "14px",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    borderRadius: "999px",
    padding: "5px 10px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  metadata: {
    margin: 0,
    maxWidth: "320px",
    whiteSpace: "pre-wrap",
    fontSize: "12px",
    color: "#455a64",
  },
  infoText: {
    padding: "32px",
    textAlign: "center",
    color: "#666",
  },
  errorText: {
    color: "#c62828",
    fontWeight: 600,
  },
};

export default HistoryPage;
