import React from 'react';
import TableScrollRegion from './TableScrollRegion';

/** Keep scrolling local: natural mobile height, capped desktop table viewport. */
export default function DashboardTablePanel({ children, className = '', label }) {
  return (
    <section aria-label={label} className={`min-w-0 max-w-full rounded-lg bg-white shadow-md relative ${className}`}>
      <TableScrollRegion label={label} className="md:max-h-[440px] md:overflow-y-auto rounded-lg">
        {children}
      </TableScrollRegion>
    </section>
  );
}
