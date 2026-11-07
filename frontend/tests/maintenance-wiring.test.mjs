import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL(`../src/${p}`,import.meta.url),'utf8');
test('both roles detail views mount shared milestones with linked source data',async()=>{
 const inspection=await read('Components/Pemeriksaan/DetailPemeriksaan.jsx');
 const ticket=await read('Components/Pengecekan/DetailPengecekan.jsx');
 const repair=await read('Components/Perbaikan/DetailPerbaikan.jsx');
 assert.match(inspection,/<MaintenanceMilestones/);assert.match(ticket,/<MaintenanceMilestones/);assert.match(repair,/<MaintenanceHistory/);
});
test('queue separates active items from retained history and allows inline troubleshooting', async()=>{
 const source=await read('features/KelolaPengecekan/PengecekanPerangkat.jsx');
 assert.ok(source.includes('showHistory') && source.includes('<AddPengecekan'), 'queue needs history filter and inline troubleshoot');
 const inspection=await read('features/PemeriksaanPerangkat/Pemeriksaan.jsx');
 assert.ok(inspection.includes('else if (isTeknisi) {'), 'technician without lab assignment must see inspection history');
});
test('technician dashboard exposes queue repair action, history detail and new troubleshooting',async()=>{
 const source=await read('pages/Teknisi/TeknisiDashboard.jsx');
 assert.match(source,/stats\.antrian/);assert.match(source,/stats\.riwayat/);
 assert.match(source,/<AddPerbaikan/);assert.match(source,/<DetailPerbaikan/);assert.match(source,/Troubleshoot Baru/);
 assert.ok(source.includes('<AddPengecekan'), 'technician must open inline form, not admin-only route');
 const form=await read('Components/Pengecekan/AddPengecekan.jsx');
 assert.ok(form.includes('onSuccess') && form.includes('ModalContainer'), 'troubleshoot form supports inline mode');
});
