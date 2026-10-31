import React, {  createContext, useContext, useState, useCallback, useMemo, useEffect  } from "react";
// import jwtDecode from "jwt-decode"; // Ensure correct import
 import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import axios from "axios";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // Initialize state from localStorage
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [permissions, setPermissions] = useState(() => {
   try {
      const storedPermissions = localStorage.getItem("permissions");
      const isAdmin = localStorage.getItem("isAdmin") === "true";
      if (isAdmin) {
        return "admin";
      }
      return storedPermissions ? JSON.parse(storedPermissions) : [];
    } catch (error) {
      console.error("Failed to parse permissions:", error);
      return [];
    }
  });
  
  
  const [userId, setUserId] = useState(() => localStorage.getItem("userId"));
  const [username, setUsername] = useState(() => localStorage.getItem("username"));
  const [isAdmin, setIsAdmin] = useState(() =>
    JSON.parse(localStorage.getItem("isAdmin") || "false")
  );
 const clearAuthData = useCallback(() => {
  setToken(null);
  setPermissions([]);
  setUserId(null);
  setUsername(null);
  setIsAdmin(false);
  setPlanData(null);
  setSubFeaturePerms({});
  localStorage.clear();
}, []);
  // Derived state: isLogin
  const isLogin = useMemo(() => {
    if (!token) return false;
    try {
      const decodedToken = jwtDecode(token);
      return decodedToken.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }, [token]);

  // Logout user
  const logoutUser = useCallback(async () => {
    try {
      if (userId) {
        await axios.post(`${API_BASE_URL}/logout/${userId}`, {}, { headers: { Authorization: token } });
      }
      clearAuthData();
      toast.info("Logout successful!");
        window.location.href = import.meta.env.VITE_LOGIN_URL;
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed, please try again!");
    }
  }, [API_BASE_URL, userId, clearAuthData]);
  // Helper: Clear all localStorage and state
  const [planData, setPlanData] = useState(() => {
    try {
      const storedPlanData = localStorage.getItem("planData");
      return storedPlanData ? JSON.parse(storedPlanData) : null;
    } catch (error) {
      console.error("Failed to parse planData:", error);
      return null;
    }
  });

  // Store token and user details in localStorage
  const storeToken = useCallback(
    (serverToken, permData, username, userId, isAdmin,planData) => {
      try {
      const decodedToken = jwtDecode(serverToken);
      const expirationTime = decodedToken.exp * 1000;
      const timeoutDuration = expirationTime - Date.now();

      // Store data in localStorage
      localStorage.setItem("token", serverToken);
      localStorage.setItem("permissions", JSON.stringify(permData));
      localStorage.setItem("userId", userId);
      localStorage.setItem("username", username);
      localStorage.setItem("isAdmin", JSON.stringify(isAdmin));
      localStorage.setItem("planData", JSON.stringify(planData)); // Add this line

      // Update state
      setToken(serverToken);
      setPermissions(permData);
      setUserId(userId);
      setUsername(username);
      setIsAdmin(isAdmin);
      setPlanData(planData); // Add this line

      // Set timeout for token expiry
      if (timeoutDuration > 0) {
        setTimeout(() => logoutUser(), timeoutDuration);
      } else {
        logoutUser();
      }
    } catch (err) {
      console.error("Error decoding token:", err);
      logoutUser();
    }
    },
    [logoutUser]
  );

  

  const [subFeaturePerms, setSubFeaturePerms] = useState({});

  // Fetch sub-feature permissions whenever token changes (login/refresh)
  useEffect(() => {
    if (token) {
      axios
        .get(`${API_BASE_URL}/module-allocation/my-sub-features`, {
          headers: { Authorization: token },
        })
        .then((res) => {
          if (res.data?.success) setSubFeaturePerms(res.data.data || {});
        })
        .catch(() => setSubFeaturePerms({}));
    }
  }, [token]);

  // Returns true if the action is allowed for this sub-feature.
  // Defaults to true when no permission record exists (safe default = show everything).
  const canDo = useCallback(
    (subFeatureKey, action) => {
      if (!subFeaturePerms || !subFeaturePerms[subFeatureKey]) return true;
      return !!subFeaturePerms[subFeatureKey][action];
    },
    [subFeaturePerms]
  );

  // Check and refresh state on component mount
  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const isTokenValid = decodedToken.exp * 1000 > Date.now();
        if (!isTokenValid) {
          logoutUser();
        }
      } catch {
        logoutUser();
      }
    }
  }, [token, logoutUser]);

  return (
    <AuthContext.Provider value={{
      token,
      permissions,
      userId,
      username,
      isAdmin,
      planData,
      subFeaturePerms,
      canDo,
      storeToken,
      logoutUser,
      isLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };



