import React from 'react'

export default function InfoItem({label, value}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-gray-900 font-medium">{value || "Tidak Ada Informasi"}</div>
    </div>
  )
}
