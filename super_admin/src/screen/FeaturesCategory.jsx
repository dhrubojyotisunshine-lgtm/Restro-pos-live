import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import axios from "axios";
import { FaRegEdit } from "react-icons/fa";
import { FaRegTrashCan } from "react-icons/fa6";
import Tooltip from "../components/Tooltip";
import DeleteDialogBox from "../components/DeleteDialogBox";
import { MdDescription } from "react-icons/md";
import { useNavigate } from "react-router-dom";
const headers = ["SL.",  "Heading ", "Description","Status", "Action"];
const FeaturesCategory = () => {
  const navigate=useNavigate()
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
   const [showModal, setShowModal] = useState(false);
    const [deleteModalId, setDeleteModalId] = useState(null);
     const [isModalOpen, setIsModalOpen] = useState(false);
      const [editId, setEditId] = useState(null);
 const [data,setData]=useState([])
  const [formData, setFormData] = useState({
    heading: "",
    description: "",
    status: "active", // lowercase to match the select options
  });
 const [formData2,setFormData2]=useState({
    heading: "",
    description: "",
    status: "", 
 })
 const handleChange2 = (e) => {
    setFormData2({
      ...formData2,
      [e.target.name]: e.target.value,
    });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const saveData = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.heading || !formData.description) {
      toast.error("Please fill in all required fields.");
      return;
    }

   
  axios
  .post(`${API_BASE_URL}/Featurecategory`, formData)
  .then((response) => {
    if (response.status === 201) {
      toast.success("Data Saved Successfully");
      getFeturesSetting()
      setFormData({
        heading: "",
        description: "",
        status: "active",
      });
    }
  })
  .catch((error) => {
    toast.error("Error saving data");
    console.log(error);
  });
  };
   const getFeturesSetting =()=>{
    axios.get(`${API_BASE_URL}/Featurecategory`)
    .then((response)=>{
        if(response.status===200){
         setData(response.data)
         }
    })
    .catch((error)=>{
        console.log(error)
    })
   }

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
      .delete(`${API_BASE_URL}/Featurecategory/${id}`)
      .then((response) => {
        if (response.status === 200) {
          toast.success("Features category deleted successfully!");
          getFeturesSetting();
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete the banner.");
      });
  };


  const handleEditClick = (id) => {
    setEditId(id);
    setIsModalOpen(true);
    // Fetch data for the given ID
    axios.get(`${API_BASE_URL}/Featurecategory/${id}`).then((response) => {
      setFormData2({
        heading: response.data.heading,
        description: response.data.description,
        status: response.data.status,
      });
    });
  };

  
  
 const handleSubmit2 = async () => { 
  
  
    try {
     
     await axios.put(`${API_BASE_URL}/Featurecategory/${editId}`, formData2, {
      });
  
      
        toast.success("Update successfully!");
        setIsModalOpen(false)
        getFeturesSetting();
        // Reset the form on successful submission
   
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to update user.");
    }
  };
   useEffect(()=>{
    getFeturesSetting()
   },[])
  return (
    <>
      <div className="flex min-h-screen">
        <Navbar />

        <div className=" w-full">
          <div className="flex-1 p-6">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Add Features Category
                
              </h2>
              <button  className="bg-[#0f044a] text-zinc-100 p-1 rounded-md" onClick={()=>{navigate("/fetures-setting")}}> {"<-"} Back</button>
              </div>
            <form
              onSubmit={saveData}
              className="w-auto mx-auto space-y-6 bg-white p-2 rounded-lg shadow-md"
            >
             
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category Dropdown */}
                <div>
                  <label className=" text-lg font-medium text-gray-700 mb-1">
                    Heading
                  </label>
                  <input
                    onChange={handleChange}
                    value={formData.heading}
                    name="heading"
                    type="text"
                    placeholder="Enter title"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className=" text-lg font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    onChange={handleChange}
                    value={formData.status}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
<option value="inactive">Inactive</option>

                  </select>
                </div>
               
              </div>

              {/* Description */}
              <div>
                <label className=" text-lg font-medium text-gray-700 mb-1  ">
                  Description
                </label>
                <textarea
                  onChange={handleChange}
                  value={formData.description}
                  rows="4"
                  name="description"
                  placeholder="Enter description"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-[#0f044a] text-white px-6 py-2 rounded-md hover:bg-[#281e5f] transition"
                >
                  Save
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
                        {row.heading}
                      </td>
                      <td className="py-2 px-4 border border-[#4CBBA1]">
                        {row.description}
                      </td>
                      <td className="py-2 px-4 border border-[#4CBBA1]">
                        {row.status}
                      </td>
                      <td className="py-2 px-4 border border-[#4CBBA1]">
                        <div className="flex justify-center gap-x-2 font-bold">
                          <Tooltip message="Edit">
                            <button
                              onClick={() => handleEditClick(row.category_id)}
                              className="bg-[#1C1D3E] p-1 rounded-sm text-white hover:scale-105"
                            >
                              <FaRegEdit />
                            </button>
                          </Tooltip>
                          <Tooltip message="Delete">
                            <button
                              onClick={() => handleDeleteClick(row.category_id)}
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
                      No Features Category Available
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
  <div className="w-96 py-3"> 
    <div className="py-4 bg-white rounded-md shadow-md border border-[#1C1D3E]">
      <div className="flex px-4 justify-between items-center border-b border-gray-300">
        <h2 className="text-lg font-semibold">Edit Features Category</h2>
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
              Category Heading
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
             Category Description
              </label>
              <textarea
                name="description"
                value={formData2.description}
                onChange={handleChange2}
               
                className="shadow w-full h-[50px] border-[#4CBBA1] appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              ></textarea>
            </div>
            
            <div>
                  <label className=" text-lg font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    onChange={handleChange2}
                    value={formData2.status}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
<option value="inactive">Inactive</option>

                  </select>
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
    />
    </>
  );
};

export default FeaturesCategory;
