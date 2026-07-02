import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./store/AuthContext.jsx";
import axios from "axios";

const Main = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL= import.meta.env.VITE_IMG_URL;
  useEffect(() => {
    // Read token from URL params (for cross-port local dev)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    if (urlToken) {
      localStorage.setItem("token", urlToken);
      localStorage.setItem("userId", urlParams.get("userId") || "");
      localStorage.setItem("username", urlParams.get("username") || "");
      localStorage.setItem("isAdmin", urlParams.get("isAdmin") || "");
      localStorage.setItem("superAdmin", urlParams.get("superAdmin") || "");
      localStorage.setItem("planData", urlParams.get("planData") || "");
      localStorage.setItem("permissions", urlParams.get("permData") || "");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const fetchFavicon = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await axios.get(`${API_BASE_URL}/websetting`, { headers: { Authorization: token } });
        const data = await response.data.data;
        const logoUrls = data?.map((val) => `${VITE_IMG_URL}${val.fevicon}`) || [];
        const link =
          document.querySelector("link[rel*='icon']") ||
          document.createElement("link");
        link.type = "image/svg+xml";
        link.rel = "icon";
        link.href = logoUrls;
        document.head.appendChild(link);
      } catch (error) {
        console.error("Error fetching favicon:", error);
      }
    };

    fetchFavicon();
  }, []);

  return (
    <>
      <App  />
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider >
    <AuthProvider>
      <React.StrictMode>
        <Main />
      </React.StrictMode>
    </AuthProvider>
  </AuthProvider>
);
