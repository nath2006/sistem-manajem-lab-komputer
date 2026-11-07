import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../config/db.js';
import { createPengajuan } from '../controllers/pengajuanController.js';
import { getJadwalLabMingguan } from '../controllers/jadwalLabController.js';
const response = () => ({code:200, status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('submission memakai setting DB dan menolak jam di luar slot', async () => {
 const original=db.query;
 db.query=async sql => sql.includes('school_settings') ? [[{schedule_start:'07:00',schedule_end:'17:00',lesson_duration:45}]] : [[]];
 try {
  const res=response();
  await createPengajuan({user_id:1,user:{role:'Guru'},body:{lab_id:1,tanggal_pakai:'2026-11-03',jam_mulai:'07:30',jam_selesai:'08:30',kelas:'X',mata_pelajaran:'TI',kegiatan:'Praktik'}},res);
  assert.equal(res.code,400); assert.match(res.body.error,/45 menit/);
 } finally {db.query=original;}
});
test('submission bersebelahan diterima dan SQL bentrok memakai batas eksklusif', async () => {
 const original=db.query; const queries=[];
 db.query=async sql => {queries.push(sql); return sql.includes('school_settings') ? [[{schedule_start:'07:00',schedule_end:'17:00',lesson_duration:30}]] : [[]];};
 try {
  const res=response();
  await createPengajuan({user_id:1,user:{role:'Guru'},body:{lab_id:1,tanggal_pakai:'2026-11-03',jam_mulai:'09:00',jam_selesai:'10:00',kelas:'X',mata_pelajaran:'TI',kegiatan:'Praktik'}},res);
  assert.equal(res.code,201);
  assert.equal(queries.filter(q=>q.includes('NOT (jam_selesai <= ? OR jam_mulai >= ?)')).length,2);
 } finally {db.query=original;}
});
test('jadwal mengirim tanggal kalender stabil dan kepala lab dapat memilih lab otomatis', async () => {
 const original=db.query; const queries=[];
 db.query=async sql => {queries.push(sql);return sql.includes('kepala_lab_id') ? [[{lab_id:1}]] : [[]];};
 try {
  const res=response();
  await getJadwalLabMingguan({user_id:1,user:{role:'Kepala Lab'},query:{start_date:'2026-11-02',end_date:'2026-11-06'}},res);
  assert.equal(res.code,200);
  assert.ok(queries.some(q=>q.includes("DATE_FORMAT(jl.tanggal, '%Y-%m-%d')")));
 } finally {db.query=original;}
});
