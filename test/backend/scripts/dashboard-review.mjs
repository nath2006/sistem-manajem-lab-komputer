// Explicit opt-in integration evidence, no writes to either protected source.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import { reviewEnvironment } from './start-review.mjs';
import { createDashboardInsightsService } from '../../../backend/services/dashboardInsightsService.js';
assert.ok(process.argv.includes('--create-isolated'),'Explicit --create-isolated required');
assert.equal(process.env.DB_NAME,'simlab_review_20261114181000','Explicit known review source required');
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '../../../backend'));
const directory=resolve('C:/Users/LOQ/AppData/Local/hermes/cache/scratch/letris-dashboard');await mkdir(directory,{recursive:true});
await unlink(resolve(directory,'browser-done.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
const {default:source}=await import('../../../backend/config/db.js');
const config={host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD};
const quote=x=>'`'+x.replaceAll('`','``')+'`';
const database='simlab_review_'+new Date().toISOString().replace(/\D/g,'').slice(0,14);
const report={database,checks:[],source:'simlab_review_20261114181000',original:'sistem-manajemen-lab-fix'};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
async function fingerprint(c){const [tables]=await c.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");const schemas=[],hash=createHash('sha256');for(const {name}of tables){const [[ddl]]=await c.query('SHOW CREATE TABLE '+quote(name));const [rows]=await c.query('SELECT * FROM '+quote(name));schemas.push(ddl['Create Table']);hash.update(JSON.stringify([name,ddl['Create Table'],rows.map(r=>JSON.stringify(r)).sort()]));}return {schemas,hash:hash.digest('hex')};}
let target,original,child,before,originalBefore;
try{
 const [[actual]]=await source.query('SELECT DATABASE() name');assert.equal(actual.name,report.source);
 before=await fingerprint(source);original=await mysql.createConnection({...config,database:report.original});originalBefore=await fingerprint(original);
 target=await mysql.createConnection(config);assert.notEqual(database,report.source);assert.notEqual(database,report.original);
 await target.query('CREATE DATABASE '+quote(database));await target.changeUser({database});const [[selected]]=await target.query('SELECT DATABASE() name');assert.equal(selected.name,database);
 await target.query('SET FOREIGN_KEY_CHECKS=0');for(const ddl of before.schemas)await target.query(ddl);await target.query('SET FOREIGN_KEY_CHECKS=1');
 const users={},tokens={};
 for(const [key,role]of Object.entries({admin:'Admin',manager:'Koordinator Lab',head:'Kepala Lab',tech:'Teknisi',teacher:'Guru',other:'Guru'})){
  const [r]=await target.query('INSERT INTO user(username,password,nama_lengkap,email,role) VALUES(?,?,?,?,?)',[`dash_${key}`,'not-a-login-hash',`Synthetic ${role}`,`dash_${key}@example.invalid`,role]);users[key]=r.insertId;tokens[role]??=jwt.sign({id:r.insertId,role,username:`dash_${key}`,fullName:`Synthetic ${role}`},process.env.JWT_SECRET,{expiresIn:'45m'});
 }
 const [lab]=await target.query('INSERT INTO laboratorium(nama_lab,lokasi,kapasitas,kepala_lab_id) VALUES(?,?,?,?)',['Synthetic Lab','Fixture',24,users.head]);
 const devices=[];for(const [name,category,status]of [['Printer','Printer','Baik'],['Komputer','Komputer','Rusak'],['Router','Perangkat Jaringan','Baik']]){
  const [r]=await target.query('INSERT INTO perangkat(nama_perangkat,lab_id,nomor_inventaris,penggunaan,kategori,status) VALUES(?,?,?,?,?,?)',[name,lab.insertId,'DASH-'+name,'Pembelajaran',category,status]);devices.push(r.insertId);
 }
 const insert=async(reporter,device,status)=>target.query("INSERT INTO service_tickets(title,description,type,category,impact,urgency,priority,status,reporter_id,perangkat_id,response_minutes,resolution_minutes,created_at,updated_at,response_due_at,resolution_due_at) VALUES('Synthetic ticket','Fixture','incident','hardware','low','low','P4',?,?,?,480,4320,UTC_TIMESTAMP(),UTC_TIMESTAMP(),UTC_TIMESTAMP(),UTC_TIMESTAMP())",[status,reporter,device]);
 await insert(users.teacher,null,'new');await insert(users.other,devices[0],'pending');await insert(users.other,null,'closed');
 const service=createDashboardInsightsService(target);
 for(const [key,role]of Object.entries({admin:'Admin',manager:'Koordinator Lab',head:'Kepala Lab',tech:'Teknisi',teacher:'Guru'})){
  const data=await service.get({id:users[key],role});const count=data.tickets.rows.reduce((n,r)=>n+r.count,0);check(role+' exact visible ticket count',count===({head:1,teacher:1}[key]??3));
  if(key==='teacher')check('Guru never receives school assets',data.assets===null);
  else check(role+' actual category total',data.assets.categories.reduce((n,r)=>n+r.count,0)===3);
 }
 // Clone-only legacy downgrade proves COUNT still represents all real assets.
 await target.query('ALTER TABLE perangkat DROP COLUMN kategori');
 const legacy=await service.get({id:users.admin,role:'Admin'});check('legacy category fallback exact count',legacy.assets.categories.length===1&&legacy.assets.categories[0].label==='Lainnya'&&legacy.assets.categories[0].count===3);
 await target.query("ALTER TABLE perangkat ADD COLUMN kategori VARCHAR(100) NULL");await target.query("UPDATE perangkat SET kategori=CASE nama_perangkat WHEN 'Printer' THEN 'Printer' WHEN 'Router' THEN 'Perangkat Jaringan' ELSE 'Komputer' END");
 await target.query('RENAME TABLE service_tickets TO dashboard_tickets_saved');check('legacy missing ticket table is unavailable',(await service.get({id:users.teacher,role:'Guru'})).tickets.available===false);await target.query('RENAME TABLE dashboard_tickets_saved TO service_tickets');
 const {createServer}=await import('node:net');const socket=createServer();socket.listen(0,'127.0.0.1');await new Promise(r=>socket.once('listening',r));const port=socket.address().port;await new Promise(r=>socket.close(r));child=spawn(process.execPath,['index.js'],{cwd:process.cwd(),env:reviewEnvironment(process.env,{database,port}),stdio:'ignore'});
 let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(`http://127.0.0.1:${port}/`)).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,100));}check('isolated backend ready',ready);
 for(const [role,token]of Object.entries(tokens)){const r=await fetch(`http://127.0.0.1:${port}/api/dashboard/insights`,{headers:{Authorization:'Bearer '+token}});check(role+' real HTTP',r.ok&&(await r.json()).data.tickets.available===true);}
 await writeFile(resolve(directory,'session.json'),JSON.stringify({origin:`http://127.0.0.1:${port}`,tokens,users,database}));
 await writeFile(resolve(directory,'mysql-report.json'),JSON.stringify(report,null,2));
 if(process.argv.includes('--browser')){console.log('DASHBOARD_REVIEW_READY '+JSON.stringify({database,origin:`http://127.0.0.1:${port}`,directory}));for(let i=0;i<1800;i++){try{await readFile(resolve(directory,'browser-done.json'));break;}catch{}await new Promise(r=>setTimeout(r,1000));}}
}finally{
 if(child){child.kill();await new Promise(r=>child.once('exit',r));report.server_stopped=child.exitCode!==null||child.signalCode!==null;}
 if(before){report.source_before=before.hash;report.source_after=(await fingerprint(source)).hash;check('review source unchanged',report.source_before===report.source_after);}
 if(originalBefore){report.original_before=originalBefore.hash;report.original_after=(await fingerprint(original)).hash;check('protected original unchanged',report.original_before===report.original_after);}
 await unlink(resolve(directory,'session.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
 await writeFile(resolve(directory,'mysql-report.json'),JSON.stringify(report,null,2));
 if(target)await target.end();if(original)await original.end();await source.end();
 console.log(JSON.stringify(report,null,2));
}
