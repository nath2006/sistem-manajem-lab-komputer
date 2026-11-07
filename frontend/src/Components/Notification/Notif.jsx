
import React from 'react';
import { FaTimes } from "react-icons/fa";

const Notification = ({ type, message, onClose, variant = 'status' }) => {
  const bgColor = variant === 'brand' ? 'bg-maroon' : type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div role={type === 'success' ? 'status' : 'alert'} className={`relative ${bgColor} pl-4 pr-10 py-2 rounded-lg text-white`}>
      <p>{message}</p>
      {onClose && (
        <button 
          type="button"
          aria-label="Tutup notifikasi"
          onClick={onClose} 
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1 rounded hover:bg-white/15 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <FaTimes className="text-white" />
        </button>
      )}
    </div>
  );
};

export default Notification;
