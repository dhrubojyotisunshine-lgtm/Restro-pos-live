import React, { useContext, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import Hamburger from "hamburger-react";
import { MdOutlineZoomOutMap } from "react-icons/md";
import { NavLink } from "react-router-dom";
import logo from "../../assets/images/restrologo.png";
import {
  FaUserPlus,
  FaHandHoldingUsd,
  FaCalculator,
  FaMoneyCheck,
  FaNetworkWired,
} from "react-icons/fa";
import { IoMdNotifications } from "react-icons/io";
import useFullScreen from "../../components/useFullScreen";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { IoDocumentTextOutline, IoWalletOutline } from "react-icons/io5";
import { FaRegTrashCan } from "react-icons/fa6";
import { FaRegEye, FaRegEdit } from "react-icons/fa";

import { TfiHeadphoneAlt } from "react-icons/tfi";
import { MdCropRotate, MdOutlineZoomInMap, MdTableBar } from "react-icons/md";
import { CiSaveDown2 } from "react-icons/ci";
import { FaKitchenSet, FaKeyboard, FaMagnifyingGlass } from "react-icons/fa6";
import { IoQrCodeOutline } from "react-icons/io5";
import { IoMdCart, IoIosMan } from "react-icons/io";
import { RiTodoLine } from "react-icons/ri";
import Nav from "../../components/Nav";
import InvoiceDialogBox from "../../components/InvoiceDialogBox";
import axios from "axios";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { InvoiceDialogBox2 } from "../../components/InvoiceDialogeBox2";
import { AuthContext } from "../../store/AuthContext";
import { toast } from "react-toastify";
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
const TodayOrder = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const [isOpen, setOpen] = useState(true);
  const [invoiceData, setInvoiceData] = useState([]);
  const [invoiceDataModal, setInvoiceDataModal] = useState(false);
  const [todayData, setTodayData] = useState([]);
  const [todatTotal, setTodayTotal] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [billData, setBillData] = useState([]);
  const [searchName, setSearchName] = useState("");
  const token = localStorage.getItem("token");
  const { isFullScreen, toggleFullScreen } = useFullScreen();
  const OrderButtons = [
    { id: 1, title: "New Order", icon: <MdCropRotate />, link: "/order-list" },
    {
      id: 2,
      title: "On Going Order",
      icon: <CiSaveDown2 />,
      link: "/ongoing-order",
    },

    { id: 4, title: "QR Order", icon: <IoQrCodeOutline />, link: "/qr-order" },
    { id: 5, title: "Online Order", icon: <IoMdCart />, link: "/online-order" },
    { id: 6, title: "Today Order", icon: <RiTodoLine />, link: "/today-order" },
    {
      id: 3,
      title: "Kitchen Status",
      icon: <FaKitchenSet />,
      link: "/kitchen-status",
    },
  ];
  const ButtonsData2 = [
    { id: 1, title: "AddCust.", icon: <FaUserPlus /> },
    { id: 2, title: "Cust.type", icon: <TfiHeadphoneAlt /> },
    { id: 3, title: "Waiter", icon: <IoIosMan /> },
    { id: 4, title: "Shortcut", icon: <FaKeyboard /> },
    { id: 5, title: "Zoom", icon: <MdOutlineZoomInMap /> },
    { id: 6, title: "TableMgmt.", icon: <MdTableBar /> },
    { id: 7, title: "CaseReg.", icon: <FaMoneyCheck /> },
    { id: 8, title: "Calculator", icon: <FaCalculator /> },
    { id: 9, title: "Hold", icon: <FaHandHoldingUsd /> },
    { id: 10, title: "Transaction", icon: <FaNetworkWired /> },
  ];

  const ActionButtion = [{ btn: "CSV" }, { btn: "Excel" }, { btn: "PDF" }];

  const headers = [
    "SL.",
    "Invoice",
    "Customer Number",
    "Shipping Method name",
    "Shipping Date & Time",
    "Waiter",
    "Table No.",
    "Paynment Status",
    " Order Date",
    "Amount",
    "Action",
  ];

  const showInvoiceData = async (order_id) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/getOrderById/${order_id}`,
        { headers: { Authorization: token } }
      );
      setInvoiceData([response.data]);
      console.log("Invoice Data: ", invoiceData);
      setInvoiceDataModal(true);
    } catch (error) {
      console.error(error);
    }
  };
  // print
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });
  const showBillDetails = async (order_id) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/getOrderById/${order_id}`,
        { headers: { Authorization: token } }
      );
      setBillData([response.data]); // Set the data first

      // Delay the print action until after the state has been updated
      setTimeout(() => {
        handlePrint(); // Trigger the print
      }, 100); // A small timeout to ensure state update
    } catch (error) {
      console.error(error);
    }
  };
  const selectPage = (page) => {
    if (page > 0 && page <= Math.ceil(todayData.length / itemsPerPage)) {
      setCurrentPage(page);
    }
  };

  const getTodayData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/getTodayOrders`, {
        headers: {
          Authorization: token,
        },
      });
      setTodayData(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchName(value);
    setCurrentPage(1);
    if (value.trim() === "") {
      getTodayData();
      return;
    }

    axios
      .get(`${API_BASE_URL}/getTodayOrders`, {
        params: { searchItem: value },
        headers: {
          Authorization: token,
        },
      })
      .then((res) => {
        setTodayData(res.data.data.length > 0 ? res.data.data : []);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        toast.error("Error fetching filtered data");
      });
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/getTodayOrders`, {
        headers: {
          Authorization: token,
        },
      });
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

      Invoice: item.saleinvoice,
      Customer_Name: item.customer_name
        ? `${item.customer_name}`
        : "No Customer Found",
      Shipping_Method_Name: item.shipping_method_name
        ? item.shipping_method_name
        : "No shipping method found",
      Shipping_Date_Time: new Date(item.shipping_date).toLocaleString(),
      Waiter: `${item.waiter_first_name} ${item.waiter_last_name}`
        ? `${item.waiter_first_name} ${item.waiter_last_name}`
        : "No waiter found",
      Table_No: item.tablename ? item.tablename : "No table found",
      Paynment_Status: item.bill_status === 1 ? "Paid" : "Due",
      Order_Date: new Date(item.order_date).toLocaleString(),

      Amount: item.bill_amount,
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
      { header: "Invoice", key: "invoice" },
      { header: "Customer Name", key: "customer_name" },
      { header: "Shipping Method Name", key: "shipping_method_name" },
      { header: "Shipping Date Time", key: "shipping_date_time" },
      { header: "Waiter", key: "waiter" },
      { header: "Table No", key: "table_no" },
      { header: "Paynment Status", key: "paynment_status" },
      { header: "Order Date", key: "order_date" },
      { header: "Amount", key: "amount" },
    ];

    // Add rows
    data.forEach((item) => {
      worksheet.addRow({
        invoice: item.saleinvoice,
        customer_name: item.customer_name
          ? `${item.customer_name}`
          : "No Customer Found",
        shipping_method_name: item.shipping_method_name
          ? item.shipping_method_name
          : "No shipping method found",
        shipping_date_time: new Date(item.shipping_date).toLocaleString(),
        waiter: `${item.waiter_first_name} ${item.waiter_last_name}`
          ? `${item.waiter_first_name} ${item.waiter_last_name}`
          : "No waiter found",
        table_no: item.tablename ? item.tablename : "No table found",
        paynment_status: item.bill_status === 1 ? "Paid" : "Due",
        order_date: new Date(item.order_date).toLocaleString(),

        amount: item.bill_amount,
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
      item.saleinvoice,
      item.customer_name ? `${item.customer_name}` : "No Customer Found",
      item.shipping_method_name
        ? item.shipping_method_name
        : "No shipping method found",
      new Date(item.shipping_date).toLocaleString(),
      `${item.waiter_first_name} ${item.waiter_last_name}`
        ? `${item.waiter_first_name} ${item.waiter_last_name}`
        : "No waiter found",
      item.tablename ? item.tablename : "No table found",
      item.bill_status === 1 ? "Paid" : "Due",
      new Date(item.order_date).toLocaleString(),

      item.bill_amount,
    ]);

    // Add a title
    doc.text("Data Export", 20, 10);

    // Add a table
    doc.autoTable({
      head: [
        [
          "Invoice",
          "Customer Name",
          "Shipping Method name",
          "Shipping Date & Time",
          "Waiter",
          "Table No.",
          "Paynment Status",
          "Order Date",
          "Amount",
        ],
      ],
      body: rows,
    });

    doc.save("data.pdf"); // PDF file name
  };

  useEffect(() => {
    getTodayData();
  }, []);

  useEffect(() => {
    const total = todayData.reduce((sum, item) => {
      return sum + item.bill_amount;
    }, 0);
    setTodayTotal(total);
  }, [todayData]);

  return (
    <>
      <div className="main_div">
        <section className=" side_section flex">
          <div
            className={`${isOpen == false ? "hidden" : "nav-container hide-scrollbar h-screen overflow-y-auto"}`}
          >
            <Nav />
          </div>
          <header className="">
            <Hamburger toggled={isOpen} toggle={setOpen} />
          </header>
          <div>
            <section className="section1 flex  justify-between gap-x-3 pt-2 ">
              <div className=" flex gap-x-6">
                <div className="orderButton gap-x-2 flex ">
                  {OrderButtons.map((val, index) => (
                    <div
                      className={` ${index === 7 ? "pointer-events-none" : ""}`}
                      key={index}
                    >
                      <NavLink
                        to={val.link}
                        className={({ isActive }) =>
                          `h-[60px] font-semibold w-full px-7 py-3  rounded-md cursor-pointer flex justify-center items-center gap-3 ${
                            isActive
                              ? "bg-[#4CBBA1] text-white border-[#4CBBA1]"
                              : "bg-[#1C1D3E] text-[#fff] border-zinc-300 hover:bg-[#4CBBA1]"
                          }`
                        }
                      >
                        <span className="text-emerald-50 text-xl">
                          {val.icon}
                        </span>
                        {val.title}
                      </NavLink>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-x-5 ">
                <IoMdNotifications className="  bg-[#1C1D3E] text-white h-[60px] font-semibold w-full px-7 py-3  rounded-md cursor-pointer" />

                <MdOutlineZoomOutMap
                  //  onClick={toggleFullScreen}
                  className="  bg-[#1C1D3E] text-white h-[60px] font-semibold w-full px-7 py-3  rounded-md cursor-pointer"
                />
              </div>
            </section>
            <div className="mt-11 w-full">
              <section className="tablebutton">
                <div className="orderButton flex justify-evenly flex-wrap gap-y-5 gap-x-5 px-6">
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

                  <div className="w-full sm:w-auto flex items-center justify-center m-auto px-4 rounded-sm border-[1px] border-gray-900">
                    <button className="px-4 text-[#0f044a] text-sm">
                      <FaMagnifyingGlass />
                    </button>
                    <input
                      value={searchName}
                      onChange={handleSearch}
                      placeholder="Search ..."
                      type="search"
                      className="w-full sm:w-[450px] px-4 py-2 text-gray-700 leading-tight focus:outline-none"
                    />
                  </div>
                </div>
              </section>
            </div>

            <section className=" tabledata pr-4 pl-4 ">
              <div className=" w-full mt-10 border-[1px] border-[#4CBBA1] drop-shadow-[#4CBBA1]">
                <div className="">
                  <table className="min-w-full bg-white ">
                    <thead className="">
                      <tr>
                        {headers.map((header, index) => (
                          <th
                            key={index}
                            className="py-4 px-4 bg-[#4CBBA1] text-gray-50 tex uppercase text-sm"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {todayData.length > 0 &&
                        todayData
                          .slice(
                            (currentPage - 1) * itemsPerPage,
                            currentPage * itemsPerPage,
                          )
                          .map((row, index) => (
                            <tr key={index} className="border-b text-center ">
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {index + 1}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {row.saleinvoice}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {row.customer_name}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {row.shipping_type === null
                                  ? "Not defined"
                                  : row.shipping_method_name}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {(() => {
                                  const date = new Date(row.shipping_date);
                                  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                                })()}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {`${row.waiter_first_name} ${row.waiter_last_name}`}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {row.tablename}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {row.bill_status == 0 ? "Due" : "Paid"}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {(() => {
                                  const date = new Date(row.order_date);
                                  return `${date.toLocaleDateString()}`;
                                })()}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                {row.totalamount}
                              </td>
                              <td className="py-2 px-4 border border-[#4CBBA1]">
                                <div className=" flex gap-x-2 font-bold ">
                                  {/* <Tooltip message="Order">
                                    <button className=" bg-[#1C1D3E] p-1 rounded-sm text-white hover:scale-105">
                                      <IoMdCheckmarkCircleOutline />
                                    </button>
                                  </Tooltip> */}
                                  {/* <Tooltip message="Edit">
                                    {" "}
                                    <button className=" bg-[#1C1D3E] p-1 rounded-sm  text-white hover:scale-105">
                                      <FaRegEdit />
                                    </button>
                                  </Tooltip> */}

                                  <Tooltip message="Invoice">
                                    {" "}
                                    <button
                                      onClick={() =>
                                        showBillDetails(row.order_id)
                                      }
                                      className=" bg-[#1C1D3E] p-1 rounded-sm text-white hover:scale-105"
                                    >
                                      <IoDocumentTextOutline />
                                    </button>
                                  </Tooltip>

                                  {/* <Tooltip message="Paynment">
                                    <button className=" bg-[#1C1D3E] p-1 rounded-sm  text-white hover:scale-105">
                                      <IoWalletOutline />{" "}
                                    </button>
                                  </Tooltip> */}

                                  {/* <Tooltip message="Check Status">
                                    {" "}
                                    <button
                                      onClick={() => {
                                        showInvoiceData(row.order_id);
                                      }}
                                      className=" bg-[#1C1D3E] p-1 rounded-sm  text-white hover:scale-105"
                                    >
                                      <FaRegEye />
                                    </button>
                                  </Tooltip> */}

                                  <Tooltip
                                    message={
                                      row.status === "completed"
                                        ? "View Invoice"
                                        : "Invoice available after order complete"
                                    }
                                  >
                                    <button
                                      disabled={
                                        row.order_status === "completed"
                                      }
                                      onClick={() =>
                                        row.status === "completed" &&
                                        showInvoiceData(row.order_id)
                                      }
                                      className={`p-1 rounded-sm text-white hover:scale-105 ${
                                        row.status === "completed"
                                          ? "bg-[#1C1D3E] cursor-pointer"
                                          : "bg-gray-400 cursor-not-allowed"
                                      }`}
                                    >
                                      <FaRegEye />
                                    </button>
                                  </Tooltip>

                                  {/* <Tooltip message="Cancle Order">
                                    {" "}
                                    <button className=" bg-[#FB3F3F] p-1 rounded-sm text-white hover:scale-105">
                                      <FaRegTrashCan />
                                    </button>
                                  </Tooltip> */}
                                </div>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                  <h1 className="  font-bold mt-5 mb-4 pr-3 text-right w-full">
                    Total Today Amount :- {todatTotal}
                  </h1>
                </div>
              </div>
              <div className="flex justify-between mt-7">
                {todayData.length > 0 && (
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
                        ...Array(Math.ceil(todayData.length / itemsPerPage)),
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
                          Math.ceil(todayData.length / itemsPerPage)
                        }
                        className="h-[46px] w-[70px] cursor-pointer border-[1px] border-[#1C1D3E] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>

      <InvoiceDialogBox
        isOpen={invoiceDataModal}
        onClose={() => setInvoiceDataModal(false)}
        invoiceDatas={invoiceData}
        img={logo}
      ></InvoiceDialogBox>
      <div className=" hidden">
        <InvoiceDialogBox2 billData={billData} ref={componentRef} />
      </div>
    </>
  );
};

export default TodayOrder;
