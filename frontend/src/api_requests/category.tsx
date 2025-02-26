import { useContext } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const useCategoryApi = () => {
  const auth = useContext(AuthContext);

  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    if (auth?.accessToken) {
      headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    return headers;
  };

  // GET: Retrieve categories (using a data field)
  const getCategories = async (data: Record<string, any> = {}) => {
    const headers = buildHeaders();
    const response = await api.request({
      url: "/categorys/category",
      method: "GET",
      headers,
      data,
    });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  // POST: Create a new category
  const createCategory = async (categoryData: Record<string, any>) => {
    const headers = buildHeaders();
    const response = await api.post("/categorys/category", categoryData, {
      headers,
    });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  // PUT: Update a category (sending category_id in the request body)
  const updateCategory = async (
    category_id: string | number,
    updateData: Record<string, any>
  ) => {
    const headers = buildHeaders();
    const payload = { category_id, ...updateData };
    const response = await api.put("/categorys/category", payload, { headers });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  // DELETE: Remove a category
  const deleteCategory = async (
    category_id: string | number,
    options?: Record<string, any>
  ) => {
    const headers = buildHeaders();
    const data = { category_id, ...options };
    const response = await api.delete("/categorys/category", {
      headers,
      data,
    });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  return { getCategories, createCategory, updateCategory, deleteCategory };
};
