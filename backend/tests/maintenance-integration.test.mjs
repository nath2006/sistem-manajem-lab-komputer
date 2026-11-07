import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { controller, response } from './maintenance-helpers.mjs';

// Real SQL and persisted state, isolated in RAM. FOR UPDATE is removed only for SQLite;
// production locking syntax is covered by the SQL-boundary unit tests.
function fixture() {
 const sql = new DatabaseSync(':memory:');
 sql.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE user(user_id INTEGER PRIMARY KEY,nama_lengkap TEXT);
 CREATE TABLE laboratorium(lab_id INTEGER PRIMARY KEY,nama_lab TEXT,kepala_lab_id INTEGER);
 CREATE TABLE perangkat(perangkat_id INTEGER PRIMARY KEY,nama_perangkat TEXT,nomor_inventaris TEXT,spesifikasi TEXT,status TEXT,lab_id INTEGER);
 CREATE TABLE pemeriksaan(pemeriksaan_id INTEGER PRIMARY KEY,user_id INTEGER,perangkat_id INTEGER,tanggal_pemeriksaan TEXT,hasil_pemeriksaan TEXT,catatan TEXT);
 CREATE TABLE pengecekan(pengecekan_id INTEGER PRIMARY KEY,user_id INTEGER,perangkat_id INTEGER,pemeriksaan_id INTEGER REFERENCES pemeriksaan(pemeriksaan_id),tanggal_pengecekan TEXT,ditemukan_kerusakan TEXT,status_pengecekan TEXT DEFAULT 'Baru');
 CREATE TABLE perbaikan(perbaikan_id INTEGER PRIMARY KEY,pengecekan_id INTEGER REFERENCES pengecekan(pengecekan_id),user_id INTEGER,tanggal_perbaikan TEXT,tindakan TEXT,hasil_perbaikan TEXT,catatan_tambahan TEXT,perangkat_id_snapshot INTEGER,tanggal_selesai_perbaikan TEXT);
 INSERT INTO user VALUES(7,'Kepala Lab'),(8,'Teknisi');
 INSERT INTO laboratorium VALUES(1,'Lab Komputer',7);
 INSERT INTO perangkat VALUES(2,'PC-01','INV-01','Desktop','Baik',1);`);
 const adapter={async query(query,args=[]){
  const stmt=sql.prepare(query.replace(/ FOR UPDATE/g,''));
  if(/^\s*SELECT/i.test(query))return [stmt.all(...args)];
  const result=stmt.run(...args);return [{insertId:Number(result.lastInsertRowid),affectedRows:Number(result.changes)}];
 },async getConnection(){return adapter;},async beginTransaction(){sql.exec('BEGIN');},async commit(){sql.exec('COMMIT');},async rollback(){if(sql.isTransaction)sql.exec('ROLLBACK');},release(){}};
 return {sql,adapter};
}
const head={id:7,role:'Kepala Lab'},tech={id:8,role:'Teknisi'};
const inspect={perangkat_id:2,tanggal_pemeriksaan:'2026-11-01',hasil_pemeriksaan:'Bermasalah',catatan:'Tidak menyala'};
const attempt={tanggal_perbaikan:'2026-11-02',tindakan:'Uji PSU',hasil_perbaikan:'Gagal'};

test('real SQL: inspection → failed repair → success retains both attempts and synchronizes all records',async()=>{
 const {sql,adapter}=fixture();
 try {
 const inspections=await controller('pemeriksaan',adapter),repairs=await controller('perbaikan',adapter);
 let res=response();await inspections.createPemeriksaan({body:inspect,user:head},res);assert.equal(res.code,201);
 const ticket=sql.prepare('SELECT * FROM pengecekan').get();assert.equal(ticket.status_pengecekan,'Baru');
 res=response();await repairs.createPerbaikan({body:{...attempt,pengecekan_id:ticket.pengecekan_id},user:tech},res);assert.equal(res.code,201,res.body.message);
 assert.equal(sql.prepare('SELECT status_pengecekan FROM pengecekan').get().status_pengecekan,'Menunggu Perbaikan');
 res=response();await repairs.createPerbaikan({body:{...attempt,pengecekan_id:ticket.pengecekan_id,hasil_perbaikan:'Berhasil',tindakan:'Ganti PSU'},user:tech},res);assert.equal(res.code,201,res.body.message);
 assert.equal(sql.prepare('SELECT status FROM perangkat').get().status,'Baik');
 assert.equal(sql.prepare('SELECT hasil_pemeriksaan FROM pemeriksaan').get().hasil_pemeriksaan,'Baik');
 assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM perbaikan').get().count,2);
 assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM pengecekan').get().count,1);
 res=response();await inspections.getPemeriksaanById({params:{id:1},user:head},res);assert.equal(res.body.data.perbaikan.length,2);
 // Editing an older failed attempt must not override the latest successful resolution.
 res=response();await repairs.updatePerbaikan({params:{id:1},body:{...attempt,tindakan:'Koreksi catatan'},user:tech},res);assert.equal(res.code,200);
 assert.equal(sql.prepare('SELECT status FROM perangkat').get().status,'Baik');
 // Correct latest result back to failed: all linked statuses reopen together.
 res=response();await repairs.updatePerbaikan({params:{id:2},body:attempt,user:tech},res);assert.equal(res.code,200);
 assert.equal(sql.prepare('SELECT status FROM perangkat').get().status,'Perlu Perbaikan');
 assert.equal(sql.prepare('SELECT hasil_pemeriksaan FROM pemeriksaan').get().hasil_pemeriksaan,'Bermasalah');
 } finally {sql.close();}
});

test('real SQL: resolving one of two faults cannot mark the device healthy',async()=>{
 const {sql,adapter}=fixture();
 try{
 const inspections=await controller('pemeriksaan',adapter),repairs=await controller('perbaikan',adapter);
 for(let i=0;i<2;i++){const res=response();await inspections.createPemeriksaan({body:inspect,user:head},res);assert.equal(res.code,201);}
 const res=response();await repairs.createPerbaikan({body:{...attempt,pengecekan_id:1,hasil_perbaikan:'Berhasil'},user:tech},res);assert.equal(res.code,201,res.body.message);
 assert.equal(sql.prepare('SELECT status FROM perangkat').get().status,'Perlu Perbaikan');
 assert.equal(sql.prepare('SELECT hasil_pemeriksaan FROM pemeriksaan WHERE pemeriksaan_id=2').get().hasil_pemeriksaan,'Bermasalah');
 }finally{sql.close();}
});
