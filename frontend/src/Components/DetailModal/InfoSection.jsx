import React from 'react'

export default function InfoSection({title, children}) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-300">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}
