import React from 'react';

// Flowbite skeleton pattern: https://flowbite.com/docs/components/skeleton/
const pulse = 'animate-pulse motion-reduce:animate-none';
const block = 'rounded-full bg-gray-200 dark:bg-gray-700';
const count = (value, fallback, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(1, Math.trunc(Number(value)))) : fallback;

function Lines({ rows = 4 }) {
  return <div aria-hidden="true" className="min-w-0 space-y-3">{Array.from({length:count(rows,4,12)},(_,i)=><div key={i} className={`${block} h-3 ${i%3===2?'w-2/3':'w-full'}`}/>)}</div>;
}

export function SkeletonRows({ rows=5, columns=5, label='Memuat data...' }) {
  return Array.from({length:count(rows,5,12)},(_,r)=><tr key={r} role="row" aria-busy="true" className={pulse}>{Array.from({length:count(columns,5,12)},(_,c)=><td key={c} role="cell" className="px-4 py-4"><div aria-hidden="true" className={`${block} h-3 w-full min-w-8`}/>{r===0&&c===0&&<span role="status" className="sr-only">{label}</span>}</td>)}</tr>);
}

export default function LoadingSkeleton({variant='page',rows=5,columns=5,label='Memuat...',className=''}) {
  let content;
  if(variant==='table') content=<div aria-hidden="true" className="space-y-4"><div className={`${block} h-8 w-1/3`}/>{Array.from({length:count(rows,5,12)},(_,i)=><div key={i} className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3"><div className={`${block} h-3`}/><div className={`${block} h-3`}/><div className={`${block} h-3`}/></div>)}</div>;
  else if(variant==='cards') content=<div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({length:count(rows,4,8)},(_,i)=><div key={i} className="space-y-4 rounded-lg border border-gray-200 p-5"><div className={`${block} h-8 w-12`}/><Lines rows={2}/></div>)}</div>;
  else if(variant==='form') content=<div aria-hidden="true" className="space-y-6">{Array.from({length:count(rows,4,8)},(_,i)=><div key={i} className="space-y-3"><div className={`${block} h-3 w-1/3`}/><div className={`${block} h-11 w-full rounded-lg`}/></div>)}</div>;
  else if(variant==='text') content=<div className="w-24 max-w-full"><Lines rows={rows}/></div>;
  else if(variant==='detail') content=<div aria-hidden="true" className="space-y-6"><div className={`${block} h-6 w-2/3`}/><Lines rows={rows}/><div className={`${block} h-28 w-full rounded-lg`}/></div>;
  else content=<div aria-hidden="true" className="space-y-6"><div className={`${block} h-7 w-1/3`}/><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[0,1,2].map(i=><div key={i} className={`${block} h-24 rounded-lg`}/>)}</div><Lines rows={rows}/></div>;
  return <div role="status" aria-busy="true" aria-live="polite" data-skeleton={variant} data-columns={columns} className={`min-w-0 w-full ${pulse} ${className}`}>{content}<span className="sr-only">{label}</span></div>;
}
