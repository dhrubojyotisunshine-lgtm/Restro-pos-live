const ProtectedSuperAdminRoute = ({ children }) => {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');

  if (urlToken) {
    localStorage.setItem('token', urlToken);
    localStorage.setItem('superAdmin', params.get('superAdmin') || 'true');
    localStorage.setItem('username', decodeURIComponent(params.get('username') || ''));
    localStorage.setItem('userId', params.get('userId') || '');
    window.history.replaceState({}, '', window.location.pathname);
  }

  const isSuperAdmin = localStorage.getItem("superAdmin") === "true";
  const token = localStorage.getItem("token");

  if (!token || !isSuperAdmin) {
    window.location.href = import.meta.env.VITE_LOGIN_URL || '/login/';
    return null;
  }

  return children;
};

export default ProtectedSuperAdminRoute;