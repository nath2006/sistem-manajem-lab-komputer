import React from 'react';

/** Keep scrolling local: natural mobile height, capped desktop table viewport. */
export default function DashboardTablePanel({ children, className = '', label }) {
  return (
    <section aria-label={label} className={`min-w-0 max-w-full rounded-lg bg-white shadow-md relative ${className}`}>
      <div className="overflow-x-auto md:max-h-[440px] md:overflow-y-auto rounded-lg" tabIndex={0} role="region" aria-label={label ? `${label} — tabel dapat digulir` : 'Tabel dapat digulir'}>
        {children}
      </div>
    </section>
  );
}
