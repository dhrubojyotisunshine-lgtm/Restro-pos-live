import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import fallback from "../assets/Group 206124.png";
const Login = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const [email, setEmail] = useState(() => localStorage.getItem("remembered_email") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("remembered_email"));
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [data, setData] = useState([]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email,
        password,
      });

      const {
        token,
        username,
        userId,
        permData,
        isAdmin,
        planData,
        superAdmin,
        websitelink,
      } = response.data;
      console.log("data log in aaya h ", response.data);

      localStorage.setItem("permissions", JSON.stringify(permData));
      localStorage.setItem("planData", JSON.stringify(planData));
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      localStorage.setItem("userId", userId);
      localStorage.setItem("isAdmin", isAdmin);
      localStorage.setItem("superAdmin", superAdmin);

      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
      } else {
        localStorage.removeItem("remembered_email");
      }
      if (websitelink) {
        localStorage.setItem("websitelink", websitelink); // ✅ Save website link
      }

      toast.success(`Log-In successful, Welcome ${username}!`);

      if (superAdmin && websitelink) {
        window.location.href = `${websitelink}?token=${token}&superAdmin=true&username=${encodeURIComponent(username)}&userId=${userId}`;
      } else {
        window.location.href = APP_URL;
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Invalid Username or Password"
      );
      setError(error.response?.data?.error || "Login failed");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

 
  const fetchImageData = () => {
    axios
      .get(`${API_BASE_URL}/websetting`)
      .then((response) => {
        console.log("previwe", response);
        setData(response.data.data);
      })
      .catch((error) => {
        console.error("Error fetching image data:", error);
      });
  };

  useEffect(() => {
    fetchImageData();
  }, []);
  const logoUrl = data.length > 0 ? `${VITE_IMG_URL}${data[0].logo}` : fallback;
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Login Form */}
      <div className="w-2/5 flex flex-col justify-center items-center bg-white p-10 shadow-lg">
        <img
          src={logoUrl}
          alt="Smart Order POS"
          className="mb-6 w-[350px] h-[200px]"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallback;
          }}
        />
        <h2 className="text-2xl font-bold mb-4 text-[#1C1D3E]">
          Welcome Back!{" "}
          <span className="text-xl text-[#1C1D3E]">Smart Order</span>{" "}
          <span className="text-[#4CBBA1]"> POS</span>
        </h2>
        <h2 className="text-2xl mb-3 font-semibold text-[#1C1D3E]">LogIn</h2>
        <div className="w-full max-w-sm">
          <label className="block text-gray-700 font-bold">Enter Email</label>
          <input
            type="email"
            className="w-full p-3 border rounded mt-1 bg-[#1C1D3E] text-white font-semibold"
            placeholder="user@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <label className="block text-gray-700 mt-4 font-bold">
            Enter Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full p-3 border rounded mt-1 pr-10 bg-[#1C1D3E] text-white font-semibold"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleLogin()}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-4 text-gray-500"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              className="mr-2 custom-checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />{" "}
            <span>Remember me</span>
          </div>
          <button
            className="w-full bg-[#4CBBA1] text-white p-3 rounded mt-6 hover:bg-[#2a7765] transition"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? "Logging In..." : "Login"}
          </button>
          {error && <p className="text-red-600 mt-2 text-center">{error}</p>}
        </div>
      </div>
      {/* Right Side - Image */}
      <div
        className="w-3/5 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://www.gofrugal.com/sites/gweb/files/gofrugal/images/restaurant/qsr-macro/food-court-banner.webp')`,
        }}
      ></div>
    </div>
  );
};

export default Login;
