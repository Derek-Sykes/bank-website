// src/api_requests/category.ts
import { useContext } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ensures cookies (JWT) are sent with requests
});

// Custom hook to handle all items API calls
export const useItemsApi = () => {
  const auth = useContext(AuthContext);

  // Helper to build headers with authorization
  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    if (auth?.accessToken) {
      headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    return headers;
  };

  // GET: Retrieve items using the data field
  const getItems = async (params: Record<string, unknown> = {}) => {
    console.log("data in api request from frontend:", params);

    const response = await api.get("/items/item", {
      headers: buildHeaders(),
      params,
    });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  // POST: Create a new item using the data field
  const createItem = async (itemData: Record<string, unknown>) => {
    const headers = buildHeaders();
    const response = await api.post("/items/item", itemData, { headers });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  // PUT: Update an existing item by sending the item_id and update data in the request body
  const updateItem = async (
    item_id: string | number,
    updateData: Record<string, unknown>
  ) => {
    const headers = buildHeaders();
    // Combine the item_id with the update data into one payload object
    const payload = { item_id, ...updateData };
    const response = await api.put("/items/item", payload, { headers });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  // DELETE: Remove an item by item_id using the data field in the request config
  const deleteItem = async (item_id: string | number) => {
    const headers = buildHeaders();
    const response = await api.delete("/items/item", {
      headers,
      data: { item_id },
    });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  const transfer = async (
    item_id1: string | number,
    item_id2: string | number,
    amount: string | number
  ) => {
    const headers = buildHeaders();
    // Combine the item_id with the update data into one payload object
    const payload = { item_id1, item_id2, amount };
    const response = await api.put("/items/transfer", payload, { headers });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  return { getItems, createItem, updateItem, deleteItem, transfer };
};
