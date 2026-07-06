const ProtectedSuperAdminRoute = ({ children }) => {
  const isSuperAdmin = localStorage.getItem("superAdmin") === "true";
  const token = localStorage.getItem("token");

  if (!token || !isSuperAdmin) {
    window.location.href = import.meta.env.VITE_LOGIN_URL || '/login/';
    return null;
  }

  return children;
};

export default ProtectedSuperAdminRoute;