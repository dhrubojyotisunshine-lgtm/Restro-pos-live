import React, { useEffect, useState } from 'react'
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import axios from "axios";
const Privacy_PolicySetting = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  
   const [formdata, setFormdata] = useState({
      title: "",
      content: "",
    
    });
    const handleChange = (e) => {
      const { name, value, type, files } = e.target;
      setFormdata((prevData) => ({
        ...prevData,
        [name]: type === "file" ? files[0] : value,
      }));
    };
    const getBannerData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/privacypolicy`);
      console.log(response)
    } catch (error) {
      console.log(error);
    }
  };
  //   const saveData = async (e) => {
  //   e.preventDefault();
  //   try {
  //     if (!formdata.title) {
  //       toast.error("Heading is required.");
  //       return;
  //     }
     
  //     if (!formdata.content) {
  //       toast.error("Description is required.");
  //       return;
  //     }

     
    

  //     const response = await axios.post(
  //       `${API_BASE_URL}/privacypolicy`,
  //       formdata,
       
  //     );

  //     if (response.status === 201) {
  //       toast.success("Banner added successfully!");
       
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error("Failed to submit data.");
  //   }
  // };
  const saveData = async (e) => {
    e.preventDefault();
   
  
   
  
    try {
      const response = await axios.put(
        `${API_BASE_URL}/privacypolicy/4`,
        formdata,
       
      );
      console.log("Response:", response.data);
      getBannerData()
      toast.success("Updated successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit the form.");
    }
  };

  const getHomeData = async (id) => {
    id = 4;
    try {
      const response = await axios.get(`${API_BASE_URL}/privacypolicy/${id}`);
      const data = response.data;
      console.log(data);
      setFormdata({
        title: data.title,
        content: data.content,
        
       
      });
    } catch (error) {
      console.log(error);
    }
  };
   useEffect(() => {
    
      getHomeData()
    }, []);
  return (
    <>
     <div className="flex min-h-screen">
      <Navbar />
      <div className="w-full">
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-4">Privecy policy Settings</h1>
 <form
            onSubmit={saveData}
            className="space-y-6  bg-white p-6 rounded shadow"
          >
            {/* Side Image Upload */}
            <div className=" flex justify-center items-center gap-x-8 ">
             

              {/* Heading Field */}
              <div className=" w-full">
                <label className="block text-sm font-medium mb-1">
                  Heading
                </label>
                <input
                  name="title"
                  value={formdata.title}
                  onChange={handleChange}
                  type="text"
                  placeholder="Enter heading"
                  className="block w-full border border-[#0f044a] p-2 rounded"
                />
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                rows="4"
                name="content"
                onChange={handleChange}
                value={formdata.content}
                placeholder="Enter description"
                className="block w-full border border-[#0f044a] p-2 rounded"
              ></textarea>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                className="bg-[#0f044a] text-white px-4 py-2 rounded hover:bg-[#1d144e]"
              >
              Update
              </button>
            </div>
          </form>
         
        </div>

        {/* Table */}

     
      </div>
    </div>
      
    </>
  )
}

export default Privacy_PolicySetting
