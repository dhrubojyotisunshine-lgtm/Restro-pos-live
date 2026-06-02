import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Tooltip from "../components/Tooltip";
import { FaRegEdit } from "react-icons/fa";
import { FaRegTrashCan } from "react-icons/fa6";
import { MdBlockFlipped } from "react-icons/md";
import { FaSearch } from "react-icons/fa";
import DeleteDialogBox from "../components/DeleteDialogBox";
import Deactivate from "../components/Deactivate";
import { FaSignInAlt } from "react-icons/fa";
import axios from "axios";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { FiCheckCircle } from "react-icons/fi";
import Activate from "../components/Activate";
import { MdManageAccounts } from "react-icons/md";
import { MdAddToPhotos } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const headers = [
  "SL.",
  "Business Name ",
  "Phone",
  "Address",
  "Start Date",
  "End Date",
  "Current Package",
  "Owner Name",
  "Email",
  "Status",
  "Action",
];

const CompanyList = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token");
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const [data, setData] = useState([]);
  const [data2, setData2] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showModal1, setShowModal1] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [deleteModalId1, setDeleteModalId1] = useState(null);
  const [deleteModalId2, setDeleteModalId2] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  // Dropdown states
  const [currencies, setCurrencies] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const [formData, setFormData] = useState({
    restaurant_name: "",
    invoice_logo: null,
    address: "",
    website: "",
    country: "",
    state: "",
    city: "",
    zipcode: "",
    date_format: "",
    time_zone: "",
    status: "",
    currency_symbol: "",
    currency_position: "",
    plan_id: "",
    admin_name: "",
    phone_number: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.restaurant_name)
      newErrors.restaurant_name = "Company name is required";
    if (!selectedCurrency)
      newErrors.currency_symbol = "Currency symbol is required";
    if (!formData.date_format)
      newErrors.date_format = "Date format is required";
    if (!selectedTimezone) newErrors.time_zone = "Time zone is required";
    if (!formData.zipcode) newErrors.zipcode = "Zipcode is required";
    if (!formData.address) newErrors.address = "Address is required";
    // if (!formData.password) newErrors.password = "Password is required";

    if (
      formData.password &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(
        formData.password
      )
    ) {
      newErrors.password =
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
    }
    if (!formData.status) newErrors.status = "Status is required";
    if (!formData.currency_position)
      newErrors.currency_position = "Currency position is required";
    if (!formData.plan_id) newErrors.plan_id = "Pricing plan is required";
    if (!formData.admin_name) newErrors.admin_name = "Admin name is required";
    if (!formData.phone_number) newErrors.phone_number = "Phone is required";

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!selectedCountry) newErrors.country = "Country is required";
    if (!selectedState) newErrors.state = "State is required";
    if (!selectedCity) newErrors.city = "City is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  // Dropdown change handlers
  const handleCurrencyChange = (e) => {
    setSelectedCurrency(e.target.value);
    setFormData({
      ...formData,
      currency_symbol: e.target.value,
    });
  };

  const handleTimezoneChange = (e) => {
    setSelectedTimezone(e.target.value);
    setFormData({
      ...formData,
      time_zone: e.target.value,
    });
  };

  const handleCountryChange = (e) => {
    const countryId = e.target.value;
    setSelectedCountry(countryId);
    setSelectedState("");
    setSelectedCity("");
    setStates([]);
    setCities([]);

    setFormData({
      ...formData,
      country: countryId,
      state: "",
      city: "",
    });
  };

  const handleStateChange = (e) => {
    const stateId = e.target.value;
    setSelectedState(stateId);
    setSelectedCity("");
    setCities([]);

    setFormData({
      ...formData,
      state: stateId,
      city: "",
    });
  };

  const handleCityChange = (e) => {
    const cityId = e.target.value;
    setSelectedCity(cityId);
    setFormData({
      ...formData,
      city: cityId,
    });
  };

  const getCompany = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/getcompany`);
      if (response.status === 200) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
      toast.error("Failed to fetch company data");
    }
  };

  const getallPackages = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/getallpackages`);
      setData2(res.data.data);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch packages");
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteModalId(id);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setDeleteModalId(null);
  };

  const handleModalDelete = () => {
    DeleteUnit(deleteModalId);
    handleModalClose();
  };

  const DeleteUnit = (id) => {
    axios
      .delete(`${API_BASE_URL}/deletecompany/${id}`)
      .then((response) => {
        if (response.status === 200) {
          toast.success("Company deleted successfully!");
          getCompany();
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete the company.");
      });
  };

  // deactivate
  const handleDactivateClick = (id) => {
    setDeleteModalId1(id);
    setShowModal1(true);
  };

  const handleModalClose1 = () => {
    setShowModal1(false);
    setDeleteModalId1(null);
  };

  const handleModalDactivate = () => {
    Deactivatecompany(deleteModalId1);
    handleModalClose1();
  };

  const Deactivatecompany = (id) => {
    axios
      .put(`${API_BASE_URL}/deactive/${id}`)
      .then((response) => {
        if (response.status === 200) {
          toast.success("Company Deactivated successfully!");
          getCompany();
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to update.");
      });
  };

  // Activate
  const handleactivate = (id) => {
    setDeleteModalId2(id);
    setShowModal2(true);
  };

  const handleModalClose2 = () => {
    setShowModal2(false);
    setDeleteModalId2(null);
  };

  const handleModalactivate = () => {
    Activatecompany(deleteModalId2);
    handleModalClose2();
  };

  const Activatecompany = (id) => {
    axios
      .put(`${API_BASE_URL}/active/${id}`)
      .then((response) => {
        if (response.status === 200) {
          toast.success("Company Activated successfully!");
          getCompany();
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to update.");
      });
  };

  // super admin log in
  const loginSuperAdmin = async (email) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/login`,
        {
          email: email,
          superadmin: true,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const {
        token,
        permissions,
        username,
        userId,
        isAdmin,
        planData,
      } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("permissions", JSON.stringify(permissions));
      localStorage.setItem("username", username);
      localStorage.setItem("userId", userId);
      localStorage.setItem("isAdmin", JSON.stringify(isAdmin));
      localStorage.setItem("planData", JSON.stringify(planData));

      window.location.href = "https://krayon.softwarestesting.co.in/frontend/";

      return response.data;
    } catch (error) {
      console.error("Login error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      toast.error(
        error.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  // edit
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handelImageChange = (e) => {
    setFormData({
      ...formData,
      invoice_logo: e.target.files[0],
    });
  };

  const handleEditClick = (id) => {
    setEditId(id);
    setIsModalOpen(true);
    axios
      .get(`${API_BASE_URL}/getcompanyby/${id}`)
      .then((response) => {
        const data = response.data.data;

        // Set dropdown values
        setSelectedCurrency(data.currencyid?.toString() || "");
        setSelectedTimezone(data.timezoneid?.toString() || "");
        setSelectedCountry(data.country_id?.toString() || "");
        setSelectedState(data.state_id?.toString() || "");
        setSelectedCity(data.city_id?.toString() || "");

        setFormData({
          restaurant_name: data.restaurant_name,
          invoice_logo: null,
          existing_logo: data.invoice_logo,
          address: data.address,
          website: data.website,
          date_format: data.date_format,
          time_zone: data.time_zone,
          status: data.status,
          country_id: data.country_id,
          state_id: data.state_id,
          city_id: data.city_id,
          timezoneid: data.timezoneid,
          currencyid: data.currencyid,
          currency_symbol: data.currency_symbol,
          currency_position: data.currency_position,
          country: data.country,
          city: data.city,
          zipcode: data.zipcode,
          state: data.state,
          plan_id: data.plan_id,
          admin_name: data.admin_name,
          phone_number: data.phone_number,
          email: data.email,
          password: "",
        });
      })
      .catch((error) => {
        console.error("Error fetching company data:", error);

        // ✅ Check if backend sent an error message
        if (
          error.response &&
          error.response.data &&
          error.response.data.error
        ) {
          toast.error(error.response.data.error); // Show backend error message
        } else {
          toast.error("Failed to fetch company details"); // Fallback error
        }
      });
  };

  const handelSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const formDataToSend = new FormData();

    // Append all form data
    Object.keys(formData).forEach((key) => {
      if (key === "password" && !formData[key]) return; // Skip empty password
      if (key === "invoice_logo") {
        if (formData.invoice_logo) {
          formDataToSend.append("invoice_logo", formData.invoice_logo);
        }
      } else if (key !== "existing_logo") {
        formDataToSend.append(key, formData[key]);
      }
    });

    // // Append dropdown values
    // formDataToSend.append("currency_symbol", selectedCurrency);
    // formDataToSend.append("time_zone", selectedTimezone);
    // formDataToSend.append("country", selectedCountry);
    // formDataToSend.append("state", selectedState);
    // formDataToSend.append("city", selectedCity);

    try {
      console.log("updatecompanydata", formDataToSend);
      await axios.put(
        `${API_BASE_URL}/updatecompany/${editId}`,
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      toast.success("Company updated successfully!");
      setIsModalOpen(false);
      getCompany();
    } catch (error) {
      console.error(error);
      console.error("Error fetching company data:", error);

      // ✅ Check if backend sent an error message
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error); // Show backend error message
      } else {
        toast.error("Failed to fetch company details"); // Fallback error
      }
    }
  };

  const getDisplayedPages = () => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const maxPageButtons = 10;
    const pages = [];

    let start = Math.max(currentPage - Math.floor(maxPageButtons / 2), 1);
    let end = Math.min(start + maxPageButtons - 1, totalPages);

    if (end - start < maxPageButtons - 1) {
      start = Math.max(end - maxPageButtons + 1, 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (start > 1) pages.unshift("...");
    if (end < totalPages) pages.push("...");

    return pages;
  };

  const selectPage = (page) => {
    if (page === "...") return;
    if (page > 0 && page <= Math.ceil(data.length / itemsPerPage)) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/getcompany`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  };

  const handleDownload = async (type) => {
    try {
      const data = await fetchData();
      if (type === "csv") downloadCSV(data);
      else if (type === "excel") downloadExcel(data);
      else if (type === "pdf") downloadPDF(data);
    } catch (error) {
      toast.error("Failed to download data");
    }
  };

  // download for CSV file..
  const downloadCSV = (data) => {
    const csvData = data.map((item) => ({
      Business_Name: item.restaurant_name || "Not Found",
      Phone: item.phone_number,
      Email: item.email,
      Address: item.address,
      Plan: item.plan_name,
      Owner_Name: item.admin_name,
      Status: item.status,
    }));

    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "companies.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // download for EXCEL
  const downloadExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Companies");

    worksheet.columns = [
      { header: "Business Name", key: "business_name" },
      { header: "Phone", key: "phone" },
      { header: "Address", key: "address" },
      { header: "Price Plan", key: "price_plan" },
      { header: "Owner", key: "owner" },
      { header: "Email", key: "email" },
      { header: "Status", key: "status" },
    ];

    data.forEach((item) => {
      worksheet.addRow({
        business_name: item.restaurant_name || "Not Found",
        phone: item.phone_number,
        email: item.email,
        address: item.address,
        price_plan: item.plan_name,
        owner: item.admin_name,
        status: item.status,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "companies.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // download for PDF
  const downloadPDF = (data) => {
    const doc = new jsPDF();

    const rows = data.map((item) => [
      item.restaurant_name || "Not Found",
      item.phone_number,
      item.address,
      item.plan_name,
      item.admin_name,
      item.email,
      item.status,
    ]);

    doc.text("Companies Export", 20, 10);

    autoTable(doc, {
      head: [
        [
          "Business Name",
          "Phone",
          "Address",
          "Plan",
          "Owner",
          "Email",
          "Status",
        ],
      ],
      body: rows,
      startY: 20,
    });

    doc.save("companies.pdf");
  };

  const [subscriptionData, setSubscriptionData] = useState({
    plan_id: "",
    email: "",
    paid_via: "",
    transaction_id: "",
    is_superadmin: true,
  });

  // add subscription
  const handleAddSubscription = (sl_no, email) => {
    setSubscriptionData((prev) => ({
      ...prev,
      email: email,
    }));
    setIsModalOpen1(true);
  };

  const handleSubscriptionChange = (e) => {
    const { name, value } = e.target;
    setSubscriptionData({
      ...subscriptionData,
      [name]: value,
    });
  };

  const handleSubscriptionSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API_BASE_URL}/addsubscription`, subscriptionData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Subscription added successfully");
      setSubscriptionData({
        plan_id: "",
        email: "",
        paid_via: "",
        transaction_id: "",
        is_superadmin: true,
      });
      setIsModalOpen1(false);
    } catch (error) {
      console.error("Error submitting subscription:", error);
      toast.error("Something went wrong");
    }
  };

  const handleManage = (id) => {
    navigate(`/manage/${id}`);
  };

  const fetchCountries = async () => {
    try {
      const response = await axios.get(
        "https://krayon.softwarestesting.co.in/api/countries1"
      );
      if (response.data && Array.isArray(response.data.data)) {
        setCountries(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const fetchStates = async (countryId) => {
    try {
      const response = await axios.get(
        `https://krayon.softwarestesting.co.in/api/states1/${countryId}`
      );
      if (response.data && Array.isArray(response.data.data)) {
        setStates(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching states:", error);
    }
  };

  const fetchCities = async (stateId) => {
    try {
      const response = await axios.get(
        `https://krayon.softwarestesting.co.in/api/cities1/${stateId}`
      );
      if (response.data && Array.isArray(response.data.data)) {
        setCities(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  // useEffect hooks
  useEffect(() => {
    getCompany();
    getallPackages();
    fetchCurrencies();
    fetchTimezones();
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetchStates(selectedCountry);
    } else {
      setStates([]);
      setCities([]);
      setSelectedState("");
      setSelectedCity("");
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedState) {
      fetchCities(selectedState);
    } else {
      setCities([]);
      setSelectedCity("");
    }
  }, [selectedState]);

  // Add this useEffect to debug the values
  useEffect(() => {
    if (isModalOpen) {
      console.log("Edit Modal Values:", {
        selectedCurrency,
        selectedTimezone,
        selectedCountry,
        selectedState,
        selectedCity,
        formData,
      });
    }
  }, [
    isModalOpen,
    selectedCurrency,
    selectedTimezone,
    selectedCountry,
    selectedState,
    selectedCity,
    formData,
  ]);

  const filteredData = data.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      item.restaurant_name?.toLowerCase().includes(search) ||
      item.phone_number?.toLowerCase().includes(search) ||
      item.email?.toLowerCase().includes(search) ||
      item.admin_name?.toLowerCase().includes(search) ||
      item.address?.toLowerCase().includes(search)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />

        <div className="w-full">
          <div className="flex-1 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Registered companies
            </h2>
          </div>
          <section className="tablebutton w-full px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center sm:justify-between gap-4">
              {/* Records per page */}
              <div className="flex items-center gap-2">
                <label className="text-gray-900">Display</label>
                <div className="relative flex items-center border border-[#4CBBA1] p-1 rounded">
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="appearance-none w-16 pl-3 pr-8 py-1 rounded-md text-gray-700 focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                  <div className="absolute right-2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                <span className="text-gray-700 text-sm">Records per page</span>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <button
                  onClick={() => handleDownload("csv")}
                  className="hover:bg-[#1C1D3E] text-[#000] hover:text-white hover:scale-105 duration-200 border border-zinc-300 rounded-md py-2 px-6"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleDownload("excel")}
                  className="hover:bg-[#1C1D3E] text-[#000] hover:text-white hover:scale-105 duration-200 border border-zinc-300 rounded-md py-2 px-6"
                >
                  Excel
                </button>
                <button
                  onClick={() => handleDownload("pdf")}
                  className="hover:bg-[#1C1D3E] text-[#000] hover:text-white hover:scale-105 duration-200 border border-zinc-300 rounded-md py-2 px-6"
                >
                  PDF
                </button>
              </div>

              {/* Search */}
              <div className="flex w-full sm:w-auto items-center border border-gray-900 rounded-md px-2">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search"
                  type="search"
                  className="py-2 px-2 w-full sm:w-auto text-gray-700 leading-tight focus:outline-none"
                />
                <button className="text-[#0f044a] text-lg px-2">
                  <FaSearch />
                </button>
              </div>
            </div>
          </section>

          <section className="tabledata p-2">
            <div className="w-full mt-10 drop-shadow-md">
              <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full bg-white text-center">
                  <thead className="bg-[#4CBBA1] text-white text-sm uppercase">
                    <tr>
                      {headers.map((header, index) => (
                        <th key={index} className="py-4 px-6 whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="text-gray-700">
                    {currentItems.length > 0 ? (
                      currentItems.map((row, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0
                              ? "bg-gray-50 hover:bg-gray-100"
                              : "hover:bg-gray-100"
                          }
                        >
                          <td className="py-3 px-6 border border-gray-200 font-medium">
                            {indexOfFirstItem + index + 1}
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
                            {row.start_date
                              ? format(new Date(row.start_date), "MMM dd, yyyy")
                              : "N/A"}
                          </td>
                          <td className="py-3 px-6 border border-gray-200">
                            {row.end_date
                              ? format(new Date(row.end_date), "MMM dd, yyyy")
                              : "N/A"}
                          </td>
                          <td className="py-3 px-6 border border-gray-200">
                            {row.current_package_name || "No current plan"}
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
                          <td className="py-3 px-6 border border-gray-200">
                            <div className="flex justify-center gap-3">
                              <Tooltip message="Edit">
                                <button
                                  onClick={() => handleEditClick(row.sl_no)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition duration-200"
                                >
                                  <FaRegEdit />
                                </button>
                              </Tooltip>
                              {row.status?.toLowerCase() !== "active" && (
                                <Tooltip message="Activate">
                                  <button
                                    onClick={() => handleactivate(row.sl_no)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition duration-200"
                                  >
                                    <FiCheckCircle />
                                  </button>
                                </Tooltip>
                              )}
                              {row.status?.toLowerCase() === "active" && (
                                <Tooltip message="Deactivate">
                                  <button
                                    onClick={() =>
                                      handleDactivateClick(row.sl_no)
                                    }
                                    className="bg-yellow-500 hover:bg-yellow-900 text-white p-2 rounded-full transition duration-200"
                                  >
                                    <MdBlockFlipped />
                                  </button>
                                </Tooltip>
                              )}

                              <Tooltip message="Delete">
                                <button
                                  onClick={() => handleDeleteClick(row.sl_no)}
                                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition duration-200"
                                >
                                  <FaRegTrashCan />
                                </button>
                              </Tooltip>
                              <Tooltip message="Manage ">
                                <button
                                  onClick={() => handleManage(row.user_id)}
                                  className="bg-purple-400 hover:bg-purple-500 text-white p-2 rounded-full transition duration-200"
                                >
                                  <MdManageAccounts />
                                </button>
                              </Tooltip>

                              <Tooltip message="Add Subscription ">
                                <button
                                  onClick={() =>
                                    handleAddSubscription(row.sl_no, row.email)
                                  }
                                  className="bg-purple-400 hover:bg-purple-500 text-white p-2 rounded-full transition duration-200"
                                >
                                  <MdAddToPhotos />
                                </button>
                              </Tooltip>
                              {row.status?.toLowerCase() === "active" && (
                                <Tooltip message="log in">
                                  <button
                                    onClick={() => loginSuperAdmin(row.email)}
                                    className="bg-green-500 hover:bg-green-900 text-white p-2 rounded-full transition duration-200"
                                  >
                                    <FaSignInAlt />
                                  </button>
                                </Tooltip>
                              )}
                            </div>
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

            {/* Pagination */}
            {data.length > 0 && (
              <div className="flex justify-between mt-7">
                <div className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to{" "}
                  {Math.min(indexOfLastItem, data.length)} of {data.length}{" "}
                  entries
                </div>
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => selectPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-[46px] w-[70px] cursor-pointer border-[1px] border-[#1C1D3E] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {getDisplayedPages().map((page, index) => (
                    <button
                      onClick={() => selectPage(page)}
                      key={index}
                      className={`h-[46px] w-[50px] cursor-pointer border-[1px] border-[#1C1D3E] ${
                        currentPage === page ? "bg-[#1C1D3E] text-white" : ""
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => selectPage(currentPage + 1)}
                    disabled={
                      currentPage === Math.ceil(data.length / itemsPerPage)
                    }
                    className="h-[46px] w-[70px] cursor-pointer border-[1px] border-[#1C1D3E] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {isModalOpen && (
        <>
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto max-h-screen">
            <div className="w-full max-w-2xl max-h-screen overflow-y-auto bg-white rounded-xl shadow-lg border border-[#1C1D3E]">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  Edit Company Details
                </h2>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                >
                  X
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5">
                <form
                  onSubmit={handelSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {/* Company Info */}
                  <div className="col-span-full md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Company Name *
                    </label>
                    <input
                      onChange={handleChange}
                      value={formData.restaurant_name}
                      name="restaurant_name"
                      type="text"
                      placeholder="Company Name"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.restaurant_name ? "border-red-500" : ""
                      }`}
                    />
                    {errors.restaurant_name && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.restaurant_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Business Logo
                    </label>
                    <input
                      onChange={handelImageChange}
                      name="invoice_logo"
                      type="file"
                      accept="image/*"
                      className="mt-1 w-full border rounded-md px-3 py-2"
                    />
                    {formData.existing_logo && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Current Logo:</p>
                        <img
                          src={`${VITE_IMG_URL}${formData.existing_logo}`}
                          alt="Company Logo"
                          className="h-16 w-16 object-contain mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-span-full md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Currency Symbol *
                    </label>
                    <select
                      value={selectedCurrency}
                      onChange={handleCurrencyChange}
                      name="currency_symbol"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.currency_symbol ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">-- Select Currency --</option>
                      {currencies.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.currency_code} - {item.symbol}
                        </option>
                      ))}
                    </select>
                    {errors.currency_symbol && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.currency_symbol}
                      </p>
                    )}
                  </div>

                  <div className="col-span-full md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Website
                    </label>
                    <input
                      onChange={handleChange}
                      value={formData.website}
                      name="website"
                      type="text"
                      className="mt-1 w-full border rounded-md px-3 py-2"
                      placeholder="Website"
                    />
                  </div>

                  {/* Row 2 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date Format *
                    </label>
                    <select
                      onChange={handleChange}
                      value={formData.date_format}
                      name="date_format"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.date_format ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select Date Format</option>
                      <option value={"D/M/Y"}>D/M/Y</option>
                      <option value={"M/D/Y"}>M/D/Y</option>
                      <option value={"Y/M/D"}>Y/M/D</option>
                    </select>
                    {errors.date_format && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.date_format}
                      </p>
                    )}
                  </div>

                  {/* Timezone Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Time Zone *
                    </label>
                    <select
                      value={selectedTimezone}
                      onChange={handleTimezoneChange}
                      name="time_zone"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.time_zone ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">-- Select Timezone --</option>
                      {timezones.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.timezone_name}
                        </option>
                      ))}
                    </select>
                    {errors.time_zone && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.time_zone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status *
                    </label>
                    <select
                      onChange={handleChange}
                      value={formData.status}
                      name="status"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.status ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    {errors.status && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.status}
                      </p>
                    )}
                  </div>

                  {/* Country Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Country *
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={handleCountryChange}
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.country ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select Country</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    {errors.country && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.country}
                      </p>
                    )}
                  </div>

                  {/* State Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      State *
                    </label>
                    <select
                      value={selectedState}
                      onChange={handleStateChange}
                      disabled={!selectedCountry}
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.state ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.state}
                      </p>
                    )}
                  </div>

                  {/* City Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      City *
                    </label>
                    <select
                      value={selectedCity}
                      onChange={handleCityChange}
                      disabled={!selectedState}
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.city ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select City</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Zipcode *
                    </label>
                    <input
                      onChange={handleChange}
                      value={formData.zipcode}
                      name="zipcode"
                      type="number"
                      placeholder="Zipcode"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.zipcode ? "border-red-500" : ""
                      }`}
                    />
                    {errors.zipcode && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.zipcode}
                      </p>
                    )}
                  </div>

                  <div className="loda col-span-full md:col-span-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Currency Position *
                      </label>
                      <select
                        onChange={handleChange}
                        value={formData.currency_position}
                        name="currency_position"
                        className={`mt-1 w-full border rounded-md px-3 py-2 ${
                          errors.currency_position ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">Select Position</option>
                        <option value={"Before Amount"}>Before Amount</option>
                        <option value={"After Amount"}>After Amount</option>
                      </select>
                      {errors.currency_position && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.currency_position}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Pricing Plan *
                    </label>
                    <select
                      onChange={handleChange}
                      value={formData.plan_id}
                      name="plan_id"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.plan_id ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select Plan</option>
                      {data2.map((plan, index) => (
                        <option key={index} value={plan.plan_id}>
                          {plan.package_name}
                        </option>
                      ))}
                    </select>
                    {errors.plan_id && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.plan_id}
                      </p>
                    )}
                  </div>

                  <div className="col-span-full md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Address *
                    </label>
                    <textarea
                      onChange={handleChange}
                      value={formData.address}
                      name="address"
                      rows="2"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.address ? "border-red-500" : ""
                      }`}
                      placeholder="Address"
                    ></textarea>
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.address}
                      </p>
                    )}
                  </div>

                  {/* Admin Section */}
                  <div className="col-span-full mt-6">
                    <h3 className="text-xl font-semibold mb-4">
                      For Admin Access
                    </h3>
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
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.admin_name ? "border-red-500" : ""
                      }`}
                    />
                    {errors.admin_name && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.admin_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone *
                    </label>
                    <input
                      // onChange={handleChange}
                      onChange={(e) => {
                        // allow only numbers
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        handleChange({
                          target: { name: "phone_number", value },
                        });
                      }}
                      value={formData.phone_number}
                      name="phone_number"
                      maxLength={10}
                      type="tel"
                      placeholder="Phone"
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.phone_number ? "border-red-500" : ""
                      }`}
                    />
                    {errors.phone_number && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.phone_number}
                      </p>
                    )}
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
                      className={`mt-1 w-full border rounded-md px-3 py-2 ${
                        errors.email ? "border-red-500" : ""
                      }`}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      onChange={handleChange}
                      value={formData.password}
                      name="password"
                      type="password"
                      autocomplete="current-password"
                      className="mt-1 w-full border rounded-md px-3 py-2"
                      placeholder="Leave blank to keep current password"
                    />
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="col-span-full flex gap-4 mt-6">
                    <button
                      type="submit"
                      className="bg-[#1C1D3E] hover:bg-[#3c3e79] text-white px-6 py-2 rounded-md"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Overlay */}
          <div className="fixed inset-0 bg-black opacity-50 z-40"></div>
        </>
      )}

      {isModalOpen1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 ">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-lg border-2 border-purple-300">
            <h2 className="text-2xl font-bold text-center mb-4 text-blue-900">
              Add Subscription
            </h2>

            <form onSubmit={handleSubscriptionSubmit}>
              {/* Package Dropdown */}
              <div className="mb-4">
                <label className="block mb-1 text-gray-700 font-medium">
                  Select Package
                </label>
                <select
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={subscriptionData.plan_id}
                  onChange={handleSubscriptionChange}
                  name="plan_id"
                  required
                >
                  <option value="">-- Select Package --</option>
                  {data2.map((plan, index) => (
                    <option key={index} value={plan.plan_id}>
                      {plan.package_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subscription Type Dropdown */}
              <div className="mb-4">
                <label className="block mb-1 text-gray-700 font-medium">
                  Paid Via
                </label>
                <select
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={subscriptionData.paid_via}
                  onChange={handleSubscriptionChange}
                  name="paid_via"
                  required
                >
                  <option value="">-- Select Type --</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              {/* Transaction ID Field */}
              <div className="mb-4">
                <label className="block mb-1 text-gray-700 font-medium">
                  Transaction ID
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={subscriptionData.transaction_id}
                  onChange={handleSubscriptionChange}
                  name="transaction_id"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen1(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteDialogBox
        show={showModal}
        onClose={handleModalClose}
        onDelete={handleModalDelete}
        name={"companies"}
      />
      <Deactivate
        show={showModal1}
        onClose={handleModalClose1}
        onDelete={handleModalDactivate}
      />

      <Activate
        show={showModal2}
        onClose={handleModalClose2}
        onDelete={handleModalactivate}
      />
    </>
  );
};

export default CompanyList;
