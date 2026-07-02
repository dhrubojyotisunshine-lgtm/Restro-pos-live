import React from "react";
const FloorDialogBox = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
  {/* Overlay (click to close) */}
  <div
    className="fixed inset-0 bg-slate-800 opacity-55"
    onClick={onClose}
  ></div>

  {/* Modal Content (click inside shouldn't close) */}
  <div
    className="relative z-50 w-full md:w-1/2 px-6"
    onClick={(e) => e.stopPropagation()}
  >
    <div className="py-4 bg-white rounded-md shadow-md border border-[#1C1D3E]">
      {/* Header */}
      <div className="flex py-5 px-4 justify-between items-center border-b border-black">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          onClick={onClose}
          className="text-white bg-[#FB3F3F] px-2 hover:scale-105 font-bold rounded"
        >
          X
        </button>
      </div>

      {/* Modal Body */}
      <div className="px-4 py-2">{children}</div>
    </div>
  </div>
</div>

  );
};

export default FloorDialogBox;
