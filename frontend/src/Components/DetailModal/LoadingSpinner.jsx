/* eslint-disable no-unused-vars */
import React from "react";

const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-red-500"></div>
    </div>
  );
};

export default LoadingSpinner;