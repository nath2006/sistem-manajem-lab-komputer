import { useContext, useEffect, useId, useRef, useState } from 'react';
import { AuthContext } from '../Context/AuthContext';
import { exportInventory } from '../utils/inventoryExport';

// The caller supplies the complete filtered dataset, never the paginated slice.
export default function InventoryExportMenu({ rows = [], kind, title, branding, owner, lab_id, kategori, disabled = false }) {
  const { state: auth } = useContext(AuthContext) ?? {};
  const allowed = ['Admin', 'Teknisi'].includes(auth?.role) && !auth?.isLoading && auth?.isAuthenticated !== false;
  const currentAuth = useRef(auth);
  currentAuth.current = auth;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const operation = useRef(null);
  const mounted = useRef(false);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  useEffect(() => {
    mounted.current = true;
    setBusy(false);
    setError('');
    setOpen(false);
    lock.current = false;
    return () => {
      mounted.current = false;
      operation.current?.abort();
      operation.current = null;
    };
  }, [owner, auth]);
  const root = useRef(null);
  const trigger = useRef(null);
  const items = useRef([]);
  const id = useId();
  const unavailable = !allowed || disabled || !rows.length || busy;
  const close = (restore = false) => { setOpen(false); if (restore) trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { if (unavailable) setOpen(false); }, [unavailable]);
  useEffect(() => { if (open) items.current[0]?.focus(); }, [open]);
  const run = async format => {
    if (!mounted.current || currentAuth.current !== auth || currentOwner.current !== owner || lock.current || unavailable) return;
    lock.current = true;
    setBusy(true);
    setError('');
    close(true);
    const controller = new AbortController();
    operation.current = controller;
    const isCurrent = () => mounted.current && !controller.signal.aborted && operation.current === controller && currentOwner.current === owner && currentAuth.current === auth;
    try { await exportInventory(format, rows, { kind, title, branding, lab_id, kategori, signal: controller.signal, isCurrent }); }
    catch (error) { if (isCurrent() && error?.name !== 'AbortError') setError('Gagal mengekspor data. Silakan buka Ekspor dan coba kembali.'); }
    finally { if (isCurrent()) { operation.current = null; lock.current = false; setBusy(false); } }
  };
  if (!allowed) return null;
  return <div ref={root} className="relative min-w-0" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(true); }
    if (event.key === 'Tab') setOpen(false);
    if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const current = items.current.indexOf(event.target);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (current + (event.key === 'ArrowUp' ? -1 : 1) + 2) % 2;
      items.current[index]?.focus();
    }
  }}>
    <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={id} aria-busy={busy} disabled={unavailable}
      className="min-h-11 w-full rounded-lg border border-maroon bg-maroon/10 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-maroon/20 focus-visible:ring-2 focus-visible:ring-maroon disabled:opacity-50 sm:w-auto"
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (!unavailable && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); }
      }}>{busy ? 'Mengekspor…' : 'Ekspor'}</button>
    {open && <div id={id} role="menu" aria-label="Ekspor data sesuai filter" className="absolute right-0 z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
      <p className="px-3 py-2 text-xs text-gray-600">{rows.length} data sesuai filter (semua halaman)</p>
      {['xlsx', 'pdf'].map((format, index) => <button key={format} ref={node => { items.current[index] = node; }} role="menuitem" type="button" className="min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-gray-900 hover:bg-maroon/10 focus-visible:ring-2 focus-visible:ring-maroon" onClick={() => run(format)}>{format === 'xlsx' ? 'Excel (.xlsx)' : 'PDF (.pdf)'}</button>)}
    </div>}
    {error && <p role="alert" className="mt-2 max-w-64 text-sm text-red-700">{error}</p>}
  </div>;
}
