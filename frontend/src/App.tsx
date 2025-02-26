import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/Home";
import AboutPage from "./pages/About";
import CategoryPage from "./pages/CategoryPage";
import AccountsPage from "./pages/AccountsPage";

const App = () => {
  const auth = useContext(AuthContext);

  // ✅ If still loading user data, don't redirect yet
  if (auth?.loading) {
    return <p>Loading...</p>;
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={!auth?.user ? <AuthPage /> : <Navigate to="/home" />}
      />
      <Route
        path="/home"
        element={auth?.user ? <HomePage /> : <Navigate to="/auth" />}
      />
      <Route
        path="/about"
        element={auth?.user ? <AboutPage /> : <Navigate to="/auth" />}
      />
      <Route
        path="/category/:category"
        element={auth?.user ? <CategoryPage /> : <Navigate to="/auth" />}
      />
      <Route
        path="/accounts"
        element={auth?.user ? <AccountsPage /> : <Navigate to="/auth" />}
      />
      <Route
        path="*"
        element={<Navigate to={auth?.user ? "/home" : "/auth"} />}
      />{" "}
      {/* ✅ Default to home */}
    </Routes>
  );
};

export default App;
