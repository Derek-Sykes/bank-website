import axios from "axios";

// Backend base URL (Update this if your backend is running on a different address)
const API_BASE_URL = "http://localhost:3000";

// Create an Axios instance with cookies enabled
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // This ensures cookies (JWT) are sent with requests
});

// Register a new user
export const registerUser = async (
  email: string,
  password: string,
  f_name: string,
  l_name: string
) => {
  return api.post("/users/register", {
    user: { email, password, f_name, l_name },
  });
};

// Login a user
export const loginUser = async (email: string, password: string) => {
  return api.post("/users/login", { user: { email, password } });
};

// Logout user
export const logoutUser = async () => {
  return api.post("/users/logout");
};

// Fetch current user session (to check if logged in)
export const getUserSession = async () => {
  return api.get("/users/session"); // New session-checking route
};

export default api;
