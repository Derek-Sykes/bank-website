import React from "react";
import type { Notification } from "../api_requests/notifications";

interface NotificationsPanelProps {
  notifications: Notification[];
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onMarkRead: (notification_id: number) => void;
  onMarkAllRead: () => void;
  onDelete: (notification_id: number) => void;
  onClearAll: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  isOpen,
  loading,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <aside style={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Notifications</p>
            <h2 style={styles.title}>Account activity</h2>
          </div>
          <button
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close notifications"
          >
            ×
          </button>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.secondaryButton}
            onClick={onMarkAllRead}
            disabled={!notifications.length}
          >
            Mark all read
          </button>
          <button
            style={styles.dangerButton}
            onClick={onClearAll}
            disabled={!notifications.length}
          >
            Clear all
          </button>
        </div>

        {loading ? (
          <p style={styles.emptyText}>Loading notifications...</p>
        ) : notifications.length > 0 ? (
          <div style={styles.list}>
            {notifications.map((notification) => {
              const unread = !notification.is_read;
              return (
                <article
                  key={notification.notification_id}
                  style={{
                    ...styles.card,
                    ...(unread ? styles.unreadCard : {}),
                  }}
                >
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>{notification.title}</h3>
                    {unread && (
                      <span
                        style={styles.unreadDot}
                        aria-label="Unread notification"
                      />
                    )}
                  </div>
                  <p style={styles.message}>{notification.message}</p>
                  <p style={styles.timestamp}>
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                  <div style={styles.cardActions}>
                    {unread && (
                      <button
                        style={styles.linkButton}
                        onClick={() => onMarkRead(notification.notification_id)}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      style={styles.linkButton}
                      onClick={() => onDelete(notification.notification_id)}
                    >
                      Clear
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p style={styles.emptyText}>You're all caught up.</p>
        )}
      </aside>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    display: "flex",
    justifyContent: "flex-end",
    zIndex: 1200,
  },
  panel: {
    width: "min(420px, 92vw)",
    height: "100vh",
    backgroundColor: "#fff",
    boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.18)",
    padding: "24px",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "18px",
  },
  eyebrow: {
    margin: "0 0 4px 0",
    color: "#1976d2",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    margin: 0,
    color: "#222",
    fontSize: "24px",
  },
  closeButton: {
    border: "none",
    backgroundColor: "#f1f5f9",
    borderRadius: "50%",
    width: "34px",
    height: "34px",
    cursor: "pointer",
    fontSize: "24px",
    lineHeight: 1,
    color: "#334155",
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  secondaryButton: {
    border: "1px solid #1976d2",
    backgroundColor: "#fff",
    color: "#1976d2",
    borderRadius: "6px",
    padding: "9px 12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  dangerButton: {
    border: "1px solid #d32f2f",
    backgroundColor: "#fff",
    color: "#d32f2f",
    borderRadius: "6px",
    padding: "9px 12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
    backgroundColor: "#fff",
  },
  unreadCard: {
    borderColor: "#90caf9",
    backgroundColor: "#f3f9ff",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  cardTitle: {
    margin: 0,
    color: "#1f2937",
    fontSize: "17px",
  },
  unreadDot: {
    width: "10px",
    height: "10px",
    backgroundColor: "#1976d2",
    borderRadius: "50%",
    flexShrink: 0,
  },
  message: {
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.45,
    margin: "8px 0",
  },
  timestamp: {
    color: "#94a3b8",
    fontSize: "12px",
    margin: "0 0 10px 0",
  },
  cardActions: {
    display: "flex",
    gap: "12px",
  },
  linkButton: {
    border: "none",
    backgroundColor: "transparent",
    color: "#1976d2",
    cursor: "pointer",
    padding: 0,
    fontSize: "14px",
    fontWeight: 600,
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: "50px",
    fontSize: "16px",
  },
};

export default NotificationsPanel;
