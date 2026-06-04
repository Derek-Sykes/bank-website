import { useContext } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const useAccountsApi = () => {
  const auth = useContext(AuthContext);

  const buildHeaders = () => {
    const headers: Record<string, string> = {};
    if (auth?.accessToken) {
      headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    return headers;
  };

  const getAccount = async () => {
    const response = await api.get("/accounts/account", {
      headers: buildHeaders(),
    });
    if (response.data?.accessToken) {
      auth?.updateAccessTokenMem(response.data.accessToken);
    }
    return response;
  };

  return { getAccount };
};
