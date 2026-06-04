import { useContext } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export interface Notification {
  notification_id: number;
  user_id: number;
  source: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | string | null;
  is_read: boolean | number;
  read_at?: string | null;
  created_at: string;
}

export const useNotificationsApi = () => {
  const auth = useContext(AuthContext);

  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    if (auth?.accessToken) {
      headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    return headers;
  };

  const handleTokenRefresh = (data: unknown) => {
    if (
      data &&
      typeof data === "object" &&
      "accessToken" in data &&
      typeof data.accessToken === "string"
    ) {
      auth?.updateAccessTokenMem(data.accessToken);
    }
  };

  const getNotifications = async () => {
    const response = await api.get("/notifications", {
      headers: buildHeaders(),
    });
    handleTokenRefresh(response.data);
    return response;
  };

  const markNotificationRead = async (notification_id: string | number) => {
    const response = await api.patch(
      `/notifications/${notification_id}/read`,
      {},
      { headers: buildHeaders() },
    );
    handleTokenRefresh(response.data);
    return response;
  };

  const markAllNotificationsRead = async () => {
    const response = await api.post(
      "/notifications/mark-all-read",
      {},
      { headers: buildHeaders() },
    );
    handleTokenRefresh(response.data);
    return response;
  };

  const deleteNotification = async (notification_id: string | number) => {
    const response = await api.delete(`/notifications/${notification_id}`, {
      headers: buildHeaders(),
    });
    handleTokenRefresh(response.data);
    return response;
  };

  const deleteAllNotifications = async () => {
    const response = await api.delete("/notifications", {
      headers: buildHeaders(),
    });
    handleTokenRefresh(response.data);
    return response;
  };

  return {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteAllNotifications,
  };
};
