import React, { useId } from 'react';

/** Native table semantics stay intact; only this viewport scrolls. */
export default function TableScrollRegion({ label = 'Data', children, className = '' }) {
  const hintId = useId();
  return <div className="table-scroll-shell min-w-0 max-w-full">
    <p id={hintId} className="table-scroll-hint">Geser tabel ke samping untuk melihat semua kolom. Dengan keyboard, fokuskan tabel lalu gunakan tombol panah kiri/kanan.</p>
    <div role="region" aria-label={`${label} — tabel dapat digulir`} tabIndex={0} aria-describedby={hintId} className={`table-scroll-region overflow-x-auto ${className}`}>
      {children}
    </div>
  </div>;
}
