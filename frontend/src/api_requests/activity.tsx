import { useContext } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const ACTIVITY_TYPES = [
  "MONEY_ADDED",
  "AUTO_ALLOCATED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "ITEM_CREATED",
  "ITEM_UPDATED",
  "TARGET_UPDATED",
  "ALLOCATION_CHANGED",
  "FULLY_FUNDED_REACHED",
  "ITEM_PURCHASED",
  "ITEM_CANCELLED",
  "PASSWORD_CHANGED",
  "ACCOUNT_SOFT_DELETED",
];

export const useActivityApi = () => {
  const auth = useContext(AuthContext);

  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    if (auth?.accessToken) {
      headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    return headers;
  };

  const getActivity = async (params: Record<string, unknown> = {}) => {
    const response = await api.get("/activity", {
      headers: buildHeaders(),
      params,
    });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  return { getActivity };
};
