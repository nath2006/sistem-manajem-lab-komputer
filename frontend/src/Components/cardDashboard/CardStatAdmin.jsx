import React from 'react'

function CardStatAdmin({ icon: Icon, count, label }) {
  return (
    <div className="dashboard-stat-card flex min-w-0 max-w-full flex-wrap items-center gap-y-2">
    <div className='bg-maroon w-16 h-16 shrink-0 rounded-full shadow-lg flex items-center justify-center'>
      <Icon className='text-white' />
    </div>
    <div className="min-w-0 flex-1 basis-24 break-words pl-3">
      <h1 className='text-gray-600 font-semibold text-3xl'>{count}</h1>
      <p className='text-maroon font-medium text-lg'>{label}</p>
    </div>
  </div>
  )
}

export default CardStatAdmin;