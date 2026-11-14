import React from 'react'

function CardStatAdmin({ icon: Icon, count, label }) {
  return (
    <div className="flex items-center">
    <div className='bg-red-900 w-16 h-16 rounded-full shadow-lg flex items-center justify-center'>
      <Icon className='text-white' />
    </div>
    <div className="pl-3">
      <h1 className='text-gray-600 font-semibold text-3xl'>{count}</h1>
      <p className='text-red-900 font-medium text-lg'>{label}</p>
    </div>
  </div>
  )
}

export default CardStatAdmin;