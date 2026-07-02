import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { FaRegEdit } from "react-icons/fa";
import DeleteDialogBox from "../components/DeleteDialogBox";
import { FaRegTrashCan } from "react-icons/fa6";
import { FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
const AllPackages = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;

  const [showModal, setShowModal] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [formData2, setFormData2] = useState({
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
  const [errors, setErrors] = useState({});
  const getallPackages = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/getallpackages`);
      console.log("allpackages", res.data.data);
      setPlans(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };
  // delete
  const handleDeleteClick = (id) => {
    console.log(id);
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
      .delete(`${API_BASE_URL}/deletepackages/${id}`)
      .then((response) => {
        if (response.status === 200) {
          toast.success("Package deleted successfully!");
          getallPackages();
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete the banner.");
      });
  };

  const handleChange2 = (e) => {
    const { name, value } = e.target;
    setFormData2({
      ...formData2,
      [name]: value,
    });
  };
  // const handleEditClick = (id) => {
  //   setEditId(id);
  //   setIsModalOpen(true);
  //   // Fetch data for the given ID
  //   axios.get(`${API_BASE_URL}/getpackages/${id}`).then((response) => {
  //     setFormData2({
  //       package_name: response.data.data.package_name,
  //       price_interval: response.data.data.price_interval,
  //       price: response.data.data.price_with_currency,
  //       number_of_active_users: response.data.data.number_of_active_users,
  //       interval_value: response.data.data.interval_value,
  //       package_description: response.data.data.package_description,
  //       number_of_invoice: response.data.data.number_of_invoice,
  //       status: response.data.data.status,
  //       trial_days: response.data.data.trial_days,
  //       currency: response.data.data.currency,
  //     });

  //   });
  //   console.log("editpackage data",response.data.data)
  // };
  const handleEditClick = (id) => {
    setEditId(id);
    axios
      .get(`${API_BASE_URL}/getpackages/${id}`)
      .then((response) => {
        const data = response.data.data;
        setFormData2({
          package_name: data.package_name,
          price_interval: data.price_interval?.toLowerCase() || "",
          price: data.price_with_currency,
          number_of_active_users: data.number_of_active_users,
          interval_value: data.interval_value,
          package_description: data.package_description,
          number_of_invoice: data.number_of_invoice,
          status: data.status?.toLowerCase() || "",
          trial_days: data.trial_days,
          currency: data.currency?.toString() || "",
        });
        setIsModalOpen(true);
      })
      .catch((error) => {
        console.error("Error fetching package:", error);
        toast.error("Failed to load package data");
      });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    let newErrors = {};

    // Validation for all required fields
    if (!formData2.package_name?.trim())
      newErrors.package_name = "Package name is required.";
    if (!formData2.package_description?.trim())
      newErrors.package_description = "Package description is required.";
    if (!formData2.number_of_active_users?.toString().trim())
      newErrors.number_of_active_users = "Number of active users is required.";
    if (!formData2.number_of_invoice?.toString().trim())
      newErrors.number_of_invoice = "Number of invoices is required.";
    if (!formData2.price_interval)
      newErrors.price_interval = "Price interval is required.";
    if (!formData2.interval_value?.toString().trim())
      newErrors.interval_value = "Interval value is required.";
    if (!formData2.price?.toString().trim())
      newErrors.price = "Price is required.";
    if (!formData2.currency) newErrors.currency = "Currency is required.";
    if (!formData2.trial_days?.toString().trim())
      newErrors.trial_days = "Trial days are required.";
    if (!formData2.status) newErrors.status = "Status is required.";

    setErrors(newErrors);

    // Stop if there are errors
    if (Object.keys(newErrors).length > 0) return;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/addsupcription/${editId}`,
        formData2
      );

      if (response.status === 200) {
        toast.success("Update successfully!");
        setIsModalOpen(false);
        getallPackages();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to update package.");
    }
  };

  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [currencies, setCurrencies] = useState([]);
  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/symbol`);
      if (response.data && Array.isArray(response.data.data)) {
        setCurrencies(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching currencies:", error);
    }
  };
  useEffect(() => {
    getallPackages();
    fetchCurrencies();
  }, []);
  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />

        <div className=" w-full">
          <div className="flex-1 p-6">
            <h1 className="text-2xl font-bold mb-4">All Packages</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-gray-100 h-auto rounded-sm">
              {plans.length === 0 ? (
                <div className="bg-gray-800 text-white rounded-2xl p-6 shadow-md text-center">
                  <p className="text-lg">There are no packages available.</p>
                </div>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.plan_id}
                    className="bg-blue-50 text-black rounded-2xl shadow-lg overflow-hidden w-full max-w-sm"
                  >
                    {/* Header Curve */}
                    <div className="bg-[#1d1717] text-white text-center py-4 rounded-b-full">
                      <h2 className="text-lg font-semibold">
                        {" "}
                        {plan.package_name}
                      </h2>
                    </div>

                    {/* Subscription Details */}
                    <div className="p-5">
                      <ul className="space-y-3 text-lg">
                        <p className="text-sm text-gray-900 mb-4 font-bold">
                          {plan.package_description}
                        </p>

                        <li className="flex items-start gap-2">
                          <FaCheck className="text-green-400" size={18} />
                          <span>
                            <strong>Users:</strong>{" "}
                            {plan.number_of_active_users === 0
                              ? "Unlimited"
                              : plan.number_of_active_users}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FaCheck className="text-green-400" size={18} />
                          <span>
                            <strong>Invoices:</strong>{" "}
                            {plan.number_of_invoice === 0
                              ? "Unlimited"
                              : plan.number_of_invoice}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FaCheck className="text-green-400" size={18} />
                          <span>
                            <strong>Trial:</strong> {plan.trial_days} days
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FaCheck className="text-green-400" size={18} />
                          <span>
                            <strong>Duration:</strong> {plan.interval_value}{" "}
                            {plan.price_interval}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FaCheck className="text-green-400" size={18} />
                          <span>
                            <strong>Price:</strong>{" "}
                            {parseFloat(plan.price_with_currency) === 0
                              ? "Free Package"
                              : `${plan.price_with_currency} / ${plan.currency}`}
                          </span>
                        </li>
                      </ul>

                      {/* Buttons */}
                      <div className="mt-6 flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleEditClick(plan.plan_id)}
                          className="w-full px-4 py-2 border border-gray-900 text-gray-200 rounded-md flex items-center justify-center gap-1 text-sm bg-gray-700"
                        >
                          <FaRegEdit size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(plan.plan_id)}
                          className="w-full px-4 py-2 border border-red-600 text-red-400 rounded-md flex items-center justify-center gap-1 text-sm bg-red-700 text-white"
                        >
                          <FaRegTrashCan size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <>
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-[#1C1D3E]">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  Edit Packages
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                >
                  Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5">
                <form
                  onSubmit={handleSubmit}
                  className="bg-white rounded-xl shadow-md border p-6 w-full mx-auto space-y-6"
                >
                  {/* Subscription Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Package Name*
                      </label>
                      <input
                        onChange={handleChange2}
                        value={formData2.package_name}
                        type="text"
                        name="package_name"
                        placeholder="Enter Package name"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.package_name && (
                        <p className="text-red-500 text-sm">
                          {errors.package_name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Package Description*
                      </label>
                      <textarea
                        onChange={handleChange2}
                        value={formData2.package_description}
                        name="package_description"
                        rows="1"
                        placeholder="Enter description"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      ></textarea>
                      {errors.package_description && (
                        <p className="text-red-500 text-sm">
                          {errors.package_description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Users & Invoices */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Number of Active users*
                      </label>
                      <input
                        onChange={handleChange2}
                        value={formData2.number_of_active_users}
                        type="number"
                        name="number_of_active_users"
                        placeholder="Enter number of user"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.number_of_active_users && (
                        <p className="text-red-500 text-sm">
                          {errors.number_of_active_users}
                        </p>
                      )}
                      <h1 className="font-light">0 = infinite</h1>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Number of invoice*
                      </label>
                      <input
                        onChange={handleChange2}
                        value={formData2.number_of_invoice}
                        type="number"
                        placeholder="Number of invoice can generate"
                        name="number_of_invoice"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.number_of_invoice && (
                        <p className="text-red-500 text-sm">
                          {errors.number_of_invoice}
                        </p>
                      )}
                      <h1 className="font-light">0 = infinite</h1>
                    </div>
                  </div>

                  {/* Price Interval */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Price Interval*
                      </label>
                      <select
                        onChange={handleChange2}
                        value={formData2.price_interval}
                        name="price_interval"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Interval</option>
                        <option value="day">Day</option>
                        <option value="month">Month</option>
                        <option value="year">Year</option>
                      </select>
                      {errors.price_interval && (
                        <p className="text-red-500 text-sm">
                          {errors.price_interval}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Interval Value*
                      </label>
                      <input
                        onChange={handleChange2}
                        value={formData2.interval_value}
                        type="number"
                        name="interval_value"
                        placeholder="e.g. 1"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.interval_value && (
                        <p className="text-red-500 text-sm">
                          {errors.interval_value}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price & Currency */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Price*
                      </label>
                      <input
                        onChange={handleChange2}
                        value={formData2.price}
                        type="number"
                        name="price"
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.price && (
                        <p className="text-red-500 text-sm">{errors.price}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Currency*
                      </label>
                      <select
                        onChange={handleChange2}
                        value={formData2.currency}
                        name="currency"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Currency</option>
                        {currencies.map((cur) => (
                          <option key={cur.id} value={cur.id}>
                            {cur.currency_code} - {cur.symbol}
                          </option>
                        ))}
                      </select>
                      {errors.currency && (
                        <p className="text-red-500 text-sm">
                          {errors.currency}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Trial Days & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Trial Days*
                      </label>
                      <input
                        onChange={handleChange2}
                        value={formData2.trial_days}
                        type="number"
                        name="trial_days"
                        placeholder="e.g. 1"
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.trial_days && (
                        <p className="text-red-500 text-sm">
                          {errors.trial_days}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Status*
                      </label>
                      <select
                        name="status"
                        onChange={handleChange2}
                        value={formData2.status}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {errors.status && (
                        <p className="text-red-500 text-sm">{errors.status}</p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-[#1C1D3E] text-white py-2 rounded hover:bg-[#2a2b4f] transition"
                    >
                      Update Package
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
      <DeleteDialogBox
        show={showModal}
        onClose={handleModalClose}
        onDelete={handleModalDelete}
      />
    </>
  );
};

export default AllPackages;
