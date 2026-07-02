import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";
import { Bell, User, LogOut } from "lucide-react";
import { FaSignInAlt } from "react-icons/fa";
import { FaUsers, FaBoxOpen, FaExchangeAlt, FaWallet } from "react-icons/fa";
const headers = [
  "SL.",
  "Company Name ",
  "Phone",
  "Address",
  "Current Plan",
  "Owner Name",
  "Email",
  "Status",
];
const Dashboard = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token");
  const [data, setData] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const getCompany = async () => {
    const response = await axios.get(`${API_BASE_URL}/getcompany`, { headers: { Authorization: token } });
    if (response.status === 200) {
      setData(response.data.data);
    }
  };
  const getallPackages = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/getallpackages`, { headers: { Authorization: token } });
      setPlans(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "https://krayon.softwarestesting.co.in/login/";
  };

  useEffect(() => {
    getCompany();
    getallPackages();
  }, []);
  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />
        <div className="w-full">
          <div className="flex-1 p-6">
            <div className="px-6 py-4 bg-gray-50 min-h-[80px] flex items-center justify-between shadow-sm">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

              <div className="flex items-center space-x-6 bg-white px-4 py-2 rounded-md shadow-md">
                {/* Notification Icon */}
                <div className="relative cursor-pointer">
                  <Bell className="w-6 h-6 text-gray-600 hover:text-blue-600" />
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
                    3
                  </span>
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <div
                    className="cursor-pointer flex items-center space-x-2 hover:text-blue-600"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <User className="w-6 h-6 text-gray-700" />
                    <span className="text-sm font-medium text-gray-700">
                      Profile
                    </span>
                  </div>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4">
              {/* Total Users */}
              <div className="bg-teal-50 rounded-2xl shadow-md p-5 flex items-center space-x-5 border border-teal-100 hover:shadow-lg transition duration-300">
                <div className="bg-gradient-to-br from-teal-200 to-teal-300 p-3 rounded-xl">
                  <FaUsers className="text-teal-700 size-8" />
                </div>
                <div>
                  <p className="text-teal-700 text-sm font-medium">
                    Total company
                  </p>
                  <p className="text-2xl font-bold text-teal-900">
                    {data.length}
                  </p>
                </div>
              </div>

              {/* Total Packages */}
              <div className="bg-yellow-50 rounded-2xl shadow-md p-5 flex items-center space-x-5 border border-yellow-100 hover:shadow-lg transition duration-300">
                <div className="bg-gradient-to-br from-yellow-200 to-yellow-300 p-3 rounded-xl">
                  <FaBoxOpen className="text-yellow-700 size-8" />
                </div>
                <div>
                  <p className="text-yellow-700 text-sm font-medium">
                    Total Packages
                  </p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {plans.length}
                  </p>
                </div>
              </div>

              {/* Total Transaction */}
              <div className="bg-blue-50 rounded-2xl shadow-md p-5 flex items-center space-x-5 border border-blue-100 hover:shadow-lg transition duration-300">
                <div className="bg-gradient-to-br from-blue-200 to-blue-300 p-3 rounded-xl">
                  <FaExchangeAlt className="text-blue-700 size-8" />
                </div>
                <div>
                  <p className="text-blue-700 text-sm font-medium">
                    Total Transaction
                  </p>
                  <p className="text-2xl font-bold text-blue-900">5</p>
                </div>
              </div>

              {/* Total Income */}
              <div className="bg-red-50 rounded-2xl shadow-md p-5 flex items-center space-x-5 border border-red-100 hover:shadow-lg transition duration-300">
                <div className="bg-gradient-to-br from-red-200 to-red-300 p-3 rounded-xl">
                  <FaWallet className="text-red-700 size-8" />
                </div>
                <div>
                  <p className="text-red-700 text-sm font-medium">
                    Total Income
                  </p>
                  <p className="text-2xl font-bold text-red-900">$3,700</p>
                </div>
              </div>
            </div>

            <section className="tabledata p-2">
              <div className="w-full mt-10 drop-shadow-md">
                <div className="overflow-x-auto rounded-lg shadow-md">
                  <table className="min-w-full bg-white text-center">
                    <thead className="bg-[#4CBBA1] text-white text-sm uppercase">
                      <tr>
                        {headers.map((header, index) => (
                          <th
                            key={index}
                            className="py-4 px-6 whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="text-gray-700">
                      {data.length > 0 ? (
                        data.map((row, index) => (
                          <tr
                            key={index}
                            className={
                              index % 2 === 0
                                ? "bg-gray-50 hover:bg-gray-100"
                                : "hover:bg-gray-100"
                            }
                          >
                            <td className="py-3 px-6 border border-gray-200 font-medium">
                              {index + 1}
                            </td>
                            <td className="py-3 px-6 border border-gray-200">
                              {row.restaurant_name}
                            </td>
                            <td className="py-3 px-6 border border-gray-200">
                              {row.phone_number}
                            </td>
                            <td className="py-3 px-6 border border-gray-200">
                              {row.address}
                            </td>
                            <td className="py-3 px-6 border border-gray-200">
                              {row.plan_name
                                ? row.plan_name
                                : "No current plan"}
                            </td>
                            <td className="py-3 px-6 border border-gray-200">
                              {row.admin_name}
                            </td>
                            <td className="py-3 px-6 border border-gray-200">
                              {row.email}
                            </td>
                            <td className="py-3 px-6 border border-gray-200">
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                  row.status?.toLowerCase() === "active"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={headers.length}
                            className="py-4 px-6 text-gray-500 text-center border border-gray-200"
                          >
                            No Company Found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          {/* Table */}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
