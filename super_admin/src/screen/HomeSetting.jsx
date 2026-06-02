import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import axios from "axios";
const HomeSetting = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const [data, setData] = useState([]);
 
  const getBannerData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/homesetting`);
      setData(response.data.data); // Assuming setData is a useState setter
    } catch (error) {
      console.log(error);
    }
  };

  const [formdata, setFormdata] = useState({
    banner_heading: "",
    banner_description: "",
    banner_image: null,
  });
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormdata((prevData) => ({
      ...prevData,
      [name]: type === "file" ? files[0] : value,
    }));
  };
 
  // const saveData = async (e) => {
  //   e.preventDefault();
  //   try {
  //     if (!formdata.banner_heading) {
  //       toast.error("Heading is required.");
  //       return;
  //     }
  //     if (!formdata.banner_image) {
  //       toast.error("Image is required.");
  //       return;
  //     }
  //     if (!formdata.banner_description) {
  //       toast.error("Description is required.");
  //       return;
  //     }

  //     const formDataToSend = new FormData();
  //     formDataToSend.append("banner_heading", formdata.banner_heading);
  //     formDataToSend.append("banner_description", formdata.banner_description);
  //     formDataToSend.append("banner_image", formdata.banner_image);

  //     const response = await axios.post(
  //       `${API_BASE_URL}/homesetting`,
  //       formDataToSend,
  //       {
  //         headers: {
  //           "Content-Type": "multipart/form-data",
  //         },
  //       }
  //     );

  //     if (response.status === 201) {
  //       toast.success("Banner added successfully!");
  //       getBannerData();
  //       setFormdata({
  //         banner_heading: "",
  //         banner_description: "",
  //         banner_image: null,
  //       });
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error("Failed to submit data.");
  //   }
  // };
  const saveData = async (e) => {
    e.preventDefault();
    const postData = new FormData();
  
    postData.append("banner_heading", formdata.banner_heading);
    postData.append("banner_description", formdata.banner_description);
  
    if (formdata.banner_image instanceof File) {
      postData.append("banner_image", formdata.banner_image);
    }
  
    try {
      const response = await axios.put(
        `${API_BASE_URL}/homesetting/23`,
        postData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
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
    id = 23;
    try {
      const response = await axios.get(`${API_BASE_URL}/homesetting/${id}`);
      const data = response.data;
      console.log(data);
      setFormdata({
        banner_heading: data.banner_heading,
        banner_description: data.banner_description,
        banner_image: data.banner_image,
       
      });
    } catch (error) {
      console.log(error);
    }
  };



  useEffect(() => {
    getBannerData();
    getHomeData()
  }, []);
  return (
    
     <>
     <div className="flex min-h-screen">
      <Navbar />
      <div className="w-full">
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-4">Home Banner Settings</h1>

          <form
            onSubmit={saveData}
            className="space-y-6  bg-white p-6 rounded shadow"
          >
            {/* Side Image Upload */}
            <div className=" flex justify-center items-center gap-x-8 ">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Banner Image
                </label>
                <input
                  name="banner_image"
                  onChange={handleChange}
                  type="file"
                  accept="image/*"
                  className="block w-full border border-[#0f044a] p-2 rounded"
                />
              </div>

              {/* Heading Field */}
              <div className=" w-full">
                <label className="block text-sm font-medium mb-1">
                  Heading
                </label>
                <input
                  name="banner_heading"
                  value={formdata.banner_heading}
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
                name="banner_description"
                onChange={handleChange}
                value={formdata.banner_description}
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
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Table */}

        <section className="tabledata p-2 ">
  <div className="w-full mt-10 drop-shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {data.length > 0 ? (
      data.map((row, index) => (
        <div key={index} className="w-full">
          <img
            src={`${VITE_IMG_URL}${row.banner_image}`}
            alt={row.Name}
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
    </div>
      
    </>
  );
};

export default HomeSetting;