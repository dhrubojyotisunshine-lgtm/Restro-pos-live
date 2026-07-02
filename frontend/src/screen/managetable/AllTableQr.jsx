import React, { useContext, useEffect, useState } from "react";
import Hamburger from "hamburger-react";
import Nav from "../../components/Nav";
import axios from "axios";
import { AuthContext } from "../../store/AuthContext";
const AllTableQr = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const [isOpen, setOpen] = useState(true);
  const [tableData, setTableData] = useState([]);
const token = localStorage.getItem("token");

  const getallTable = () => {
    axios
      .get(`${API_BASE_URL}/table`,{
        headers:{
          Authorization: token
        }
      })
      .then((res) => {
        console.log(res.data.data);
        setTableData(res.data.data);
        console.log(tableData);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  useEffect(() => {
    getallTable();
  }, []);
  return (
    <>
      <div className="main_div">
        <section className=" side_section flex">
          <div
            className={`${
              isOpen == false
                ? "hidden"
                : "nav-container hide-scrollbar h-screen overflow-y-auto"
            }`}
          >
            <Nav />
          </div>
          <header className="">
            <Hamburger toggled={isOpen} toggle={setOpen} />
          </header>

          <div className=" w-full p-5">
            <section className="mt-5 ">
              <div className=" flex justify-between p-5 border-[1px] border-black  rounded-md bg-slate-50">
                <div>
                  <h1 className="font-bold text-2xl">ALL TABLE QR CODE</h1>
                </div>
                <div>
                  {/* <button className="bg-[#0f044a] text-[#fff] border-[2px] border-zinc-300 rounded-xl cursor-pointer  px-4 py-3">
                    print
                  </button> */}
                </div>
              </div>
              <section className="qr grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-6 rounded-md border-[1px] border-black p-5">
                {tableData.map((val, index) => (
                  <div key={index} className="text-center">
                    <img
                      className="border-emerald-200 border-[1px] rounded-md p-3" // Reduced padding
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${VITE_IMG_URL}frontend/qr-orders/${val.tableid}&size=200x200`} // Reduced size
                      alt="table icon"
                      title=""
                    />
                    <h1 className="mt-2 font-semibold text-lg">{`${val.tablename} QR CODE`}</h1>{" "}
                    {/* Reduced font size */}
                  </div>
                ))}
              </section>
            </section>
          </div>
        </section>
      </div>
    </>
  );
};
export default AllTableQr;
