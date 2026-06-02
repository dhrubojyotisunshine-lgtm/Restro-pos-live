import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import axios from "axios";

const CreatePackages = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [currencies, setCurrencies] = useState([]);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    package_name: "",
    price_interval: "",
    price: "",
    number_of_active_users: "",
    interval_value: "",
    package_description: "",
    number_of_invoice: "",
    status: "active",
    trial_days: "",
    currency: "",
  });

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(
        "https://krayon.softwarestesting.co.in/api/symbol"
      );
      if (response.data && Array.isArray(response.data.data)) {
        setCurrencies(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching currencies:", error);
    }
  };

  const handelChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({...errors, [name]: ""});
    }
  };

  const handleCurrencyChange = (e) => {
    const value = e.target.value;
    setSelectedCurrency(value);
    setFormData({ ...formData, currency: value });
    
    // Clear error when user selects a currency
    if (errors.currency) {
      setErrors({...errors, currency: ""});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let newErrors = {};

    if (!formData.package_name) newErrors.package_name = "Package name is required.";
    if (!formData.number_of_active_users) newErrors.number_of_active_users = "Number of active users is required.";
    if (!formData.number_of_invoice) newErrors.number_of_invoice = "Number of invoices is required.";
    if (!formData.price_interval) newErrors.price_interval = "Price interval is required.";
    if (!formData.interval_value) newErrors.interval_value = "Interval value is required.";
    if (!formData.price) newErrors.price = "Package price is required.";
    if (!formData.currency) newErrors.currency = "Currency is required.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return; // stop if errors exist

    try {
      const response = await axios.post(`${API_BASE_URL}/createpackages`, formData);

      if (response.status === 201) {
        toast.success("Package saved successfully!");
        setFormData({
          package_name: "",
          price_interval: "",
          price: "",
          number_of_active_users: "",
          interval_value: "",
          package_description: "",
          number_of_invoice: "",
          status: "active",
          trial_days: "",
          currency: "",
        });
        setSelectedCurrency(""); // Reset selected currency too
        setErrors({}); // Clear all errors
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit data.");
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />
        <div className="w-full">
          <div className="flex-1 p-6">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-xl shadow-md border p-6 w-full mx-auto space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
                Create Packages
              </h2>

              {/* Subscription Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Package Name *
                  </label>
                  <input
                    onChange={handelChange}
                    value={formData.package_name}
                    type="text"
                    name="package_name"
                    placeholder="Enter Package name"
                    className={`w-full border ${errors.package_name ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.package_name && <p className="text-red-500 text-xs mt-1">{errors.package_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Package Description
                  </label>
                  <textarea
                    onChange={handelChange}
                    value={formData.package_description}
                    name="package_description"
                    rows="1"
                    placeholder="Enter description"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of Active users*
                  </label>
                  <input
                    onChange={handelChange}
                    value={formData.number_of_active_users}
                    type="number"
                    name="number_of_active_users"
                    placeholder="Enter number of user"
                    className={`w-full border ${errors.number_of_active_users ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.number_of_active_users && <p className="text-red-500 text-xs mt-1">{errors.number_of_active_users}</p>}
                  <h1 className="font-light">0 = infinite</h1>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of invoice*
                  </label>
                  <input
                    onChange={handelChange}
                    value={formData.number_of_invoice}
                    type="number"
                    placeholder="Number of invoice can generate "
                    name="number_of_invoice"
                    className={`w-full border ${errors.number_of_invoice ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.number_of_invoice && <p className="text-red-500 text-xs mt-1">{errors.number_of_invoice}</p>}
                  <h1 className="font-light">0 = infinite</h1>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price Interval *
                  </label>
                  <select
                    onChange={handelChange}
                    value={formData.price_interval}
                    name="price_interval"
                    className={`w-full border ${errors.price_interval ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option value="">Select Interval</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                  {errors.price_interval && <p className="text-red-500 text-xs mt-1">{errors.price_interval}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Interval Value*
                  </label>
                  <input
                    onChange={handelChange}
                    value={formData.interval_value}
                    type="number"
                    name="interval_value"
                    placeholder="e.g. 1"
                    className={`w-full border ${errors.interval_value ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.interval_value && <p className="text-red-500 text-xs mt-1">{errors.interval_value}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price*
                  </label>
                  <input
                    onChange={handelChange}
                    value={formData.price}
                    type="number"
                    name="price"
                    placeholder="0.00"
                    className={`w-full border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                  <h1 className="font-light">0 = Free Package</h1>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Currency*
                  </label>
                 <select
                  value={selectedCurrency}
                  onChange={handleCurrencyChange}
                  name="currency"
                  className={`mt-1 w-full border ${errors.currency ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2`}
                >
                  <option value="">-- Select Currency --</option>
                  {currencies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.currency_code} - {item.symbol}
                    </option>
                  ))}
                </select>
                {errors.currency && <p className="text-red-500 text-xs mt-1">{errors.currency}</p>}
                </div>
              </div>

              {/* Users Staff */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trail Days
                  </label>
                  <input
                    onChange={handelChange}
                    value={formData.trial_days}
                    type="number"
                    name="trial_days"
                    placeholder="e.g. 1"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    onChange={handelChange}
                    value={formData.status}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-[#1C1D3E] text-white py-2 rounded hover:bg-[#2a2b4f] transition"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatePackages;