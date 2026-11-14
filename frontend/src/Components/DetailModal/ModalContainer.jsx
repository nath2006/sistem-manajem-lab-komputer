
import React from "react";

const ModalContainer = ({ title, subtitle, children, onClose, primaryButton, secondaryButton }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="m-4 lg:m-0 bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white px-8 py-6 border-b z-10 rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto scroll-smooth flex-grow">
          {children}
        </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white px-8 py-4 border-t z-10 rounded-b-xl">
        {secondaryButton ? (
          // If both primaryButton and secondaryButton are provided, show them
          <div className="flex justify-end gap-4 w-full">
            <div className="w-1/2">{secondaryButton}</div>
            <div className="w-1/2">{primaryButton}</div>
          </div>
        ) : (
          // Otherwise, show the default close button
          <button 
            onClick={onClose} 
            className="w-full bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium"
          >
            Tutup
          </button>
        )}
      </div>
      </div>
    </div>
  );
};

export default ModalContainer;
