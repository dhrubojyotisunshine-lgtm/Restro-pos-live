import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const AddCompany = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const [currencies, setCurrencies] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  
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

  // Fetch timezones
  const fetchTimezones = async () => {
    try {
      const response = await axios.get(
        "https://krayon.softwarestesting.co.in/api/timezone"
      );
      if (response.data && Array.isArray(response.data.data)) {
        setTimezones(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching timezones:", error);
    }
  };
  const [formData, setFormData] = useState({
    restaurant_name: "",
    invoice_logo: null,
    address: "",
    website: "",
    country: "",
    state: "",
    city: "",
    zipcode: "",
    date_format: "D/M/Y",
    time_zone: "Asia/Dhaka",
    status: "active",
    currency_symbol: "",
    currency_position: "",
    plan_id: "",
    admin_name: "",
    phone_number: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData({
      ...formData,
      [name]: type === "file" ? files[0] : value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      });
    }
  };
  
  // Validate a single field
  const validateField = (name, value) => {
    let error = "";
    
    if (!value || value === "") {
      error = `${name.replace(/_/g, " ")} is required`;
    }
    
    // Special validation for email
    if (name === "email" && value && !/\S+@\S+\.\S+/.test(value)) {
      error = "Please enter a valid email address";
    }
    
    // Special validation for phone
    if (name === "phone_number" && value && !/^\d{10,15}$/.test(value)) {
      error = "Please enter a valid phone number";
    }
    
    // Special validation for password
    if (name === "password" && value && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}/.test(value)) {
      error = "Password must contain uppercase, lowercase, number and special character";
    }
    
    return error;
  };
  
  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    const requiredFields = [
      "restaurant_name",
      "invoice_logo",
      "address",
      "country",
      "state",
      "city",
      "zipcode",
      "date_format",
      "time_zone",
      "currency_symbol",
      "currency_position",
      "plan_id",
      "admin_name",
      "phone_number",
      "email",
      "password",
    ];
    
    requiredFields.forEach(field => {
      const error = validateField(field, 
        field === "country" ? selectedCountry :
        field === "state" ? selectedState :
        field === "city" ? selectedCity :
        field === "time_zone" ? selectedTimezone :
        field === "currency_symbol" ? selectedCurrency :
        formData[field]
      );
      
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    
    // Validate confirm password
    if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  // show all packaegs
  const getallPackages = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/getallpackages`);
      setData(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };
 

 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    toast.error("Please fill all required fields correctly");
    return;
  }

  const completeFormData = {
    ...formData,
    country: selectedCountry,
    state: selectedState,
    city: selectedCity,
    time_zone: selectedTimezone,
    currency_symbol: selectedCurrency,
  };

  const formData1 = new FormData();
  for (const key in completeFormData) {
    formData1.append(key, completeFormData[key]);
  }

  try {
    const res = await axios.post(`${API_BASE_URL}/createcompany`, formData1, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.status === 201) {
      toast.success("The company has been added successfully.");

      setFormData({
        restaurant_name: "",
        invoice_logo: null,
        address: "",
        website: "",
        country: "",
        state: "",
        city: "",
        zipcode: "",
        date_format: "D/M/Y",
        time_zone: "",
        status: "active",
        currency_symbol: "",
        currency_position: "",
        plan_id: "",
        admin_name: "",
        phone_number: "",
        email: "",
        password: "",
      });

      setSelectedCountry("");
      setSelectedState("");
      setSelectedCity("");
      setSelectedCurrency("");
      setSelectedTimezone("");
      setConfirmPassword("");
      setErrors({});
        navigate("/companylist");
    }
  } catch (error) {
    if (error.response?.data?.warning) {
      toast.error(error.response.data.warning);
    } else {
      toast.error("An unexpected error occurred.");
    }
  }
};
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const handleCountryChange = (e) => {
    setSelectedCountry(e.target.value);
    if (errors.country) {
      setErrors({
        ...errors,
        country: ""
      });
    }
  };
  
  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    if (errors.state) {
      setErrors({
        ...errors,
        state: ""
      });
    }
  };
  
  const handleCityChange = (e) => {
    setSelectedCity(e.target.value);
    if (errors.city) {
      setErrors({
        ...errors,
        city: ""
      });
    }
  };
  
  const handleCurrencyChange = (e) => {
    setSelectedCurrency(e.target.value);
    if (errors.currency_symbol) {
      setErrors({
        ...errors,
        currency_symbol: ""
      });
    }
  };
  
  const handleTimezoneChange = (e) => {
    setSelectedTimezone(e.target.value);
    if (errors.time_zone) {
      setErrors({
        ...errors,
        time_zone: ""
      });
    }
  };

  useEffect(() => {
    axios
      .get("https://krayon.softwarestesting.co.in/api/countries1")
      .then((res) => setCountries(res.data.data))
      .catch((err) => console.error("Error fetching countries:", err));
  }, []);

  // Fetch states when a country is selected
  useEffect(() => {
    if (selectedCountry) {
      axios
        .get(`https://krayon.softwarestesting.co.in/api/states1/${selectedCountry}`)
        .then((res) => setStates(res.data.data))
        .catch((err) => console.error("Error fetching states:", err));
    } else {
      setStates([]);
      setCities([]);
      setSelectedState("");
      setSelectedCity("");
    }
  }, [selectedCountry]);
  useEffect(() => {
    if (selectedState) {
      axios
        .get(`https://krayon.softwarestesting.co.in/api/cities1/${selectedState}`)
        .then((res) => setCities(res.data.data))
        .catch((err) => console.error("Error fetching cities:", err));
    } else {
      setCities([]);
      setSelectedCity("");
    }
  }, [selectedState]);
  useEffect(() => {
    getallPackages();
    fetchCurrencies();
    fetchTimezones();
  }, []);

  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />

        <div className=" w-full">
          <div className="flex-1 p-6">
            <h1 className="text-2xl font-bold mb-4">Add Company / Business</h1>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-white rounded-md shadow-md"
            >
              {/* Company Info */}
              <div className="col-span-full">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Company Information
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  onChange={handleChange}
                  value={formData.restaurant_name}
                  name="restaurant_name"
                  type="text"
                  placeholder="Company Name"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.restaurant_name ? 'border-red-500' : ''}`}
                />
                {errors.restaurant_name && <p className="text-red-500 text-xs mt-1">{errors.restaurant_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Business Logo*
                </label>
                <input
                  onChange={handleChange}
                  name="invoice_logo"
                  type="file"
                  accept="image/*"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.invoice_logo ? 'border-red-500' : ''}`}
                />
                {errors.invoice_logo && <p className="text-red-500 text-xs mt-1">{errors.invoice_logo}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Currency Symbol *
                </label>
                <select
                  value={selectedCurrency}
                  onChange={handleCurrencyChange}
                  name="currency_symbol"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.currency_symbol ? 'border-red-500' : ''}`}
                >
                  <option value="">-- Select Currency --</option>
                  {currencies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.currency_code} - {item.symbol}
                    </option>
                  ))}
                </select>
                {errors.currency_symbol && <p className="text-red-500 text-xs mt-1">{errors.currency_symbol}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Website
                </label>
                <input
                  onChange={handleChange}
                  value={formData.website}
                  name="website"
                  type="text"
                  placeholder="Website"
                  className="mt-1 w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date Format *
                </label>
                <select
                  onChange={handleChange}
                  value={formData.date_format}
                  name="date_format"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.date_format ? 'border-red-500' : ''}`}
                >
                  <option value={"D/M/Y"}>D/M/Y</option>
                  <option value={"M/D/Y"}>M/D/Y</option>
                  <option value={"Y/M/D"}>Y/M/D</option>
                </select>
                {errors.date_format && <p className="text-red-500 text-xs mt-1">{errors.date_format}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Time Zone *
                </label>
                <select
                  value={selectedTimezone}
                  onChange={handleTimezoneChange}
                  name="time_zone"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.time_zone ? 'border-red-500' : ''}`}
                >
                  <option value="">-- Select Timezone --</option>
                  {timezones.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.timezone_name}
                    </option>
                  ))}
                </select>
                {errors.time_zone && <p className="text-red-500 text-xs mt-1">{errors.time_zone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status *
                </label>
                <select
                  onChange={handleChange}
                  value={formData.status}
                  name="status"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.status ? 'border-red-500' : ''}`}
                >
                    <option value="">Select Option</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Country *</label>
                <select
                  className={`w-full border px-3 py-2 rounded ${errors.country ? 'border-red-500' : ''}`}
                  value={selectedCountry}
                  onChange={handleCountryChange}
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">State *</label>
                <select
                  className={`w-full border px-3 py-2 rounded ${errors.state ? 'border-red-500' : ''}`}
                  value={selectedState}
                  onChange={handleStateChange}
                  disabled={!states.length}
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
              </div>
              {/* City Select */}
              <div className="mb-4">
                <label className="block mb-1 font-medium">City *</label>
                <select
                  className={`w-full border px-3 py-2 rounded ${errors.city ? 'border-red-500' : ''}`}
                  value={selectedCity}
                  onChange={handleCityChange}
                  disabled={!cities.length}
                >
                  <option value="">Select City</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Zipcode*
                </label>
                <input
                  onChange={handleChange}
                  value={formData.zipcode}
                  name="zipcode"
                  type="number"
                  placeholder="Zipcode"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.zipcode ? 'border-red-500' : ''}`}
                />
                {errors.zipcode && <p className="text-red-500 text-xs mt-1">{errors.zipcode}</p>}
              </div>

              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700">
                  Address*
                </label>
                <textarea
                  onChange={handleChange}
                  value={formData.address}
                  name="address"
                  rows="2"
                  placeholder="Address"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.address ? 'border-red-500' : ''}`}
                ></textarea>
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Currency Position *
                </label>
                <select
                  onChange={handleChange}
                  value={formData.currency_position}
                  name="currency_position"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.currency_position ? 'border-red-500' : ''}`}
                >
                  <option value={""}>-Select-</option>
                  <option value={"Before Amount"}>Before Amount</option>
                  <option value={"After Amount"}>After Amount</option>
                </select>
                {errors.currency_position && <p className="text-red-500 text-xs mt-1">{errors.currency_position}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pricing Plan *
                </label>
                <select
                  onChange={handleChange}
                  value={formData.plan_id}
                  name="plan_id"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.plan_id ? 'border-red-500' : ''}`}
                >
                  <option value="">Select</option>
                  {data.map((plan, index) => (
                    <option key={index} value={plan.plan_id}>
                      {plan.package_name}
                    </option>
                  ))}
                </select>
                {errors.plan_id && <p className="text-red-500 text-xs mt-1">{errors.plan_id}</p>}
              </div>

              {/* Admin Section */}
              <div className="col-span-full mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Admin Access
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Admin Name *
                </label>
                <input
                  onChange={handleChange}
                  value={formData.admin_name}
                  name="admin_name"
                  type="text"
                  placeholder="Admin Name"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.admin_name ? 'border-red-500' : ''}`}
                />
                {errors.admin_name && <p className="text-red-500 text-xs mt-1">{errors.admin_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                {/* <input
                  onChange={handleChange}
                  value={formData.phone_number}
                  name="phone_number"
                  type="tel"
                  pattern="[0-9]{10,15}"
                  maxLength={10}
                  placeholder="Phone"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.phone_number ? 'border-red-500' : ''}`}
                />
                {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Enter 10 digit phone number
                </p> */}
                <input
  onChange={(e) => {
    // allow only numbers
    const value = e.target.value.replace(/[^0-9]/g, "");
    handleChange({ target: { name: "phone_number", value } });
  }}
  value={formData.phone_number}
  name="phone_number"
  type="tel"
  maxLength={10}
  placeholder="Phone"
  className={`mt-1 w-full border rounded-md px-3 py-2 ${
    errors.phone_number ? "border-red-500" : ""
  }`}
/>
{errors.phone_number && (
  <p className="text-red-500 text-xs mt-1">{errors.phone_number}</p>
)}
<p className="text-xs text-gray-500 mt-1">Enter 10 digit phone number</p>

              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  onChange={handleChange}
                  value={formData.email}
                  name="email"
                  type="email"
                  placeholder="Email"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Enter a valid email (e.g., user@example.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  onChange={handleChange}
                  value={formData.password}
                  name="password"
                  type="password"
                  placeholder="Password"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters with uppercase, lowercase, number &
                  special character.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <input
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors({
                        ...errors,
                        confirmPassword: ""
                      });
                    }
                  }}
                  value={confirmPassword}
                  type="password"
                  placeholder="Confirm Password"
                  className={`mt-1 w-full border rounded-md px-3 py-2 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Buttons */}
              <div className="col-span-full flex gap-4 mt-6">
                <button
                  type="submit"
                  className="bg-[#1C1D3E] hover:bg-[#3c3e79] text-white px-6 py-2 rounded-md"
                >
                  Submit
                </button>
                <button
                  type="button"
                  className="bg-[#1C1D3E] hover:bg-[#3c3e79] text-white px-6 py-2 rounded-md"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddCompany;