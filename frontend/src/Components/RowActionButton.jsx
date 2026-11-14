import React from 'react';
import Tooltip from './Tooltip';

const variants = {
  view: 'text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-500',
  edit: 'text-amber-600 hover:bg-amber-50 focus-visible:ring-amber-500',
  delete: 'text-red-600 hover:bg-red-50 focus-visible:ring-red-500',
};

export default function RowActionButton({ variant = 'view', label, tooltip = label, onClick, disabled = false, children }) {
  return <Tooltip content={tooltip}>
    <button
      type="button"
      aria-label={label}
      title={tooltip}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant] || variants.view}`}
    >{children}</button>
  </Tooltip>;
}
