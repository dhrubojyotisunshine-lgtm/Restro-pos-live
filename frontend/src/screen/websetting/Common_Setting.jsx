import React, { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import Hamburger from "hamburger-react";
import { IoMdNotifications } from "react-icons/io";
import { MdOutlineZoomOutMap } from "react-icons/md";
import { toast } from "react-toastify";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import useFullScreen from "../../components/useFullScreen";
import HasPermission from "../../store/HasPermission";

const Common_Setting = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const token = localStorage.getItem("token");
  const [isOpen, setOpen] = useState(true);
  const [dataa, setdataa] = useState([]);
  const { isFullScreen, toggleFullScreen } = useFullScreen();

  const initialValues = {
    restro_name: "",
    email: "",
    phone: "",
    phone_optional: "",
    logo: null,
    logo_footer: null,
    fevicon: null,
    address: "",
    powerbytxt: "",
    pos_id: localStorage.getItem("userId") || "",
  };

  const validationSchema = Yup.object().shape({
    restro_name: Yup.string().required("Restaurant name is required"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    phone: Yup.string()
      .matches(/^[0-9]+$/, "Phone number must be digits only")
      .required("Phone number is required"),
    address: Yup.string().required("Address is required"),
    logo: Yup.mixed()
      .test(
        "fileType",
        "Only png, jpg, jpeg, svg files are allowed",
        (value) =>
          !value ||
          (value &&
            ["image/png", "image/jpg", "image/jpeg", "image/svg+xml"].includes(
              value.type
            ))
      )
      .test(
        "fileSize",
        "File too large, max 2MB",
        (value) => !value || (value && value.size <= 2 * 1024 * 1024)
      ),
    logo_footer: Yup.mixed()
      .test(
        "fileType",
        "Only png, jpg, jpeg, svg files are allowed",
        (value) =>
          !value ||
          (value &&
            ["image/png", "image/jpg", "image/jpeg", "image/svg+xml"].includes(
              value.type
            ))
      )
      .test(
        "fileSize",
        "File too large, max 2MB",
        (value) => !value || (value && value.size <= 2 * 1024 * 1024)
      ),
    fevicon: Yup.mixed()
      .test(
        "fileType",
        "Only png, jpg, jpeg, svg files are allowed",
        (value) =>
          !value ||
          (value &&
            ["image/png", "image/jpg", "image/jpeg", "image/svg+xml"].includes(
              value.type
            ))
      )
      .test(
        "fileSize",
        "File too large, max 2MB",
        (value) => !value || (value && value.size <= 2 * 1024 * 1024)
      ),
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    const postData = new FormData();
    Object.keys(values).forEach((key) => {
      postData.append(key, values[key]);
    });

    try {
      const response = await axios.post(
        `${API_BASE_URL}/postcommission`,
        postData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: token,
          },
        }
      );
      console.log("Response:", response.data);
      toast.success("Update setting successfully!");
      setSubmitting(false);
      // resetForm(); // Uncomment if you want to reset after submit
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit the form.");
      setSubmitting(false);
    }
  };

  return (
    <div className="main_div">
      <section className="side_section flex">
        <div
          className={`${
            isOpen === false
              ? "hidden"
              : "nav-container hide-scrollbar h-screen overflow-y-auto"
          }`}
        >
          <Nav />
        </div>
        <header>
          <Hamburger toggled={isOpen} toggle={setOpen} />
        </header>
        <div className="contant_div w-full ml-4 pr-7 mt-4 nav-container hide-scrollbar h-screen overflow-y-auto">
          <div className="activtab flex justify-between">
            <h1 className="flex items-center justify-center gap-1 font-semibold">
              General Setting
            </h1>
            <div className="notification flex gap-x-5">
              <IoMdNotifications className="bg-[#1C1D3E] text-white rounded-sm p-1 text-4xl" />
              <MdOutlineZoomOutMap
                onClick={toggleFullScreen}
                className="bg-[#1C1D3E] text-white cursor-pointer rounded-sm p-1 text-4xl"
              />
            </div>
          </div>

          <div className="mt-28 border-[1px] border-[#4CBBA1] bg-white rounded-sm">
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ setFieldValue, isSubmitting, values }) => (
                <Form>
                  <div className="pt-11 pb-16 pr-24">
                    {/* Restaurant Name */}
                    <div className="mb-11 flex gap-x-7">
                      <label className="m-auto w-[300px] text-right text-nowrap text-gray-700 font-semibold mb-2">
                        Restro Name
                      </label>
                      <Field
                        type="text"
                        name="restro_name"
                        className="shadow border border-[#4CBBA1] w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                      <ErrorMessage
                        name="restro_name"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* Email */}
                    <div className="mb-11 flex gap-x-7">
                      <label className="m-auto w-[300px] text-right text-nowrap text-gray-700 font-semibold mb-2">
                        Email Address
                      </label>
                      <Field
                        type="email"
                        name="email"
                        className="shadow border border-[#4CBBA1] w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                      <ErrorMessage
                        name="email"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* Phone */}
                    <div className="mb-11 flex gap-x-7">
                      <label className="m-auto w-[300px] text-right text-nowrap text-gray-700 font-semibold mb-2">
                        Mobile Number
                      </label>
                      <Field
                        type="text"
                        name="phone"
                        maxLength={15}
                        className="shadow border border-[#4CBBA1] w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                      <ErrorMessage
                        name="phone"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* Optional Phone */}
                    <div className="mb-11 flex gap-x-7">
                      <label className="m-auto w-[300px] text-right text-nowrap text-gray-700 font-semibold mb-2">
                        Phone Number
                      </label>
                      <Field
                        type="text"
                        name="phone_optional"
                        className="shadow border border-[#4CBBA1] w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                      <ErrorMessage
                        name="phone_optional"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* File Inputs */}
                    {["logo", "logo_footer", "fevicon"].map((fileName, idx) => (
                      <div key={idx} className="mb-11 flex gap-x-2">
                        <div className="flex gap-x-7">
                          <label className="m-auto w-[230px] text-right text-nowrap text-gray-700 font-semibold mb-2">
                            {fileName === "fevicon"
                              ? "Fav & Nav Icon"
                              : fileName === "logo_footer"
                              ? "Footer Logo"
                              : "Logo"}
                            <h1 className="text-xs">Select icon for change</h1>
                          </label>
                          <input
                            type="file"
                            name={fileName}
                            onChange={(e) =>
                              setFieldValue(fileName, e.currentTarget.files[0])
                            }
                            className="shadow border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          />
                          <ErrorMessage
                            name={fileName}
                            component="div"
                            className="text-red-500 text-sm mt-1"
                          />
                          <div>
                            {dataa.map((val) => (
                              <img
                                key={val.id}
                                src={`${VITE_IMG_URL}${val[fileName]}`}
                                alt="preview"
                                className="w-[200px] h-[100px] mx-auto text-wrap text-sm"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Address */}
                    <div className="mb-11 flex gap-x-7">
                      <label className="m-auto w-[300px] text-right text-nowrap text-gray-700 font-semibold mb-2">
                        Address
                      </label>
                      <Field
                        as="textarea"
                        name="address"
                        className="shadow w-full h-[100px] border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                      <ErrorMessage
                        name="address"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* Powered By Text */}
                    <div className="mb-11 gap-x-7">
                      <label className="m-auto w-[300px] text-right text-nowrap text-gray-700 font-semibold mb-2">
                        Powered By Text
                      </label>
                      <Field
                        as="textarea"
                        name="powerbytxt"
                        className="shadow w-full h-[100px] border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                      <ErrorMessage
                        name="powerbytxt"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* Buttons */}
                    <HasPermission module="Add User" action="create">
                      <div className="float-right flex ml-16 space-x-4">
                        <button
                          type="reset"
                          className="w-[104px] h-[42px] bg-[#4CBBA1] text-gray-50 rounded-md"
                        >
                          Reset
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-[104px] h-[42px] bg-[#1C1D3E] text-white rounded-md"
                        >
                          {isSubmitting ? "Submitting..." : "Update"}
                        </button>
                      </div>
                    </HasPermission>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Common_Setting;
