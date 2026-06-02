import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import axios from "axios";
const GeneralSetting = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const [data, setData] = useState([]);
  const [formdata,setFormdata]=useState({
      company_name:"",
      email:"",
      contact_no:"",
      address:"",
      brand_logos_header:"",
      testimonials_header:"",
      contact_header:"",
      contact_description:"",
      footer_short_description:"",
      footer_company_link:"",
      company_logo:null
  })


  
   const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormdata((prevData) => ({
      ...prevData,
      [name]: type === "file" ? files[0] : value,
    }));
  };
    
  const getgeneraldata = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/generalsettings`);
      setData(response.data); // Assuming setData is a useState setter
    } catch (error) {
      console.log(error);
    }
  };
    // const saveData = async (e) => {
    //   e.preventDefault();
    //   try {
    //     const formDataToSend = new FormData();
    //     formDataToSend.append("company_name", formdata.company_name);
    //     formDataToSend.append("email", formdata.email);
    //     formDataToSend.append("contact_no", formdata.contact_no);
    //     formDataToSend.append("address", formdata.address);
    //     formDataToSend.append("brand_logos_header", formdata.brand_logos_header);
    //     formDataToSend.append("testimonials_header", formdata.testimonials_header);
    //     formDataToSend.append("contact_header", formdata.contact_header);
    //     formDataToSend.append("contact_description", formdata.contact_description);
    //     formDataToSend.append("footer_short_description", formdata.footer_short_description);
    //     formDataToSend.append("footer_company_link", formdata.footer_company_link);
  
    //     const response = await axios.post(
    //       `${API_BASE_URL}/generalsettings`,
    //       formDataToSend,
    //       {
    //         headers: {
    //           "Content-Type": "multipart/form-data",
    //         },
    //       }
    //     );
  
    //     if (response.status === 201) {
    //       toast.success(" added successfully!");
    //       setFormdata({
    //         company_name:"",
    //         email:"",
    //         contact_no:"",
    //         address:"",
    //         brand_logos_header:"",
    //         testimonials_header:"",
    //         contact_header:"",
    //         contact_description:"",
    //         footer_short_description:"",
    //         footer_company_link:"",
    //         company_logo:null
    //       });
    //     }
    //   } catch (error) {
    //     console.error(error);
    //     toast.error("Failed to submit data.");
    //   }
    // };
    const saveData = async (e) => {
      e.preventDefault();
      const formDataToSend = new FormData();
    
     
    
     formDataToSend.append("company_name", formdata.company_name);
          formDataToSend.append("email", formdata.email);
          formDataToSend.append("contact_no", formdata.contact_no);
          formDataToSend.append("address", formdata.address);
          formDataToSend.append("brand_logos_header", formdata.brand_logos_header);
          formDataToSend.append("testimonials_header", formdata.testimonials_header);
          formDataToSend.append("contact_header", formdata.contact_header);
          formDataToSend.append("contact_description", formdata.contact_description);
          formDataToSend.append("footer_short_description", formdata.footer_short_description);
          formDataToSend.append("footer_company_link", formdata.footer_company_link);


      if (formdata.company_logo instanceof File) {
        formDataToSend.append("company_logo", formdata.company_logo);
      }
    
      try {
        const response = await axios.put(
          `${API_BASE_URL}/generalsettings/3`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        console.log("Response:", response.data);
        getgeneraldata()
        toast.success("Updated successfully!");
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to submit the form.");
      }
    };

    // get by id data
    const getHomeData = async (id) => {
      id = 3;
      try {
        const response = await axios.get(`${API_BASE_URL}/generalsettings/${id}`);
        const data = response.data;
        console.log(data);
        setFormdata({
        company_name:data.company_name,
        email:data.email,
        contact_no:data.contact_no,
        address:data.address,
        brand_logos_header:data.brand_logos_header,
        testimonials_header:data.testimonials_header,
        contact_header:data.contact_header,
        contact_description:data.contact_description,
        footer_short_description:data.footer_short_description,
        footer_company_link:data.footer_company_link,
        company_logo:data.company_logo
         
        });
      } catch (error) {
        console.log(error);
      }
    };



useEffect(()=>{
  getHomeData()
  getgeneraldata()
},[])


  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />

        <div className=" w-full">
          <div className="flex-1 p-6">
            <h1 className="text-2xl font-bold mb-4">General Setting</h1>

            <form onSubmit={saveData} className="max-full mx-auto p-6 bg-white rounded-xl shadow-md space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Company Info</h2>

              {/* Company Logo (full width) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Logo
                </label>
                <input
                  name="company_logo"
                  onChange={handleChange}
                  type="file"
                  accept="image/*"
                  className="block w-full border border-[#0f044a] p-2 rounded"
                />
                  <section className="tabledata p-2 ">
  <div className="w-full mt-10 drop-shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {data.length > 0 ? (
      data.map((row, index) => (
        <div key={index} className="w-full">
          <img
            src={`${VITE_IMG_URL}${row.company_logo}`}
            alt={"name"}
            className="w-full h-auto object-contain rounded-md"
          />
        </div>
      ))
    ) : (
      <p>No images available</p>
    )}
  </div>
</section>
              </div>
            

              {/* Two-column section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                  onChange={handleChange}
                  value={formdata.company_name}
                  name="company_name"
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Contact No. */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact No.
                  </label>
                  <input
                    onChange={handleChange}
                    value={formdata.contact_no}
                  name="contact_no"
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    onChange={handleChange}
                    value={formdata.email}
                  name="email"
                    type="email"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                  name="address"
                  value={formdata.address}
                  onChange={handleChange}
                    rows="2"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 pt-6">
                Website Content
              </h2>

              {/* Two-column section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brand Logos Header */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Logos Header
                  </label>
                  <input
                  name="brand_logos_header"
                  onChange={handleChange}
                  value={formdata.brand_logos_header}
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Testimonials Header */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Testimonials Header
                  </label>
                  <input
                 name="testimonials_header" 
                 onChange={handleChange}
                 value={formdata.testimonials_header}
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Contact Header */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Header
                  </label>
                  <input
                   onChange={handleChange}
                  name="contact_header"
                  value={formdata.contact_header}
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-bg-[#0f044a] focus:border-blue-500"
                  />
                </div>

                {/* Contact Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Description
                  </label>
                  <textarea
                    rows="3"
                    onChange={handleChange}
                    value={formdata.contact_description}
                    name="contact_description"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>

                {/* Footer Short Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Footer Short Description
                  </label>
                  <textarea
                    rows="2"
                    onChange={handleChange}
                    value={formdata.footer_short_description}
                    name="footer_short_description"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>

                {/* Footer Company Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Footer Company Link
                  </label>
                  <input
                  name="footer_company_link"
                  value={formdata.footer_company_link}
                  onChange={handleChange}
                    type="url"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="bg-[#0f044a] text-white px-6 py-2 rounded-md hover:bg-[#463897] transition"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default GeneralSetting;
