import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import axios from "axios";
import { FaRegEdit } from "react-icons/fa";
import { FaRegTrashCan } from "react-icons/fa6";
import Tooltip from "../components/Tooltip";
import DeleteDialogBox from "../components/DeleteDialogBox";
const headers = ["SL.", "Image", "Heading ", "Description", "Action"];
const HomeFeatures_Setting = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const getBannerData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/createfeatures`);
      setData(response.data.data); // Assuming setData is a useState setter
    } catch (error) {
      console.log(error);
    }
  };

  const [formdata, setFormdata] = useState({
    heading: "",
    description: "",
    image: null,
  });
  const [formData2, setFormData2] = useState({
    heading: "",
    description: "",
    image: null,
  });
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormdata({
      ...formdata,
      [name]: value,
    });
  };
  const handelImageChange = (e) => {
    setFormdata({
      ...formdata,
      image: e.target.files[0],
    });
  };

  const handelImageChange2 = (e) => {
    setFormdata({
      ...formData2,
      image: e.target.files[0],
    });
  };

  const saveData = async (e) => {
    e.preventDefault();
    try {
      if (!formdata.heading) {
        toast.error("Heading is required.");
        return;
      }
      if (!formdata.image) {
        toast.error("Image is required.");
        return;
      }
      if (!formdata.description) {
        toast.error("Description is required.");
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("heading", formdata.heading);
      formDataToSend.append("description", formdata.description);
      formDataToSend.append("image", formdata.image);

      const response = await axios.post(
        `${API_BASE_URL}/createfeatures`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 201) {
        toast.success("Features added successfully!");
        getBannerData();
        setFormdata({
          heading: "",
          description: "",
          image: null,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit data.");
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
      .delete(`${API_BASE_URL}/createfeatures/${id}`)
      .then((response) => {
        if (response.status === 200) {
          toast.success("Home Features deleted successfully!");
          getBannerData();
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete the banner.");
      });
  };

  // edit
  const handleEditClick = (id) => {
    setEditId(id);
    setIsModalOpen(true);
    // Fetch data for the given ID
    axios.get(`${API_BASE_URL}/createfeatures/${id}`).then((response) => {
      setFormData2({
        heading: response.data.heading,
        description: response.data.description,
        image: response.data.image,
      });
    });
  };


  const handleChange2 = (e) => {
    setFormData2({
      ...formData2,
      [e.target.name]: e.target.value,
    });
  };
  
 const handleSubmit2 = async () => { 
    const data = new FormData();
    data.append("heading", formData2.heading);
    data.append("description", formData2.description);
    // Append the image if it's selected
    if (formData2.image) {
      data.append("image", formData2.image); 
    }
  
    try {
     
      const response = await axios.put(`${API_BASE_URL}/createfeatures/${editId}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      if (response.status === 200) {
        toast.success("Update successfully!");
        setIsModalOpen(false)
        getBannerData();
        // Reset the form on successful submission
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to update user.");
    }
  };
  useEffect(() => {
    getBannerData();
  }, []);
  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />

        <div className=" w-full">
          <div className="flex-1 p-6">
            <h1 className="text-2xl font-bold mb-4">Home Features Settings</h1>

            <form
              onSubmit={saveData}
              className="space-y-6  bg-white p-6 rounded shadow"
            >
              {/* Side Image Upload */}
              <div className=" flex justify-center items-center gap-x-8 ">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Features Image
                  </label>
                  <input
                    name="image"
                    onChange={handelImageChange}
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
                    name="heading"
                    value={formdata.heading}
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
                  name="description"
                  onChange={handleChange}
                  value={formdata.description}
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
          <section className="tabledata p-2">
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
                  {data.length > 0 ? (
                    data.map((row, index) => (
                      <tr key={index}>
                        <td className="py-2 px-4 border border-[#4CBBA1]">
                          {index + 1}
                        </td>
                        <td className="py-2 px-4 border border-[#4CBBA1]">
                          <img
                            src={`${VITE_IMG_URL}${row.image}`}
                            alt="image"
                            className="w-[80px] h-[60px] mx-auto text-wrap text-sm"
                          />
                        </td>
                        <td className="py-2 px-4 border border-[#4CBBA1]">
                          {row.heading}
                        </td>
                        <td className="py-2 px-4 border border-[#4CBBA1]">
                          {row.description}
                        </td>
                        <td className="py-2 px-4 border border-[#4CBBA1]">
                          <div className="flex justify-center gap-x-2 font-bold">
                            <Tooltip message="Edit">
                              <button
                                onClick={() => handleEditClick(row.id)}
                                className="bg-[#1C1D3E] p-1 rounded-sm text-white hover:scale-105"
                              >
                                <FaRegEdit />
                              </button>
                            </Tooltip>
                            <Tooltip message="Delete">
                              <button
                                onClick={() => handleDeleteClick(row.id)}
                                className="bg-[#FB3F3F] p-1 rounded-sm text-white hover:scale-105"
                              >
                                <FaRegTrashCan />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-2 px-4 border border-[#4CBBA1] text-center"
                      >
                        No Home Features available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      {isModalOpen &&(
        <>
  <div className="justify-center flex items-center overflow-x-hidden overflow-y-auto p-10 fixed inset-0 z-50 outline-none focus:outline-none">
    <div className="w-96 py-3"> {/* Reduced width to 24rem (96) */}
      <div className="py-4 bg-white rounded-md shadow-md border border-[#1C1D3E]">
        <div className="flex px-4 justify-between items-center border-b border-gray-300">
          <h2 className="text-lg font-semibold">Edit Home Features</h2>
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-white bg-[#FB3F3F] px-2 hover:scale-105 font-bold rounded"
          >
            X
          </button>
        </div>
        <div className="p-4">
          <form>
            <div className="grid grid-cols-2 gap-4 pt-4 pb-8">
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="firstname">
                Features Heading
                </label>
                <input
                  value={formData2.heading}
                  onChange={handleChange2}
                  type="text"
                  maxLength={30}
                  name="heading"
                  placeholder="Heading"
                  className="shadow border border-[#4CBBA1] w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
             
              <div className=" col-span-1">
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="about">
                Features Description
                </label>
                <textarea
                  name="description"
                  value={formData2.description}
                  onChange={handleChange2}
                  placeholder="Description"
                  className="shadow w-full h-[50px] border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="image">
                Features Image
                </label>
                <input
                  className="shadow w-full border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="image"
                  name="image"
                  type="file"
                  onChange={handelImageChange2}
                />
              </div>
             
             
             
             
              </div>
             
          
            <div className="flex justify-end space-x-4">
            
              <button
                type="button"
                onClick={handleSubmit2}
                className="w-[104px] h-[42px] bg-[#1C1D3E] text-white rounded-md"
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
        name={"Home Features"}
      />
    </>
  );
};

export default HomeFeatures_Setting;
