import LoadingSkeleton from '../../Components/Loading/Skeleton';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get } from '../../utils/api';
import useTitle from '../../utils/useTitle';
import { ArrowLeft } from 'lucide-react';
import AnnouncementAttachment from '../../Components/Pengumuman/AnnouncementAttachment';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-4';
function BackLink() {
  return <Link to="/login" className={`inline-flex min-h-11 items-center gap-3 rounded text-sm text-maroon hover:underline ${focus}`}>
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200"><ArrowLeft size={20} aria-hidden="true" /></span>
    Kembali<span className="sr-only"> ke Halaman Login</span>
  </Link>;
}
function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : 'Tanggal tidak tersedia';
}
export function AnnouncementArticle({ announcement }) {

  return <article className="mx-auto w-full max-w-6xl min-w-0 pt-12 sm:pt-16" aria-labelledby="announcement-title">
    <header className="mb-7">
      <h1 id="announcement-title" className="mb-4 text-2xl sm:text-4xl lg:text-[42px] font-bold leading-snug text-gray-900 [overflow-wrap:anywhere]">{announcement.judul}</h1>
      <p className="text-sm text-gray-500">{formatDate(announcement.created_at)}</p>
    </header>
    <AnnouncementAttachment key={announcement.file_path || 'no-file'} file={announcement.file_path} />
    <img src="/assets/images/pengumuman.png" alt="" className="mx-auto my-8 sm:my-10 h-auto w-64 sm:w-80 max-w-full object-contain" />
    <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-gray-800 [overflow-wrap:anywhere]">{announcement.content || 'Isi pengumuman belum tersedia.'}</div>
  </article>;
}
const PengumumanDetailPage = () => {
  const { id } = useParams();
  const [state, setState] = useState({id:null, loading:true, data:null, error:''});
  const [attempt, setAttempt] = useState(0);
  const loading = state.loading || state.id !== id;
  useTitle(loading ? 'Memuat Pengumuman...' : state.data ? `Detail: ${state.data.judul}` : 'Pengumuman Tidak Ditemukan');
  useEffect(() => {
    let active = true;
    setState({id, loading:true, data:null, error:''});
    async function load() {
      try {
        if (!id) throw new Error('ID Pengumuman tidak valid.');
        const result = await get(`/pengumuman/${id}`);
        const data = result && Object.hasOwn(result, 'data') ? result.data : result;
        const valid = data && typeof data === 'object' && !Array.isArray(data) && typeof data.judul === 'string';
        if (active) setState({id,loading:false,data:valid ? data : null,error:''});
      } catch (error) {
        if (active) setState({id,loading:false,data:null,error:error?.message || 'Gagal memuat detail pengumuman.'});
      }
    }
    load();
    return () => { active = false; };
  }, [id, attempt]);
  return <main className="min-h-screen bg-white px-5 py-8 sm:px-10 sm:py-12 lg:px-14 pb-16">
    <BackLink />
    {loading ? <div className="mx-auto max-w-4xl pt-12"><LoadingSkeleton variant="detail" label="Memuat detail pengumuman..." /></div>
      : state.data ? <AnnouncementArticle announcement={state.data} />
      : <section className="mx-auto max-w-xl py-20 text-center">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">{state.error ? 'Tidak dapat memuat pengumuman' : 'Pengumuman tidak ditemukan'}</h1>
        <p role={state.error ? 'alert' : 'status'} className="mb-6 text-gray-600 [overflow-wrap:anywhere]">{state.error || 'Pengumuman yang Anda cari tidak ditemukan.'}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)} className={`min-h-11 rounded-lg bg-maroon px-5 py-2.5 text-white hover:bg-maroon/90 ${focus}`}>Coba lagi</button>
      </section>}
  </main>;
};
export default PengumumanDetailPage;
