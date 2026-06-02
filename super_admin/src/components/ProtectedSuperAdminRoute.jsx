import { Navigate } from "react-router-dom";

const ProtectedSuperAdminRoute = ({ children }) => {
  const isSuperAdmin = localStorage.getItem("superAdmin") === "true";
  const token = localStorage.getItem("token");

  return children;
};

export default ProtectedSuperAdminRoute;