import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import axios from "axios";

const BasicCompanySetting = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [currencies, setCurrencies] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  
  const [formData, setFormData] = useState({
    Company_name: "",
    logo: null,
    favicon: null,
    address: "",
    currency_symbol: "",
    currency_symbol_position: "before",
    country: "",
    state: "",
    city: "",
    time_zone: "",
    date_format: "DD/MM/YYYY HH:mm",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    }
  };

  useEffect(() => {
    axios
      .get("https://krayon.softwarestesting.co.in/api/countries1")
      .then((res) => setCountries(res.data.data || [])) // Ensure we always have an array
      .catch((err) => {
        console.error("Error fetching countries:", err);
        setCountries([]); // Set to empty array on error
      });
    // .get(`${API_BASE_URL}/symbol`)
    axios.get( "https://krayon.softwarestesting.co.in/api/symbol")
      .then((res) => setCurrencies(res.data.data || []))
      .catch((err) => {
        console.error("Error fetching currencies:", err);
        setCurrencies([]);
      });

    axios
      .get("https://krayon.softwarestesting.co.in/api/timezone")
      .then((res) => setTimezones(res.data.data || []))
      .catch((err) => {
        console.error("Error fetching timezones:", err);
        setTimezones([]);
      });
  }, [API_BASE_URL]);

  // Fetch states when country changes
  useEffect(() => {
    if (formData.country) {
      axios
        .get(`https://krayon.softwarestesting.co.in/api/states1/${formData.country}`)
        .then((res) => setStates(res.data.data || []))
        .catch((err) => {
          console.error("Error fetching states:", err);
          setStates([]);
        });
    } else {
      setStates([]);
      setCities([]);
      setFormData((prev) => ({ ...prev, state: "", city: "" }));
    }
  }, [formData.country]);

  // Fetch cities when state changes
  useEffect(() => {
    if (formData.state) {
      axios
        .get(`https://krayon.softwarestesting.co.in/api/cities1/${formData.state}`)
        .then((res) => setCities(res.data.data || []))
        .catch((err) => {
          console.error("Error fetching cities:", err);
          setCities([]);
        });
    } else {
      setCities([]);
      setFormData((prev) => ({ ...prev, city: "" }));
    }
  }, [formData.state]);

  // Submit handler with validation
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.Company_name.trim()) return toast.error("Company Name is required.");
    if (!formData.currency_symbol) return toast.error("Please select a currency symbol.");
    if (!formData.country) return toast.error("Please select a country.");
    if (!formData.state) return toast.error("Please select a state.");
    if (!formData.city) return toast.error("Please select a city.");
    if (!formData.address.trim()) return toast.error("Address is required.");
    if (!formData.time_zone) return toast.error("Please select a timezone.");

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value || "");
      });
      const id=1;

      const res = await axios.put(
        `${API_BASE_URL}/adminsettings/${id}`,
        payload,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.status === 200) {
        toast.success("Company details updated successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update company details.");
    }
  };

  const getHomeData = async () => {
    const id = 1;
    try {
      const response = await axios.get(
        `${API_BASE_URL}/adminsettings/${id}`
      );
      const data = response.data.data;
      console.log(data);
      
      setFormData({
        Company_name: data.Company_name || "",
        logo: data.logo || null,
        favicon: data.favicon || null,
        address: data.address || "",
        currency_symbol: data.Currency_Selection || "",
        currency_symbol_position: data.currency_symbol_position || "before",
        country: data.country || "",
        state: data.state || "",
        city: data.city || "",
        time_zone: data.time_zone || "",
        date_format: data.date_format || "DD/MM/YYYY HH:mm",
      });
      console.log(formData,"form")
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getHomeData();
  }, []);

  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />

        <div className=" w-full">
          <div className="flex-1 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Super Admin Settings
            </h2>

            <div className="max-w-auto mx-auto bg-white shadow-md rounded-lg p-6 mt-8">
              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="Company_name"
                    placeholder="Company Name"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    value={formData.Company_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Logo
                  </label>
                  <input
                    type="file"
                    name="logo"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </div>

                {/* Favicon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Favicon
                  </label>
                  <input
                    type="file"
                    name="favicon"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </div>

                {/* Currency Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Currency Symbol *
                  </label>
                  <select
                    value={formData.currency_symbol}
                    onChange={handleChange}
                    name="currency_symbol"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                  >
                    <option value="">-- Select Currency --</option>
                    {currencies && currencies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.currency_code} - {item.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Currency Symbol Placement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Currency Symbol Placement
                  </label>
                  <select
                    name="currency_symbol_position"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    value={formData.currency_symbol_position}
                    onChange={handleChange}
                  >
                    <option value="">-Select-</option>
                    <option value="before">Before Amount (e.g., ₹100)</option>
                    <option value="after">After Amount (e.g., 100₹)</option>
                  </select>
                </div>

                {/* Country */}
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Country</label>
                  <select
                    className="w-full border px-3 py-2 rounded"
                    value={formData.country}
                    onChange={handleChange}
                    name="country"
                  >
                    <option value="">Select Country</option>
                    {countries && countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div className="mb-4">
                  <label className="block mb-1 font-medium">State</label>
                  <select
                    className="w-full border px-3 py-2 rounded"
                    value={formData.state}
                    onChange={handleChange}
                    name="state"
                    disabled={!states.length}
                  >
                    <option value="">Select State</option>
                    {states && states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div className="mb-4">
                  <label className="block mb-1 font-medium">City</label>
                  <select
                    className="w-full border px-3 py-2 rounded"
                    value={formData.city}
                    onChange={handleChange}
                    name="city"
                    disabled={!cities.length}
                  >
                    <option value="">Select City</option>
                    {cities && cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    placeholder="Company Address"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    rows={3}
                    value={formData.address}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Time Zone *
                  </label>
                  <select
                    value={formData.time_zone}
                    onChange={handleChange}
                    name="time_zone"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                  >
                    <option value="">-- Select Timezone --</option>
                    {timezones && timezones.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.timezone_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date & Time Format
                  </label>
                  <select
                    name="date_format"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    value={formData.date_format}
                    onChange={handleChange}
                  >
                    <option value="">--Select--</option>
                    <option value="DD/MM/YYYY HH:mm">DD/MM/YYYY HH:mm</option>
                    <option value="MM/DD/YYYY hh:mm A">
                      MM/DD/YYYY hh:mm A
                    </option>
                    <option value="YYYY-MM-DD HH:mm:ss">
                      YYYY-MM-DD HH:mm:ss
                    </option>
                  </select>
                </div>

                {/* Submit */}
                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                  <button
                    type="submit"
                    className="bg-[#1C1D3E] hover:bg-[#353779] text-white px-6 py-2 rounded-md"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BasicCompanySetting;