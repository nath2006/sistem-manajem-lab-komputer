export const CATEGORIES = { create:'Tambah data', update:'Ubah data', delete:'Hapus data', read:'Akses data', login:'Masuk', logout:'Keluar', 'refresh-token':'Perbarui sesi', other:'Lainnya' };
export function activityParams(page, filters) {
  return { page, limit:20, facets:'1', ...Object.fromEntries(Object.entries(filters).filter(([,value])=>value !== '')) };
}
export function presentActivity(row) {
  const method=row.method || '';
  const category=['login','logout','refresh-token'].includes(row.action)?row.action:method==='DELETE'?'delete':method==='POST'&& /\/(approve|reject|actions)$/.test(row.path || '')?'update':method==='POST'?'create':['PUT','PATCH'].includes(method)?'update':['GET','HEAD','OPTIONS'].includes(method)?'read':'other';
  const path=(row.path || '').split('?')[0];
  const segment=path.replace(/^\/api\//,'').split('/')[0];
  const resources={komputer:'Komputer',devices:'Perangkat',device:'Perangkat',perangkat:'Perangkat',user:'Pengguna',users:'Pengguna',auth:'Autentikasi',settings:'Pengaturan','activity-logs':'Log aktivitas',lab:'Laboratorium',jadwal:'Jadwal lab','jadwal-lab':'Jadwal lab',perbaikan:'Perbaikan',tickets:'Tiket',pengumuman:'Pengumuman',pengajuan:'Pengajuan lab',pengecekan:'Pengecekan'};
  const resource=resources[segment] || segment || 'API';
  const parsed=new Date(row.created_at);
  const valid=Number.isFinite(parsed.getTime());
  return {category,resource,path,label:CATEGORIES[category],time:valid?new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'}).format(parsed):'—',date:valid?new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',year:'numeric'}).format(parsed):'Tanggal tidak tersedia'};
}
