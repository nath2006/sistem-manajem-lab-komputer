import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, LoaderCircle } from 'lucide-react';
import { resolveAnnouncementFileUrl, getAnnouncementFileName } from '../../utils/announcementFile';

// A ref lock closes the gap before React commits the disabled button.
export default function AnnouncementAttachment({ file }) {
  const url = resolveAnnouncementFileUrl(file);
  const filename = getAnnouncementFileName(file);
  const pending = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [file]);
  async function download() {
    if (!url || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    let objectUrl;
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || 'lampiran';
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      if (!controller.signal.aborted) setError('Gagal mengunduh file. Periksa koneksi atau izin akses file, lalu coba lagi.');
    } finally {
      // Delay revocation until the browser has consumed the click/navigation.
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return <section aria-label="Lampiran" className="w-full max-w-[34rem] rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
    <div className="flex min-w-0 items-center gap-3">
      <FileText aria-hidden="true" size={22} className="shrink-0 text-maroon" />
      <div className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-gray-900 [overflow-wrap:anywhere]">
        {file ? filename || 'Lampiran' : 'Belum ada lampiran'}
        {file && !url && <p role="status" className="mt-1 text-sm font-normal text-gray-500">Lampiran tidak tersedia: alamat file tidak aman atau tidak valid.</p>}
      </div>
      {url && <button type="button" onClick={download} disabled={busy} aria-label="Unduh file" title="Unduh file" aria-busy={busy} className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-gray-100 text-maroon hover:bg-maroon/20 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2">
        {busy ? <LoaderCircle size={23} aria-hidden="true" className="animate-spin" /> : <Download size={23} aria-hidden="true" />}
        <span className="text-[10px] leading-none">{busy ? 'Memuat' : 'Unduh'}</span>
      </button>}
    </div>
    <p role="status" aria-live="polite" className="sr-only">{busy ? 'Sedang mengunduh file' : ''}</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error} <button type="button" onClick={download} className="min-h-11 font-medium text-maroon underline focus-visible:ring-2 focus-visible:ring-maroon">Coba lagi</button></p>}
  </section>;
}
