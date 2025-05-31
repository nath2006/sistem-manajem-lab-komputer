/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';

const DashboardCard = ({ to, title, count, description }) => {
  return (
    <Link
      to={to}
      className='overflow-hidden group cursor-pointer hover:shadow-lg active:shadow-md rounded-lg bg-white p-6 shadow-md relative transition-all duration-300 ease-in-out transform hover:-translate-y-1'
    >
      {/* Animated Ping Effect */}
      <span className='absolute -right-2 -top-2 flex h-6 w-6'>
        <span className='group-hover:animate-ping absolute inline-flex h-full w-full rounded-full bg-maroon opacity-75'></span>
        <span className='relative inline-flex rounded-full h-6 w-6 bg-maroon'></span>
      </span>
      <div className="flex flex-col space-y-4">
        <h1 className='text-xl font-semibold text-red-900'>{title}</h1>
        <h2 className='text-5xl font-extrabold text-gray-600'>{count}</h2>
        <span className='border-b-[1px] border-maroon'></span>
        <div className="flex items-center space-x-2">
          <FaArrowUpRightFromSquare size={15} className='text-red-600' />
          <p className='text-lg font-regular text-gray-800 group-hover:text-red-900 transition-colors duration-200'>
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default DashboardCard;
