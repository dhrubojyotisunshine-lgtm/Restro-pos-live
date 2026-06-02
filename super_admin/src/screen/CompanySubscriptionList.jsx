import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { FaSearch } from "react-icons/fa";
import axios from "axios";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaEdit } from "react-icons/fa";
import { FaSyncAlt } from "react-icons/fa";
import { toast } from "react-toastify";

const headers = [
  "SL.",
  "Business Name ",
  "Package Name",
  "Status",
  "Price Plan",
  "Start Data",
  "End Date",
  "Trial End Date",
  "Action",
];
const CompanySubscriptionList = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [data, setData] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPlanId, setEditPlanId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editFormData, setEditFormData] = useState({
    start_date: "",
    end_date: "",
    trial_date: "",
  });

  const filteredData = data.filter(
    (row) =>
      row.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.package_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handleEditPlanSubmit = async () => {
    const { start_date, end_date, trial_date } = editFormData;

    // Validation: check empty
    if (!start_date || !end_date || !trial_date) {
      toast.error("All date fields are required.");
      return;
    }

    // Convert to Date objects for comparison
    const start = new Date(start_date);
    const end = new Date(end_date);
    const trial = new Date(trial_date);

    // Validation: start < end
    if (start >= end) {
      toast.error("Start date must be earlier than end date.");
      return;
    }

    // Optional Validation: trial date between start & end
    if (trial < start || trial > end) {
      toast.error("Trial date must be between start and end date.");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/updatesbuscriptiondate/${editPlanId}`, {
        ...editFormData,
      });

      toast.success("Plan dates updated!");
      setIsEditModalOpen(false);
      getallplans(); // Refresh table
    } catch (err) {
      console.error(err);
      toast.error("Update failed.");
    }
  };

  // Function to calculate max date for start date based on end date
  const getMaxStartDate = () => {
    if (editFormData.end_date) {
      const endDate = new Date(editFormData.end_date);
      endDate.setDate(endDate.getDate() - 1); // One day before end date
      return endDate.toISOString().split("T")[0];
    }
    return "";
  };

  // Function to calculate min date for end date based on start date
  const getMinEndDate = () => {
    if (editFormData.start_date) {
      const startDate = new Date(editFormData.start_date);
      startDate.setDate(startDate.getDate() + 1); // One day after start date
      return startDate.toISOString().split("T")[0];
    }
    return "";
  };

  // Function to calculate min/max dates for trial date based on start/end dates
  const getMinTrialDate = () => {
    return editFormData.start_date || "";
  };

  const getMaxTrialDate = () => {
    return editFormData.end_date || "";
  };

  const handleUpdateStatus = async () => {
    const data = {
      user_plan_id: selectedPlanId,
      status: selectedStatus,
    };

    try {
      await axios.put(
        `${API_BASE_URL}/addcompanysubcription/${selectedPlanId}`,
        data
      );
      toast.success("Plan Status Updated successfully!");
      setIsModalOpen(false);
      getallplans(); // Refresh the list
    } catch (err) {
      console.error(err);
      toast.error("Update failed.");
    }
  };

  const getallplans = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/getallpackageswithaproval`);
      setData(res.data);
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };

  const getDisplayedPages = () => {
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const maxPageButtons = 10; // Maximum number of buttons to show
    const pages = [];

    // Calculate start and end of visible page range
    let start = Math.max(currentPage - Math.floor(maxPageButtons / 2), 1);
    let end = Math.min(start + maxPageButtons - 1, totalPages);

    // Adjust the start if end exceeds totalPages
    if (end - start < maxPageButtons - 1) {
      start = Math.max(end - maxPageButtons + 1, 1);
    }

    // Add the visible pages to the array
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis if there are more pages beyond the visible range
    if (start > 1) pages.unshift("...");
    if (end < totalPages) pages.push("...");

    return pages;
  };
  const selectPage = (page) => {
    if (page === "...") return; // Ignore clicks on ellipsis
    if (page > 0 && page <= Math.ceil(data.length / itemsPerPage)) {
      setCurrentPage(page);
    }
  };
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };
  const parseToLocalDate = (dateString) => {
    const parsedDate = new Date(dateString);
    return new Date(
      parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];
  };

  const formatDateForTable = (dateString) => {
    const parsedDate = new Date(dateString);
    const localDate = new Date(
      parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];

    // Format from "yyyy-mm-dd" to "dd/mm/yy"
    const [year, month, day] = localDate.split("-");
    return `${day}/${month}/${year.slice(2)}`;
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/getallpackageswithaproval`
      );
      console.log("list", response.data.data);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error; // Rethrow the error to handle it in the calling function if needed
    }
  };

  const handleDownload = async (type) => {
    const data = await fetchData();

    if (type === "csv") downloadCSV(data);
    else if (type === "excel") downloadExcel(data);
    else if (type === "pdf") downloadPDF(data);
  };
  // download for CSV file..
  const downloadCSV = async () => {
    const data = await fetchData(); // Fetch data
    const csvData = data.map((item) => ({
      // Map your data structure as needed

      Business_Name: item.restaurant_name
        ? `${item.restaurant_name}`
        : "Not Found",
      Package_Status: item.package_status,
      Plan_Price: item.price_with_currency,
      Trial_Days: item.trial_days,
      Plan: item.package_name,
      Start_Date: formatDateForTable(item.end_date),
      End_Date: formatDateForTable(item.end_date),
    }));

    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv"; // CSV file name
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // download for EXCEL
  const downloadExcel = async () => {
    const data = await fetchData(); // Fetch your data

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Define the columns and map headers
    worksheet.columns = [
      { header: "Business Name	", key: "Business_Name" },
      { header: "Package Status	", key: "Package_Status" },
      { header: "Package Name", key: "package_name" },
      { header: "Plan Price", key: "price_with_currency" },
      { header: "Trial Days", key: "Trial_Days" },
      { header: "Start Date", key: "Start_Date" },
      { header: "End Date", key: "End_Date" },
    ];

    // Add rows
    data.forEach((item) => {
      worksheet.addRow({
        Business_Name: item.restaurant_name
          ? `${item.restaurant_name}`
          : "Not Found",
        Package_Status: item.package_status,
        Plan_Price: item.price_with_currency,
        Trial_Days: item.trial_days,
        Plan: item.package_name,
        Start_Date: formatDateForTable(item.end_date),
        End_Date: formatDateForTable(item.end_date),
      });
    });

    // Create and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // download for PDF

  const downloadPDF = async () => {
    const data = await fetchData(); // Fetch data
    const doc = new jsPDF();

    // Map the data to rows for the PDF
    const rows = data.map((item) => [
      item.restaurant_name ? `${item.restaurant_name}` : "Not Found",
      item.package_status,
      item.price_with_currency,
      item.trial_days,
      item.package_name,
      formatDateForTable(item.end_date),
      formatDateForTable(item.end_date),
    ]);

    // Add a title
    doc.text("Data Export", 20, 10);

    // Add a table
    autoTable(doc, {
      head: [
        [
          "Business Name	",
          "Package Status	",
          "Package Name",
          "Plan Price",
          "Trial Days",
          "Start Date",
          "End Date",
        ],
      ],
      body: rows,
      startY: 20,
    });

    doc.save("data.pdf"); // PDF file name
  };
  useEffect(() => {
    getallplans();
  }, []);
  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />

        <div className=" w-full">
          <div className="flex-1 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Package Subscription{" "}
              <span className=" text-sm font-light">View Subscription</span>
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
                    className="appearance-none w-16 pl-2 pr-6 py-1 rounded-md text-gray-700 focus:outline-none"
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  placeholder="Search"
                  type="search"
                  className="py-2 px-2 w-full sm:w-auto text-gray-700 leading-tight focus:outline-none"
                />
                <button
                  //onClick={handleSearch}
                  className="text-[#0f044a] text-lg px-2"
                >
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
                    {paginatedData.length > 0 ? (
                      paginatedData.map((row, index) => (
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
                          {/* <td className="py-3 px-6 border border-gray-200">
                            {row.restaurant_name}
                          </td> */}

                          <td className="py-3 px-6 border border-gray-200">
                            {row.restaurant_name
                              ? row.restaurant_name
                              : "Not Registered"}
                          </td>

                          <td className="py-3 px-6 border border-gray-200">
                            {row.package_name}
                          </td>
                          <td
                            onClick={() => {
                              setSelectedPlanId(row.user_plan_id);
                              setSelectedStatus(row.package_status); // optional: pre-fill current status
                              setIsModalOpen(true);
                            }}
                            className="py-3 px-6 border border-gray-200"
                          >
                            <span
                              className={`inline-block px-2 py-1 rounded-full  font-semibold ${
                                row.package_status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : row.package_status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : row.package_status === "declined"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {row.package_status}
                            </span>
                          </td>
                          <td className="py-3 px-6 border border-gray-200">
                            {row.package_name}
                          </td>

                          <td className="py-3 px-6 border border-gray-200">
                            {formatDateForTable(row.start_date)}
                          </td>

                          <td className="py-3 px-6 border border-gray-200">
                            {formatDateForTable(row.end_date)}
                          </td>

                          <td className="py-3 px-6 border border-gray-200">
                            {formatDateForTable(row.trial_date)}
                          </td>

                          <td className="py-3 px-6 border border-gray-200">
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={() => {
                                  setSelectedPlanId(row.user_plan_id);
                                  setSelectedStatus(row.package_status); // optional: pre-fill current status
                                  setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 bg-yellow-500 text-white px-3 py-1 rounded"
                              >
                                <FaSyncAlt />
                                Update
                              </button>
                              <button
                                className="bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-2"
                                onClick={() => {
                                  setEditPlanId(row.user_plan_id);
                                  setEditFormData({
                                    start_date: parseToLocalDate(
                                      row.start_date
                                    ),
                                    end_date: parseToLocalDate(row.end_date),
                                    trial_date: parseToLocalDate(
                                      row.trial_date
                                    ),
                                  });

                                  setIsEditModalOpen(true);
                                }}
                              >
                                <FaEdit />
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-4 px-6 text-gray-500 text-center border border-gray-200"
                        >
                          No Package Subscription Found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between mt-7">
                {data.length > 0 && (
                  <div className="mt-10">
                    <div className="float-right flex items-center space-x-2">
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
                            currentPage === page
                              ? "bg-[#1C1D3E] text-white"
                              : ""
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
              </div>
            </div>
          </section>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>

            <select
              className="w-full border p-2 rounded mb-4"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Decline</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => handleUpdateStatus()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Edit Plan Dates</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={editFormData.start_date}
                  max={getMaxStartDate()} // Prevent selecting dates beyond end date
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={editFormData.end_date}
                  min={getMinEndDate()} // Prevent selecting dates before start date
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      end_date: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Trial Date</label>
                <input
                  type="date"
                  value={editFormData.trial_date}
                  min={getMinTrialDate()} // Prevent selecting dates before start date
                  max={getMaxTrialDate()} // Prevent selecting dates beyond end date
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      trial_date: e.target.value,
                    })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={handleEditPlanSubmit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompanySubscriptionList;
