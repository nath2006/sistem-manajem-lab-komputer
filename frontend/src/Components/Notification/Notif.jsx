
import React from 'react';
import { FaTimes } from "react-icons/fa";

const Notification = ({ type, message, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`relative ${bgColor} px-4 py-2 rounded-lg text-white`}>
      <p>{message}</p>
      {onClose && (
        <button 
          onClick={onClose} 
          className="absolute top-2 right-1 mt-1 mr-2"
        >
          <FaTimes className="text-white" />
        </button>
      )}
    </div>
  );
};

export default Notification;
