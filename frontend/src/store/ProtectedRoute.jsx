import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isLogin } = useContext(AuthContext);

  if (!isLogin) {
    window.location.href = import.meta.env.VITE_LOGIN_URL;
    return null;
  }

  return children;
};

export default ProtectedRoute;
