// Synthetic UI-only fixture: no database, login or source API requests.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
const roles=['Admin','Guru','Kepala Lab','Koordinator Lab','Teknisi'];
const rows=(labels,counts)=>labels.map((label,i)=>({label,count:counts[i]}));
const server=await createServer({root:resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),resolve:{dedupe:['react','react-dom']},configFile:false,envFile:false,cacheDir:resolve(process.env.TMPDIR||tmpdir(),'soft-chartjs-evidence','vite-'+randomUUID()),plugins:[react(),tailwind(),{name:'synthetic-dashboard',configureServer(s){s.middlewares.use((req,res,next)=>{
 if(req.url.startsWith('/__dashboard_session')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({tokens:Object.fromEntries(roles.map(r=>[r,'synthetic-'+r])),users:{admin:1,teacher:2,head:3,manager:4,tech:5}}));}
 if(!req.url.startsWith('/api/'))return next();
 const role=decodeURIComponent((req.headers.authorization||'').replace('Bearer synthetic-',''));
 let data=[];
 if(req.url.includes('/settings/public'))data={school_name:'Laboratorium Komputer',primary_color:'#2563eb',schedule_start:'07:00',schedule_end:'17:00',lesson_duration:60};
 else if(req.url.includes('/dashboard/insights'))data={assets:role==='Guru'?null:{categories:rows(['Komputer','Monitor','Printer','Jaringan'],[25,18,4,7]),conditions:rows(['Baik','Perlu perbaikan','Tidak diketahui'],[43,8,3])},tickets:{available:true,rows:rows(['new','assigned','in_progress','pending','resolved','closed','cancelled'],role==='Guru'?[2,1,1,0,3,1,0]:[7,4,8,3,12,6,1])}};
 else if(req.url.includes('/dashboard/admin/stats'))data={totalOnlineUsers:3,totalLab:4,totalUser:18,totalPengumuman:6,totalPerangkat:54};
 else if(req.url.includes('/dashboard/teknisi/stats'))data={totalPengecekanAktif:5,totalRiwayatPerbaikan:12,antrian:[],riwayat:[]};
 else if(req.url.includes('/pengajuan/statistik'))data={menunggu:2,disetujui:4,ditolak:1,total_filter:7};
 else if(req.url.includes('/lab')||req.url.includes('labs-with-heads'))data=[{lab_id:1,nama_lab:'Laboratorium Komputer 1',nama_kepala_lab:'Kepala Lab',kepala_lab:{nama_lengkap:'Kepala Lab'},lokasi:'Gedung A',kapasitas:30}];
 else if(req.url.includes('users-with-roles'))data=[{user_id:1,nama_lengkap:'Pengguna uji',role:'Guru'}];
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,data}));
 });}}],define:{'import.meta.env.VITE_BASE_URL':JSON.stringify('/api'),'import.meta.env.VITE_ASSET_BASE_URL':JSON.stringify(''),'import.meta.env.VITE_REFRESH_INTERVAL':JSON.stringify('300000')},server:{host:'127.0.0.1',port:5207,strictPort:true}});
await server.listen();console.log('SOFT_CHARTJS_UI_FIXTURE_READY 5207');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await server.close();process.exit(0);});
