import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";
import axios from "axios";
import { FaRegEdit } from "react-icons/fa";
import { FaRegTrashCan } from "react-icons/fa6";
import Tooltip from "../components/Tooltip";
import DeleteDialogBox from "../components/DeleteDialogBox";
import { useNavigate } from "react-router-dom";
const headers = ["SL.", "Image", "Category","Title", "Description", "Action"];

const FeaturesSetting = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const APP_URL = import.meta.env.VITE_APP_URL;
  const VITE_IMG_URL = import.meta.env.VITE_IMG_URL;
   const [showModal, setShowModal] = useState(false);
    const [deleteModalId, setDeleteModalId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
      const [editId, setEditId] = useState(null);
  const [data,setData]=useState([])
  const [data2,setData2]=useState([])

 const [formData,setFormData]=useState({
  title: "",
  description: "",
  image: null,
  category_id: "",
 })
 const [formData2, setFormData2] = useState({
  title: "",
  description: "",
  image: null,
  category_id: "",
  });
 const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData({
    ...formData,
    [name]: value,
  });
};
const handelImageChange=(e)=>{
  setFormData({
    ...formData,
    image: e.target.files[0],
  });
}
const handleChange2 = (e) => {
  const { name, value } = e.target;
  setFormData2({
    ...formData2,
    [name]: value,
  });
};
const handelImageChange2=(e)=>{
  setFormData2({
    ...formData2,
    image: e.target.files[0],
  });
}
const handleEditClick = (id) => {
  setEditId(id);
  setIsModalOpen(true);
  // Fetch data for the given ID
  axios.get(`${API_BASE_URL}/feature/${id}`).then((response) => {
    console.log(id)
    setFormData2({
      title: response.data.data.title,
      description: response.data.data.description,
      image: response.data.data.image,
      category_id: response.data.data.category_id,
    });
  });
};

const handleSubmit2 = async () => { 
  const data = new FormData();
  data.append("title", formData2.title);
  data.append("description", formData2.description);
  data.append("category_id", formData2.category_id);
  // Append the image if it's selected
  if (formData2.image) {
    data.append("image", formData2.image); 
  }

  try {
   
    const response = await axios.put(`${API_BASE_URL}/feature/${editId}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.status === 200) {
      toast.success("Update successfully!");
      setIsModalOpen(false)
      getallFetures();
      // Reset the form on successful submission
    }
  } catch (error) {
    console.error("Error submitting form:", error);
    toast.error("Failed to update user.");
  }
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
 const getallFetures =()=>{
  axios.get(`${API_BASE_URL}/feature`)
  .then((response)=>{
      if(response.status===200){
        setData2(response.data)
       }
  })
  .catch((error)=>{
      console.log(error)
  })
 }
 const saveData = (e) => {
  e.preventDefault();

  if (!formData.title || !formData.description || !formData.image || !formData.category_id) {
    toast.error("Please fill in all fields including image.");
    return;
  }

  const formDataToSend = new FormData();
  formDataToSend.append("title", formData.title);
  formDataToSend.append("description", formData.description);
  formDataToSend.append("image", formData.image);
  formDataToSend.append("category_id", formData.category_id);

  axios
    .post(`${API_BASE_URL}/feature`, formDataToSend, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((response) => {
      if (response.status === 201) {
        toast.success("Features added successfully.");
        setFormData({
          title: "",
          description: "",
          image: "",
          category_id: "",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      toast.error("Error saving features.");
    });
};
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
    .delete(`${API_BASE_URL}/feature/${id}`)
    .then((res) => {
        toast.success(" Features deleted successfully!");
        getallFetures();
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to delete the banner.");
    });
};

  const navigate = useNavigate();
  useEffect(()=>{
    getFeturesSetting();
     getallFetures();
  },[])
  return (
    <>
    <div className="flex min-h-screen">
      <Navbar />

      <div className=" w-full">
        <div className="flex-1 p-6">
           <div className="flex  justify-between mb-2">
           <h2 className="text-2xl font-bold text-gray-800 mb-4">Features Category <span className=" font-serif text-sm">add features category</span> </h2>
 <button  onClick={() => navigate('/featurescategory')} className=" bg-[#0f044a] text-zinc-100 p-2 font-semibold rounded-md">Add Category</button>
           </div>
         

          <form
  onSubmit={saveData}
  className="w-auto mx-auto space-y-6 bg-white p-6 rounded-xl shadow-md"
>
  <h2 className="text-2xl font-bold text-gray-800 mb-4">Add Features</h2>


  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Image
      </label>
      <input
        name="image"
        type="file"
        onChange={handelImageChange}
        accept="image/*"
        className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
        file:rounded-md file:border-0 file:text-sm file:font-semibold
        file:bg-blue-50 file:text-bg-[#0f044a] hover:file:bg-blue-100"
      />
    </div>

    {/* Category Dropdown */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Category
      </label>
      <select 
      name="category_id"
      value={formData.category_id}
      onChange={handleChange}
      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
      <option value="">Select option</option>
      {data.map((category) => (
  <option key={category.category_id} value={category.category_id}>
    {category.heading}
  </option>
))}
      </select>
    </div>

    {/* Title Input */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Title
      </label>
      <input
      name="title"
    onChange={handleChange}
    value={formData.title}
        type="text"
        placeholder="Enter title"
        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  </div>

  {/* Description */}
  <div >
    <label className="block text-sm font-medium text-gray-700 mb-1  ">
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
        <section className="tabledata p-2 mb-10">
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
                {data2.length > 0 ? (
                  data2.map((row, index) => (
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
                        {row.title}
                      </td>
                      <td className="py-2 px-4 border border-[#4CBBA1]">
                        {row.description}
                      </td>
                      <td className="py-2 px-4 border border-[#4CBBA1]">
                        <div className="flex justify-center gap-x-2 font-bold">
                          <Tooltip message="Edit">
                            <button
                              onClick={() => handleEditClick(row.feature_id)}
                              className="bg-[#1C1D3E] p-1 rounded-sm text-white hover:scale-105"
                            >
                              <FaRegEdit />
                            </button>
                          </Tooltip>
                          <Tooltip message="Delete">
                            <button
                              onClick={() => handleDeleteClick(row.feature_id)}
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
     {/* Modal Container */}
     <div className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto">
       <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-[#1C1D3E]">
         {/* Modal Header */}
         <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
           <h2 className="text-xl font-semibold text-gray-800">Edit Features</h2>
           <button
             onClick={() => setIsModalOpen(false)}
             className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
           >
             X
           </button>
         </div>
   
         {/* Modal Body */}
         <div className="px-6 py-5">
           <form>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
               {/* Title */}
               <div className="col-span-1">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                 <input
                   type="text"
                   name="title"
                   onChange={handleChange2}
                   value={formData2.title}
                   placeholder="Enter title"
                   className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                 />
               </div>
   
               {/* Category */}
               <div className="col-span-1">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                 <select
                   name="category_id"
                   value={formData2.category_id}
                   onChange={handleChange2}
                   className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="">Select option</option>
                   {data.map((category) => (
                     <option key={category.category_id} value={category.category_id}>
                       {category.heading}
                     </option>
                   ))}
                 </select>
               </div>
   
               {/* Description (full width) */}
               <div className="col-span-1 sm:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                 <textarea
                   rows="4"
                   name="description"
                   onChange={handleChange2}
                   value={formData2.description}
                   placeholder="Enter description"
                   className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                 ></textarea>
               </div>
   
               {/* Image Upload (full width) */}
               <div className="col-span-1 sm:col-span-2">
                 <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                   Feature Image
                 </label>
                 <input
                   id="image"
                   name="image"
                   type="file"
                   onChange={handelImageChange2}
                   className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 file:bg-blue-50 file:text-blue-700 file:rounded-md file:border-0 file:px-4 file:py-2 hover:file:bg-blue-100"
                 />
               </div>
             </div>
   
             {/* Footer Actions */}
             <div className="flex justify-end mt-6">
               <button
                 type="button"
                 onClick={handleSubmit2}
                 className="bg-[#1C1D3E] text-white px-6 py-2 rounded hover:bg-[#2b2c4f] transition"
               >
                 Save
               </button>
             </div>
           </form>
         </div>
       </div>
     </div>
   
     {/* Overlay */}
     <div className="fixed inset-0 bg-black opacity-50 z-40"></div>
   </>
   
)

}
    <DeleteDialogBox
      show={showModal}
      onClose={handleModalClose}
      onDelete={handleModalDelete}
    />
  </>
  )
}

export default FeaturesSetting
