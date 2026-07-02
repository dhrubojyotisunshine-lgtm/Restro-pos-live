import React from "react";
const DeleteDialogBox = ({ show, onClose, onDelete ,type}) => {
  if (!show) {
    return null;
  }
  return (
  <div
  className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex items-center justify-center z-50"
  onClick={onClose} // Close when clicking outside
>
  <div
    className="bg-white rounded-lg p-6 w-1/3 border-[2px] border-[#4CBBA1] shadow-lg"
    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
  >
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Delete 
      </h2>
      <p className="text-gray-600 mb-6">
        Are you sure you want to delete this {type}?
      </p>
      <div className="flex gap-x-3 justify-center items-center">
        <button
          onClick={onDelete}
          className="bg-[#FB3F3F] text-white px-6 py-2 rounded-md text-lg"
        >
          OK
        </button>
        <button
          onClick={onClose}
          className="bg-gray-400 text-white px-6 py-2 rounded-md text-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</div>

  );
};
export default DeleteDialogBox;
