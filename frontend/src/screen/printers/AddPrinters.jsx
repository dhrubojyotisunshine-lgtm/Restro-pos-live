import React, { useState, useEffect, useContext } from "react";
import Nav from "../../components/Nav";
import Hamburger from "hamburger-react";
import { IoMdNotifications } from "react-icons/io";
import { MdOutlineZoomOutMap } from "react-icons/md";
import axios from "axios";
import useFullScreen from "../../components/useFullScreen";
import { toast } from "react-toastify";
import { AuthContext } from "../../store/AuthContext";
import HasPermission from "../../store/HasPermission";

const AddPrinters = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token");
  const { canDo } = useContext(AuthContext);
  const { toggleFullScreen } = useFullScreen();
  const [isOpen, setOpen] = useState(true);
  const [kitchens, setKitchens] = useState([]);

  const initialFormData = {
    printer_name: "",
    printer_type: "",
    capability_profile: "",
    character_per_line: "",
    printer_path: "",
    port: "",
    kitchen_id: "",
  };

  const [formdata, setFormdata] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/getkitchen`, { headers: { Authorization: token } })
      .then((res) => setKitchens(res.data?.data || res.data || []))
      .catch(() => toast.error("Failed to load kitchens"));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormdata((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const isNetwork = formdata.printer_type === "network";

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = {};
    if (!formdata.printer_name.trim()) errors.printer_name = "Printer Name is required";
    if (!formdata.printer_type) errors.printer_type = "Connection Type is required";
    if (!formdata.capability_profile) errors.capability_profile = "Capability Profile is required";
    if (!formdata.character_per_line.toString().trim()) errors.character_per_line = "Characters per line is required";
    if (!formdata.kitchen_id) errors.kitchen_id = "Kitchen is required";
    if (isNetwork) {
      if (!formdata.printer_path.trim()) errors.printer_path = "IP Address is required";
      if (!formdata.port.toString().trim()) errors.port = "Port is required";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      printer_name: formdata.printer_name,
      printer_type: formdata.printer_type,
      printer_path: isNetwork ? formdata.printer_path : formdata.printer_name,
      port: isNetwork ? formdata.port : null,
      kitchen_id: formdata.kitchen_id,
      capability_profile: formdata.capability_profile,
      character_per_line: formdata.character_per_line,
    };

    axios
      .post(`${API_BASE_URL}/addprinter`, payload, { headers: { Authorization: token } })
      .then(() => {
        toast.success("Printer added successfully");
        setFormdata(initialFormData);
        setFormErrors({});
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to add printer";
        toast.error(msg);
      });
  };

  const inputClass =
    "shadow border border-[#4CBBA1] w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline";
  const labelClass =
    "m-auto w-[300px] text-right text-nowrap text-gray-700 font-semibold mb-2";
  const errorClass = "text-red-500 text-xs mt-1 ml-[316px]";

  return (
    <div className="main_div">
      <section className="side_section flex">
        <div className={`${!isOpen ? "hidden" : "nav-container hide-scrollbar h-screen overflow-y-auto"}`}>
          <Nav />
        </div>
        <header>
          <Hamburger toggled={isOpen} toggle={setOpen} />
        </header>

        <div className="contant_div w-full ml-4 pr-7 mt-4">
          <div className="activtab flex justify-between">
            <h1 className="flex items-center justify-center gap-1 font-semibold">
              Add Printer
            </h1>
            <div className="notification flex gap-x-5">
              <IoMdNotifications className="bg-[#1C1D3E] text-white rounded-sm p-1 text-4xl" />
              <MdOutlineZoomOutMap
                onClick={toggleFullScreen}
                className="bg-[#1C1D3E] text-white cursor-pointer rounded-sm p-1 text-4xl"
              />
            </div>
          </div>

          <div className="mt-10 border-[1px] border-[#4CBBA1] bg-white rounded-sm">
            <form onSubmit={handleSubmit}>
              <div className="pt-11 pb-16 pr-24">

                {/* Kitchen */}
                <div className="mb-11 flex gap-x-7">
                  <label className={labelClass} htmlFor="kitchen_id">Kitchen</label>
                  <div className="w-full">
                    <select
                      value={formdata.kitchen_id}
                      onChange={handleChange}
                      name="kitchen_id"
                      id="kitchen_id"
                      className={inputClass}
                    >
                      <option value="">Select Kitchen</option>
                      {kitchens.map((k) => (
                        <option key={k.id} value={k.id}>{k.kitchen_name}</option>
                      ))}
                    </select>
                    {formErrors.kitchen_id && <p className="text-red-500 text-xs mt-1">{formErrors.kitchen_id}</p>}
                  </div>
                </div>

                {/* Printer Name */}
                <div className="mb-11 flex gap-x-7">
                  <label className={labelClass} htmlFor="printer_name">Printer Name</label>
                  <div className="w-full">
                    <input
                      value={formdata.printer_name}
                      onChange={handleChange}
                      name="printer_name"
                      placeholder="Printer Name"
                      className={inputClass}
                      id="printer_name"
                    />
                    {formErrors.printer_name && <p className="text-red-500 text-xs mt-1">{formErrors.printer_name}</p>}
                  </div>
                </div>

                {/* Connection Type */}
                <div className="mb-11 flex gap-x-7">
                  <label className={labelClass} htmlFor="printer_type">Connection Type</label>
                  <div className="w-full">
                    <select
                      value={formdata.printer_type}
                      onChange={handleChange}
                      name="printer_type"
                      id="printer_type"
                      className={inputClass}
                    >
                      <option value="">Select Connection Type</option>
                      <option value="network">Network (LAN / Static IP)</option>
                      <option value="windows">Windows</option>
                      <option value="linux">Linux</option>
                    </select>
                    {formErrors.printer_type && <p className="text-red-500 text-xs mt-1">{formErrors.printer_type}</p>}
                  </div>
                </div>

                {/* IP Address — only for network */}
                {isNetwork && (
                  <div className="mb-11 flex gap-x-7">
                    <label className={labelClass} htmlFor="printer_path">
                      Static IP Address
                    </label>
                    <div className="w-full">
                      <input
                        value={formdata.printer_path}
                        onChange={handleChange}
                        name="printer_path"
                        placeholder="e.g. 192.168.1.100"
                        className={inputClass}
                        id="printer_path"
                      />
                      {formErrors.printer_path && <p className="text-red-500 text-xs mt-1">{formErrors.printer_path}</p>}
                    </div>
                  </div>
                )}

                {/* Port — only for network */}
                {isNetwork && (
                  <div className="mb-11 flex gap-x-7">
                    <label className={labelClass} htmlFor="port">Port</label>
                    <div className="w-full">
                      <input
                        value={formdata.port}
                        onChange={handleChange}
                        name="port"
                        type="number"
                        placeholder="9100"
                        className={inputClass}
                        id="port"
                      />
                      {formErrors.port && <p className="text-red-500 text-xs mt-1">{formErrors.port}</p>}
                    </div>
                  </div>
                )}

                {/* Capability Profile */}
                <div className="mb-11 flex gap-x-7">
                  <label className={labelClass} htmlFor="capability_profile">Capability Profile</label>
                  <div className="w-full">
                    <select
                      value={formdata.capability_profile}
                      onChange={handleChange}
                      name="capability_profile"
                      id="capability_profile"
                      className={inputClass}
                    >
                      <option value="">Select Capability Profile</option>
                      <option value="Default">Default</option>
                      <option value="simple">Simple</option>
                    </select>
                    {formErrors.capability_profile && <p className="text-red-500 text-xs mt-1">{formErrors.capability_profile}</p>}
                  </div>
                </div>

                {/* Characters per line */}
                <div className="mb-11 flex gap-x-7">
                  <label className={labelClass} htmlFor="character_per_line">Characters per line</label>
                  <div className="w-full">
                    <input
                      value={formdata.character_per_line}
                      onChange={handleChange}
                      name="character_per_line"
                      type="number"
                      placeholder="e.g. 32 for 58mm, 48 for 80mm"
                      className={inputClass}
                      id="character_per_line"
                    />
                    {formErrors.character_per_line && <p className="text-red-500 text-xs mt-1">{formErrors.character_per_line}</p>}
                  </div>
                </div>

                {canDo("printers", "can_create") && (
                  <HasPermission module="Printers" action="create">
                    <div className="float-right flex ml-16 space-x-4">
                      <button
                        type="reset"
                        className="w-[104px] h-[42px] bg-[#4CBBA1] text-gray-50 rounded-md"
                        onClick={() => { setFormdata(initialFormData); setFormErrors({}); }}
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        className="w-[104px] h-[42px] bg-[#1C1D3E] text-white rounded-md"
                      >
                        Save
                      </button>
                    </div>
                  </HasPermission>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AddPrinters;
