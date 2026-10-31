import React, { useContext, useEffect, useRef, useState } from "react";
import Nav from "../../components/Nav";
import Hamburger from "hamburger-react";
import { IoMdNotifications, IoIosAddCircleOutline } from "react-icons/io";
import { IoSettings } from "react-icons/io5";
import { LiaLanguageSolid } from "react-icons/lia";
import { MdOutlineZoomOutMap } from "react-icons/md";
import { FaMagnifyingGlass } from "react-icons/fa6";
import DialogBoxSmall from "../../components/DialogBoxSmall";
import { FaRegEdit } from "react-icons/fa";
import DeleteDialogBox from "../../components/DeleteDialogBox";
import { FaRegTrashCan } from "react-icons/fa6";
import axios from "axios";
import { toast } from "react-toastify";
import HasPermission from "../../store/HasPermission";
import useFullScreen from "../../components/useFullScreen";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { AuthContext } from "../../store/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
const Tooltip = ({ message, children }) => {
  return (
    <div className="group relative flex">
      {children}
      <span className="absolute bottom-7 scale-0 transition-all rounded bg-gray-800 p-2 text-xs text-white group-hover:scale-100">
        {message}
      </span>
    </div>
  );
};

const ActionButtons = [
 
  { btn: "CSV" },
  { btn: "Excel" },
  { btn: "PDF" },

];

const headers = ["SL.", "Customer Name", "E-mail", "Phone Number","Address","Action"];

const AddCustomer = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const [cModal, setCmodal] = useState(false);
  const [isOpen, setOpen] = useState(true);
 const[customer,setCustomer]=useState([])
 const [searchName, setSearchName] = useState("");
 const [deleteModalId, setDeleteModalId] = useState(null);
 const [showModal, setShowModal] = useState(false);
 const [formData, setFormdata] = useState({
  customer_name: "",
  customer_email: "",
  customer_address: "",
  customer_phone: "",
});
const { isFullScreen, toggleFullScreen } = useFullScreen();
// edit
const [isModalOpen, setIsModalOpen] = useState(false);
const [editId, setEditId] = useState(null);
const [formData2, setFormData2] = useState({
  customer_name: "",
  customer_email: "",
  customer_address: "",
  customer_phone: "",
  created_by:""
});

const token = localStorage.getItem("token");
const { canDo } = useContext(AuthContext);
const importInputRef = useRef(null);
const [showImportModal, setShowImportModal] = useState(false);
const [isDragging, setIsDragging] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);

const totalPages = Math.ceil(customer.length / itemsPerPage);
const selectPage = (page) => {
  if (page >= 1 && page <= totalPages) {
    setCurrentPage(page);
  }
};
const handleItemsPerPageChange = (e) => {
  setItemsPerPage(Number(e.target.value));
  setCurrentPage(1); // Reset to first page when items per page changes
};
// add customer
const handelChange = (e) => {
  setFormdata({ ...formData, [e.target.name]: e.target.value });
};

const submitAddcustomer = (e) => {
  e.preventDefault();

  const { customer_name, customer_email, customer_address, customer_phone } = formData;

  // Basic empty check
  if (!customer_name.trim() || !customer_email.trim() || !customer_address.trim() || !customer_phone.trim()) {
    toast.error("Please fill in all required fields");
    return;
  }

  // Email validation
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(customer_email)) {
    toast.error("Please enter a valid email address");
    return;
  }

  // Phone validation (10 digits only)
  if (!/^\d{10}$/.test(customer_phone)) {
    toast.error("Please enter a valid 10-digit phone number");
    return;
  }

  // Proceed with form submission
  axios
    .post(`${API_BASE_URL}/customer`, formData, {
      headers: {
        Authorization: token,
      },
    })
    .then((res) => {
      console.log(res.data);
      setCmodal(false);
      setFormdata({
        customer_name: "",
        customer_email: "",
        customer_address: "",
        customer_phone: "",
      });
      toast.success("Customer successfully added");
      getCustomer(); // Refresh customer list
    })
    .catch((error) => {
      console.error(error);
      toast.error("Failed to add customer");
    });
};


// get customer
  const getCustomer = () => {
    axios
      .get(`${API_BASE_URL}/customer`,{
        headers:{
          Authorization: token
        }
      })
      .then((res) => {
        console.log(res.data.data);
        setCustomer(res.data.data);
      })
      .catch((error) => {
        console.log(error);
      });
  };
// search
 const handleSearch = (e) => {
  const value = e.target.value.trim();
  setSearchName(value);
  setCurrentPage(1);

  // If input is empty, reset to all customers
  if (!value) {
    getCustomer();
    return;
  }

  axios
    .get(`${API_BASE_URL}/customer`, {
      params: { SearchItem: value },
      headers: { Authorization: token },
    })
    .then((res) => {
      setCustomer(res.data.data?.length ? res.data.data : []);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      toast.error("Error fetching filtered data");
    });
};



// delete 
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
    .delete(`${API_BASE_URL}/customer/${id}`)
    .then((res) => {
      console.log("Data Deleted");
      toast.success("delete customer sucessfully..")
      getCustomer();
    })
    .catch((err) => {
      console.log(err);
    });
};

// edit


const handleEditClick = (id) => {
  setEditId(id);
  setIsModalOpen(true);
  // Fetch data for the given ID
  axios.get(`${API_BASE_URL}/customer/${id}`, { headers: { Authorization: token } }).then((response) => {
    setFormData2({
      customer_name: response.data.data.customer_name,
      customer_email: response.data.data.customer_email,
      customer_address: response.data.data.customer_address,
      customer_phone: response.data.data.customer_phone, 
      created_by:response.data.data.created_by
    });
  });
};
const handleChange2 = (e) => {
  setFormData2({
    ...formData2,
    [e.target.name]: e.target.value,
  });
};

const handleSubmit2 = (e) => {
  e.preventDefault();

  // Simple manual validation before sending request
  if (!formData2.customer_name.trim()) {
    toast.error("Customer name is required");
    return;
  }

  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(formData2.customer_email)) {
    toast.error("Please enter a valid email address");
    return;
  }

  if (!/^\d{10}$/.test(formData2.customer_phone)) {
    toast.error("Please enter a valid 10-digit phone number");
    return;
  }

  // Proceed with API call
  axios.put(`${API_BASE_URL}/customer/${editId}`, formData2, { headers: { Authorization: token } })
    .then(() => {
      toast.success("Updated customer details successfully!");
      getCustomer();
      setIsModalOpen(false); // Close modal
    })
    .catch((error) => {
      console.error("Error updating data:", error);
       const errorMessage =
                    error.response && error.response.data && error.response.data.message
                      ? error.response.data.message
                      : "Error in updating data";
                      
                  toast.error(errorMessage);
    });
};


const processImportFile = async (file) => {
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  let rows = [];

  if (ext === "csv") {
    await new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => { rows = results.data; resolve(); },
      });
    });
  } else if (ext === "xlsx") {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1).values.slice(1);
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj = {};
      row.values.slice(1).forEach((val, i) => {
        obj[headerRow[i]] = val instanceof Date
          ? val.toISOString().split("T")[0]
          : val;
      });
      rows.push(obj);
    });
  } else {
    toast.error("Only .csv or .xlsx files are supported");
    return;
  }

  if (rows.length === 0) {
    toast.error("No data found in file");
    return;
  }

  try {
    const res = await axios.post(
      `${API_BASE_URL}customer/import`,
      { rows },
      { headers: { Authorization: token } }
    );
    toast.success(`Imported: ${res.data.imported}, Skipped: ${res.data.skipped}`);
    setShowImportModal(false);
    getCustomer();
  } catch (err) {
    toast.error(err.response?.data?.message || "Import failed");
  }
};

const handleImport = (e) => {
  processImportFile(e.target.files[0]);
  e.target.value = "";
};

const handleDrop = (e) => {
  e.preventDefault();
  setIsDragging(false);
  processImportFile(e.dataTransfer.files[0]);
};

const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
const handleDragLeave = () => setIsDragging(false);

const fetchData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customer`, { headers: { Authorization: token } });
    return response.data.data; // Assuming the data you need is in `response.data.data`
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
      
    Customer_Name:item.customer_name,
    Customer_Email:item.customer_email,
    Phone_Number:item.customer_phone,
    Customer_Address:item.customer_address,
  
    
   
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
    { header: "Customer Name", key: "customer_name" },
    { header: "Customer Email", key: "customer_email" },
    { header: "Phone Number", key: "phone_number" },
    { header: "Customer Address", key: "customer_address" },
   
  ];

  // Add rows
  data.forEach((item) => {
    worksheet.addRow({
      customer_name:item.customer_name,
    customer_email:item.customer_email,
    phone_number:item.customer_phone,
    customer_address:item.customer_address,
    
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
    item.customer_name,
    item.customer_email,
   item.customer_phone,
    item.customer_address,
  ]);

  // Add a title
  doc.text("Data Export", 20, 10);

  // Add a table
  autoTable(doc, {
    head: [
      [
         "Customer Name", "E-mail", "Phone Number","Customer Address"
        
      ],
    ],
    body: rows,
  });

  doc.save("data.pdf"); // PDF file name
};







  useEffect(()=>{
    getCustomer()
  },[])

  return (
   <>
    <div className="main_div">
        <section className="side_section flex">
          <div className={`${!isOpen ? "hidden" : "nav-container hide-scrollbar h-screen overflow-y-auto"}`}>
            <Nav />
          </div>
          <header>
            <Hamburger toggled={isOpen} toggle={setOpen} />
          </header>
          <div className="content_div w-full ml-4 pr-7 mt-4">
            <div className="activtab flex justify-between">
              <h1 className="flex items-center justify-center gap-1 font-semibold">
               Add Customer and Customer List 
              </h1>
              <div className="flex justify-between mt-11">
              <span></span>

             
             
            </div>
              <div className="notification flex gap-x-5">
                <IoMdNotifications className="bg-[#1C1D3E] text-white rounded-sm p-1 text-4xl" />
               
              <MdOutlineZoomOutMap  onClick={toggleFullScreen} className=" bg-[#1C1D3E] text-white cursor-pointer rounded-sm p-1 text-4xl" />
              </div>
            </div>


            <div className="flex justify-between mt-11">
              <span></span>
{canDo('add_customer', 'can_create') && (
  <HasPermission module="Add Customers" action="create">
    <div className="flex gap-x-2">
      <button
        onClick={() => setCmodal(true)}
        className="bg-[#4CBBA1] h-[46px] w-[165px] rounded-sm flex justify-center items-center gap-x-1 text-white font-semibold"
      >
        <IoIosAddCircleOutline className="font-semibold text-lg" />
        Add Customer
      </button>
      <button
        onClick={() => setShowImportModal(true)}
        className="bg-[#1C1D3E] h-[46px] px-4 rounded-sm flex justify-center items-center gap-x-1 text-white font-semibold"
      >
        Import
      </button>
    </div>
  </HasPermission>
)}
             
             
            </div>
            {/* Search Bar */}
            <div className="mt-11 w-full">
            <section className="table_button">
              <div className="order_button flex justify-evenly flex-wrap gap-x-5 gap-y-5">
                <div className="flex items-center space-x-2">
                  <label className="text-gray-900 pr-1">Display</label>
                  <div className="relative flex  items-baseline border-[1px] border-[#4CBBA1] p-1 rounded">
                    <h1>05 X</h1>
                    <select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      className="appearance-none w-16 pl-3 pr-8 py-1 rounded-md text-gray-700 focus:outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
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
                        ></path>
                      </svg>
                    </div>
                  </div>
                  <h1 className="">Records per page</h1>
                </div>

               
  {canDo('add_customer', 'can_export') && (
                  <div className="w-full sm:w-auto flex gap-x-4 downloadbutton">
                    <button
                      onClick={() => handleDownload("csv")}
                      className="hover:bg-[#1C1D3E] text-[#000] hover:scale-110 duration-300 hover:text-white border-[2px] border-zinc-300 rounded-md py-2 px-11 w-full sm:w-auto"
                    >
                      {" "}
                      CSV
                    </button>
                    <button
                      onClick={() => handleDownload("excel")}
                      className="hover:bg-[#1C1D3E] text-[#000] hover:scale-110 duration-300 hover:text-white border-[2px] border-zinc-300 rounded-md py-2 px-11 w-full sm:w-auto"
                    >
                      {" "}
                      Excel
                    </button>
                    <button
                      onClick={() => handleDownload("pdf")}
                      className="hover:bg-[#1C1D3E] text-[#000] hover:scale-110 duration-300 hover:text-white border-[2px] border-zinc-300 rounded-md py-2 px-11 w-full sm:w-auto"
                    >
                      {" "}
                      PDF
                    </button>
                  </div>
                  )}
 


                <div className="flex m-auto px-4  rounded-md border-[1px]   border-gray-900">
                  <button className="px-4 text-[#0f044a] text-sm">
                    <FaMagnifyingGlass />
                  </button>
                  <input
                      value={searchName}
                      onChange={handleSearch}
                      placeholder="Search ..."
                      type="search"
                      className="py-2 rounded-md text-gray-700 leading-tight focus:outline-none"
                    />
                </div>
              </div>
            </section>
          </div>
            <section className="tabledata">
              <div className="w-full mt-10 drop-shadow-md">
                <table className="min-w-full bg-white text-center">
                  <thead>
                    <tr>
                      {headers.map((header, index) => (
                        <th
                          key={index}
                          className="py-4 px-4 bg-[#4CBBA1] text-gray-50 uppercase text-sm"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                  {customer.length > 0 ? (
    customer.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ).map((row, index) => (
                          <tr key={row.id}>
                            <td className="py-2 px-4 border border-[#4CBBA1]">
                              {index + 1 + (currentPage - 1) * 5}
                            </td>
                            <td className="py-2 px-4 border border-[#4CBBA1]">
                              {row.customer_name ? row.customer_name:"Not found"}
                            </td>
                            <td className="py-2 px-4 border border-[#4CBBA1]">
                              {row.customer_email ? row.customer_email:"Not found"}
                            </td>
                            <td className="py-2 px-4 border border-[#4CBBA1]">
                              {row.customer_phone ? row.customer_phone:"Not found"}
                            </td>
                            <td className="py-2 px-4 border border-[#4CBBA1]">
                              {row.customer_address ? row.customer_address:"Not found"}
                            </td>
                            <td className="py-2 px-4 border border-[#4CBBA1]">
                              <div className="flex justify-center gap-x-2 font-bold">
                              {canDo('add_customer', 'can_edit') && (
                                <HasPermission module="Add Customers" action="edit">
                                  <Tooltip message="Edit">
                                    <button
                                      onClick={() => handleEditClick(row.customer_id)}
                                      className="bg-[#1C1D3E] p-1 rounded-sm text-white hover:scale-105">
                                      <FaRegEdit />
                                    </button>
                                  </Tooltip>
                                </HasPermission>
                              )}
                              {canDo('add_customer', 'can_delete') && (
                                <HasPermission module="Add Customers" action="delete">
                                  <Tooltip message="Delete">
                                    <button
                                      onClick={() => handleDeleteClick(row.customer_id)}
                                      className="bg-[#FB3F3F] p-1 rounded-sm text-white hover:scale-105"
                                    >
                                      <FaRegTrashCan />
                                    </button>
                                  </Tooltip>
                                </HasPermission>
                              )}
                              </div>
                            </td>
                          </tr>
                        )) ) : (
                          <tr>
                            <td colSpan={4} className="text-center py-4">
                              No data found
                            </td>
                          </tr>
                        )}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="flex justify-between mt-7">
              {customer.length > 0 && (
                <div className="mt-10">
                  <div className="float-right flex items-center space-x-2">
                    <button
                      onClick={() => selectPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-[46px] w-[70px] cursor-pointer border-[1px] border-[#1C1D3E] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {[
                      ...Array(Math.ceil(customer.length / itemsPerPage)),
                    ].map((_, index) => {
                      return (
                        <button
                          onClick={() => selectPage(index + 1)}
                          key={index}
                          className={`h-[46px] w-[50px] cursor-pointer border-[1px] border-[#1C1D3E] ${
                            currentPage === index + 1
                              ? "bg-[#1C1D3E] text-white"
                              : ""
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => selectPage(currentPage + 1)}
                      disabled={
                        currentPage ===
                        Math.ceil(customer.length / itemsPerPage)
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


      <DialogBoxSmall
        isOpen={cModal}
        title={"Add Customer"}
        onClose={() => {
          setCmodal(false);
        }}
      >
        <div className="">
          <form
            onSubmit={submitAddcustomer}
            className="bg-white rounded "
          >
            <div className="">
              <div className=" mb-2  mt-5">
                <label className="block mb-2  text-sm font-medium text-gray-700">
                  Customer Name*
                </label>
                <input
                  type="text"
                  onChange={handelChange}
                  value={formData.customer_name}
                  name="customer_name"
                  placeholder=" Customer Name"
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className=" mb-2  mt-5">
                <label className="block mb-2  text-sm font-medium text-gray-700">
                  Email Address*
                </label>
                <input
                  type="email"
                  required
                  pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                  onChange={handelChange}
                  value={formData.customer_email}
                  name="customer_email"
                  placeholder=" Customer E-mail"
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                /> <p className="text-xs text-gray-500 mt-1">
                  Enter a valid email (e.g., user@example.com)
                </p>
              </div>

              <div className=" mb-2  mt-5">
                <label className="block mb-2  text-sm font-medium text-gray-700">
                  Mobile*
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  onChange={handelChange}
                  value={formData.customer_phone}
                  name="customer_phone"
                  placeholder=" Mobile Number"
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className=" mb-2  mt-5">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Address*
                </label>
                <textarea
                  onChange={handelChange}
                  value={formData.customer_address}
                  name="customer_address"
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                ></textarea>
              </div>

              <div className="flex mt-4 float-right gap-x-3">
                <button
                  className="bg-[#4CBBA1] text-white w-[104px] h-[42px] rounded focus:outline-none focus:shadow-outline"
                  type="reset"
                >
                  Reset
                </button>
                <button
                  className="bg-[#1C1D3E] text-white w-[104px] h-[42px] rounded focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </DialogBoxSmall>

      {isModalOpen &&(
        <>
  <div className="justify-center flex items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
    <div className="max-w-md w-full px-6"> {/* Reduced width to max-w-md */}
      <div className="py-4 bg-white rounded-md shadow-md border border-[#1C1D3E]">
        <div className="flex py-5 px-4 justify-between items-center border-b border-black">
          <h2 className="text-xl font-semibold">Edit Customer Data</h2>
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-white bg-[#FB3F3F] px-2 hover:scale-105 font-bold"
          >
            X
          </button>
        </div>
        <div className="p-4">
          <form onSubmit={handleSubmit2} className="space-y-4">
            <div className="grid grid-cols-2 gap-4"> {/* 2-column layout */}
              <div className="mb-2">
                <label className="block mb-1 text-sm font-medium text-gray-700" htmlFor="customer_name">
                  Customer Name
                </label>
                <input
                  type="text"
                  onChange={handleChange2}
                  value={formData2.customer_name}
                  name="customer_name"
                  placeholder="Customer Name"
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="customer_name"
                />
              </div>

              <div className="mb-2">
                <label className="block mb-1 text-sm font-medium text-gray-700" htmlFor="customer_email">
                  Email Address
                </label>
                <input
                  type="email"
                   required
                  pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                  onChange={handleChange2}
                  value={formData2.customer_email}
                  name="customer_email"
                  placeholder="Customer E-mail"
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="customer_email"
                />
                 <p className="text-xs text-gray-500 mt-1">
                  Enter a valid email (e.g., user@example.com)
                </p>
              </div>

              <div className="mb-2">
                <label className="block mb-1 text-sm font-medium text-gray-700" htmlFor="customer_phone">
                  Mobile
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  onChange={handleChange2}
                  value={formData2.customer_phone}
                  name="customer_phone"
                  placeholder="Mobile Number"
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="customer_phone"
                /> <p className="text-xs text-gray-500 mt-1">
                  Enter 10 digit phone number
                </p>
              </div>

              <div className="mb-2 col-span-2"> {/* Full width for address */}
                <label className="block mb-1 text-sm font-medium text-gray-700" htmlFor="customer_address">
                  Address
                </label>
                <textarea
                  onChange={handleChange2}
                  value={formData2.customer_address}
                  name="customer_address"
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="customer_address"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-[#1C1D3E] text-white px-4 py-2 rounded-md"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  <div className="opacity-55 fixed inset-0 z-40 bg-slate-800"></div>
</>
)

}
  
    
 

      <DeleteDialogBox
        show={showModal}
        onClose={handleModalClose}
        onDelete={handleModalDelete}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={handleImport}
      />

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg w-[420px] p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Import Customers</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-white bg-red-500 rounded-sm w-7 h-7 flex items-center justify-center font-bold hover:bg-red-600"
              >
                ✕
              </button>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => importInputRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragging ? 'border-[#4CBBA1] bg-[#f0fdf9]' : 'border-gray-300 hover:border-[#4CBBA1]'}`}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="text-gray-600 font-medium">Drag & Drop your file here</p>
              <p className="text-gray-400 text-sm mt-1">or <span className="text-[#4CBBA1] underline">click to browse</span></p>
              <p className="text-gray-400 text-xs mt-3">Supported formats: .csv, .xlsx</p>
            </div>
            <div className="mt-4 text-center">
              <a href="/frontend/public/customer_import_sample.csv" download className="text-sm text-[#4CBBA1] underline">
                Download Sample File
              </a>
            </div>
          </div>
        </div>
      )}
   </>
  )
}

export default AddCustomer
