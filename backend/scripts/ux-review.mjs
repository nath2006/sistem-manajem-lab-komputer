// Explicit opt-in HTTP/MySQL UX review; source is read-only, clone is retained.
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
if (!process.argv.includes('--create-isolated')) throw Error('Explicit --create-isolated is required.');
const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(backend);
const { default: source } = await import('../config/db.js');
const quote = name => '`' + name.replaceAll('`', '``') + '`';
const database = `simlab_review_${new Date().toISOString().replace(/\D/g, '').slice(0,14)}`;
assert.match(database, /^simlab_review_\d{14}$/);
const result = { database, created_at: new Date().toISOString(), source_unchanged: false, server_stopped: false, checks: [], limitations: [] };
let target, child, before;
const owned = new Set();
const branding = resolve(backend, 'uploads/branding');
const files = async () => (await readdir(branding).catch(e => { if (e.code === 'ENOENT') return []; throw e; })).sort();
const check = (name, condition = true) => { assert.ok(condition, name); result.checks.push({name, passed:true}); };
async function fingerprint() {
  const [tables] = await source.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  const schema=[];
  for (const {name} of tables) {
    const [[ddl]]=await source.query(`SHOW CREATE TABLE ${quote(name)}`);
    const [rows]=await source.query(`SELECT * FROM ${quote(name)}`);
    const serialized=rows.map(row=>JSON.stringify(row)).sort();
    schema.push([name,ddl['Create Table'],createHash('sha256').update(JSON.stringify(serialized)).digest('hex'),rows.length]);
  }
  return {schema,hash:createHash('sha256').update(JSON.stringify(schema)).digest('hex')};
}
try {
  before=await fingerprint();
  const [[selected]]=await source.query('SELECT DATABASE() AS name');
  assert.notEqual(database,selected.name);
  target=await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:false,timezone:'Z'});
  await target.query(`CREATE DATABASE ${quote(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await target.changeUser({database});
  await target.query('SET FOREIGN_KEY_CHECKS=0');
  for(const [,ddl] of before.schema) await target.query(ddl);
  await target.query('SET FOREIGN_KEY_CHECKS=1');
  for(const file of ['20261102_school_settings_activity_logs.sql','20261103_service_tickets.sql']) {
    const sql=await readFile(resolve(backend,'migrations',file),'utf8');
    for(const statement of sql.replace(/^\s*--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean)) await target.query(statement);
  }
  check('new schema-only clone and both additive migrations');
  const password=randomBytes(24).toString('hex'), hash=await bcrypt.hash(password,4), run=randomBytes(3).toString('hex');
  const users={};
  for(const [key,role] of [['admin','Admin'],['manager','Koordinator Lab'],['head','Kepala Lab'],['otherHead','Kepala Lab'],['tech','Teknisi'],['teacher','Guru'],['unused','Guru']]) {
    const username=`ux_${key}_${run}`;
    const [row]=await target.query('INSERT INTO user (username,password,nama_lengkap,email,role) VALUES (?,?,?,?,?)',[username,hash,username,`${username}@example.invalid`,role]);
    users[key]={id:row.insertId,username};
  }
  async function lab(name,head=users.head.id) {return (await target.query('INSERT INTO laboratorium (nama_lab,lokasi,kapasitas,kepala_lab_id) VALUES (?,?,?,?)',[name,'Synthetic isolated UX fixture',20,head]))[0].insertId;}
  async function device(name,labId) {return (await target.query('INSERT INTO perangkat (nama_perangkat,lab_id,nomor_inventaris) VALUES (?,?,?)',[name,labId,`UX-${run}-${randomBytes(3).toString('hex')}`]))[0].insertId;}
  const labId=await lab('UX main'), otherLab=await lab('UX other',users.otherHead.id), deviceId=await device('UX linked',labId);
  const socket=createServer(); socket.listen(0,'127.0.0.1'); await once(socket,'listening'); const port=socket.address().port; await new Promise((ok,no)=>socket.close(e=>e?no(e):ok()));
  const url=`mysql://${encodeURIComponent(process.env.DB_USER||'')}:${encodeURIComponent(process.env.DB_PASSWORD||'')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||'3306'}/${database}`;
  child=spawn(process.execPath,['index.js'],{cwd:backend,env:{...process.env,DB_NAME:database,DATABASE_URL:url,PORT:String(port),JWT_SECRET:randomBytes(32).toString('hex'),TZ:'UTC'},stdio:'ignore'});
  const origin=`http://127.0.0.1:${port}`, tokens={};
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(origin+'/')).ok){ready=true;break;}}catch{} if(child.exitCode!==null)break; await new Promise(r=>setTimeout(r,150));}
  check('real backend starts with mysql2 and Prisma overrides',ready);
  async function request(path,{actor='admin',method='GET',body,status=200}={}) {
    const response=await fetch(origin+'/api'+path,{method,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(actor?{Authorization:`Bearer ${tokens[actor]}`}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
    const json=await response.json().catch(()=>({}));
    assert.ok([status].flat().includes(response.status),`${method} ${path}: expected ${status}, received ${response.status}`);
    return json;
  }
  for(const [key,user] of Object.entries(users)){const auth=await request('/auth/login',{actor:null,method:'POST',body:{username:user.username,password}}); assert.ok(auth.token);tokens[key]=auth.token;}
  check('real login for all five roles and alternate heads');
  const listed=await request('/user');
  check('Prisma user readback matches isolated fixtures',Object.values(users).every(u=>listed.data.some(r=>r.user_id===u.id)));
  const settings={school_name:'UX Review School',logo_url:'',primary_color:'#245799',schedule_start:'07:00',schedule_end:'17:00',lesson_duration:30};
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=','base64');
  const multipart=(bytes=png,name='logo.png',type='image/png',values=settings)=>{const form=new FormData();for(const [k,v] of Object.entries(values))form.append(k,String(v));if(bytes)form.append('logo',new Blob([bytes],{type}),name);return form;};
  const uploaded=(await request('/settings',{method:'PUT',body:multipart()})).data;
  assert.match(uploaded.logo_url,/^\/uploads\/branding\/[a-f0-9]{32}\.png$/); owned.add(basename(uploaded.logo_url));
  const [[saved]]=await target.query('SELECT * FROM school_settings WHERE id=1');
  check('admin multipart persists actual school_settings row',saved.logo_url===uploaded.logo_url&&saved.school_name===settings.school_name&&saved.lesson_duration===30);
  const publicSettings=(await request('/settings/public',{actor:null})).data;
  const raster=await fetch(origin+uploaded.logo_url);
  check('public branding and real raster HTTP/file readback',publicSettings.logo_url===uploaded.logo_url&&raster.status===200&&raster.headers.get('content-type').includes('image/png')&&Buffer.from(await raster.arrayBuffer()).equals(png)&&(await readFile(resolve(branding,basename(uploaded.logo_url)))).equals(png));
  for(const [name,actor,bytes,filename,type,values,status] of [
    ['non-Admin','teacher',png,'logo.png','image/png',settings,403],
    ['unauthenticated',null,png,'logo.png','image/png',settings,403],
    ['invalid bytes','admin',Buffer.from('not a raster'),'logo.png','image/png',settings,400],
    ['invalid MIME','admin',png,'logo.png','text/plain',settings,400],
    ['extension mismatch','admin',png,'logo.jpg','image/jpeg',settings,400],
    ['oversize','admin',Buffer.alloc(2*1024*1024+1),'logo.png','image/png',settings,400],
    ['invalid fields','admin',png,'logo.png','image/png',{...settings,school_name:''},400]
  ]) {
    const previous=await files(), [[old]]=await target.query('SELECT * FROM school_settings WHERE id=1');
    await request('/settings',{actor,method:'PUT',body:multipart(bytes,filename,type,values),status});
    assert.deepEqual(await files(),previous); const [[now]]=await target.query('SELECT * FROM school_settings WHERE id=1');assert.deepEqual(now,old);
    check(`${name} rejected without file or settings write`);
  }
  await request('/settings',{method:'PUT',body:{...settings,logo_url:'https://example.com/school.png'}});
  const [[alternative]]=await target.query('SELECT logo_url FROM school_settings WHERE id=1');
  check('URL alternative persists and public readback matches',alternative.logo_url==='https://example.com/school.png'&&(await request('/settings/public',{actor:null})).data.logo_url===alternative.logo_url);
  await request(`/deletion/perangkat/${deviceId}`,{actor:null,status:403});
  for(const actor of ['teacher','tech','manager']) await request(`/deletion/perangkat/${deviceId}`,{actor,status:403});
  await request(`/deletion/perangkat/${deviceId}`,{actor:'otherHead',status:403});
  check('mounted deletion preview enforces authentication, roles and own lab');
  const clean=await device('UX safe deletion',labId);
  check('own-head preview permits unlinked device',(await request(`/deletion/perangkat/${clean}`,{actor:'head'})).data.can_delete);
  await request(`/perangkat/delete/${clean}`,{actor:'otherHead',method:'DELETE',status:403});
  await request(`/perangkat/delete/${clean}`,{actor:'head',method:'DELETE'});
  check('existing DELETE safely removes only unlinked own-lab device',(await target.query('SELECT * FROM perangkat WHERE perangkat_id=?',[clean]))[0].length===0);
  const inspection=(await request('/pemeriksaan/create',{actor:'head',method:'POST',body:{perangkat_id:deviceId,tanggal_pemeriksaan:new Date().toISOString().slice(0,10),hasil_pemeriksaan:'Bermasalah',catatan:'Synthetic protected history'},status:201})).data.pemeriksaan_id;
  const [[finding]]=await target.query('SELECT pengecekan_id FROM pengecekan WHERE pemeriksaan_id=?',[inspection]);
  await request('/perbaikan/create',{actor:'tech',method:'POST',body:{pengecekan_id:finding.pengecekan_id,tanggal_perbaikan:new Date().toISOString().slice(0,10),tindakan:'Synthetic repair attempt',hasil_perbaikan:'Gagal'},status:201});
  const [[repair]]=await target.query('SELECT perbaikan_id FROM perbaikan WHERE pengecekan_id=?',[finding.pengecekan_id]);
  for(const [resource,id,route,actor] of [['perangkat',deviceId,'perangkat','head'],['laboratorium',labId,'lab','manager'],['pemeriksaan',inspection,'pemeriksaan','head'],['pengecekan',finding.pengecekan_id,'pengecekan','tech'],['perbaikan',repair.perbaikan_id,'perbaikan','tech'],['user',users.head.id,'user','admin']]) {
    const preview=(await request(`/deletion/${resource}/${id}`,{actor})).data;
    assert.equal(preview.can_delete,false);assert.ok(preview.blockers.length);
    await request(`/${route}/delete/${id}`,{actor,method:'DELETE',status:409});
    check(`${resource} blocker preview and existing DELETE retain linked history`);
  }
  const [[retained]]=await target.query('SELECT COUNT(*) n FROM perbaikan WHERE perbaikan_id=?',[repair.perbaikan_id]);check('legacy cascade did not erase repairs',retained.n===1);
  const [fks]=await target.query("SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND DELETE_RULE IN ('CASCADE','SET NULL')");
  result.legacy_cascade_constraints=fks.length;
  const ticketDevice=await device('UX logical ticket reference',otherLab);
  const draft={title:'UX retained ticket',description:'Synthetic service ticket reference',type:'incident',category:'hardware',impact:'medium',urgency:'medium',perangkat_id:ticketDevice};
  const ticket=(await request('/tickets',{actor:'teacher',method:'POST',body:draft,status:201})).data;
  const preview=(await request(`/deletion/perangkat/${ticketDevice}`)).data;
  check('logical ticket device reference appears in blocker preview',preview.blockers.some(b=>b.key==='service_tickets.perangkat_id'));
  await request(`/perangkat/delete/${ticketDevice}`,{method:'DELETE',status:409});
  await request(`/user/delete/${users.teacher.id}`,{method:'DELETE',status:409});
  check('logical reporter and device references protected',Boolean(ticket.ticket_id));
  const raceDevice=await device('UX raced ticket reference',otherLab);
  const outcomes=await Promise.all([
    fetch(origin+`/api/perangkat/delete/${raceDevice}`,{method:'DELETE',headers:{Authorization:`Bearer ${tokens.admin}`}}).then(r=>r.status),
    fetch(origin+'/api/tickets',{method:'POST',headers:{Authorization:`Bearer ${tokens.teacher}`,'Content-Type':'application/json'},body:JSON.stringify({...draft,title:'UX concurrent creation',perangkat_id:raceDevice})}).then(r=>r.status)
  ]);
  result.race_http_statuses={deletion:outcomes[0],ticket_creation:outcomes[1]};
  assert.ok([200,409].includes(outcomes[0])&&[201,400,404,409].includes(outcomes[1]),'Concurrent requests must return controlled outcomes, not server errors');
  const [[orphans]]=await target.query('SELECT COUNT(*) n FROM service_tickets t LEFT JOIN perangkat p ON p.perangkat_id=t.perangkat_id WHERE t.perangkat_id=? AND p.perangkat_id IS NULL',[raceDevice]);
  check('concurrent real HTTP deletion/ticket creation leaves no orphan',orphans.n===0);
  result.limitations.push('Concurrent HTTP race is scheduler-dependent; not a deterministic delayed-snapshot/deadlock proof.');
  await request(`/user/delete/${users.unused.id}`,{method:'DELETE'});
  check('safe unlinked user deletion verified by DB readback',(await target.query('SELECT user_id FROM user WHERE user_id=?',[users.unused.id]))[0].length===0);
  // Leave usable standard review accounts, not undisclosed random HTTP-fixture passwords.
  await new Promise((ok, no) => {
    const seed = spawn(process.execPath, ['prisma/seed.js'], {cwd:backend,env:{...process.env,DB_NAME:database,DATABASE_URL:url,SEED_REVIEW_DATABASE:database},stdio:'ignore'});
    seed.once('error', () => no(new Error('Review account initialization could not start.')));
    seed.once('exit', code => code === 0 ? ok() : no(new Error('Review account initialization failed.')));
  });
  const [reviewRoles] = await target.query('SELECT role, COUNT(*) AS count FROM user GROUP BY role');
  result.review_user_count = reviewRoles.reduce((sum, row) => sum + Number(row.count), 0);
  result.review_accounts_initialized = ['Admin','Koordinator Lab','Kepala Lab','Teknisi','Guru'].every(role => reviewRoles.some(row => row.role === role && row.count > 0));
  check('guarded review seeder initializes usable accounts for all five roles', result.review_accounts_initialized);
  await target.query("UPDATE school_settings SET logo_url='' WHERE id=1");
  const [[reviewSettings]] = await target.query('SELECT logo_url FROM school_settings WHERE id=1');
  check('review branding restored to default before own raster cleanup', reviewSettings.logo_url === '');
  result.completed=true;
} catch(error) {
  result.completed=false;
  // Never print driver connection details, passwords, tokens or connection URLs.
  result.error=error.code && error.code !== 'ERR_ASSERTION' ? `Review blocked/failed (${error.code})` : String(error.message).replace(/mysql:\/\/\S+/g,'[redacted]');
  process.exitCode=1;
} finally {
  if(child){const exited=child.exitCode===null?once(child,'exit').catch(()=>{}):Promise.resolve();if(child.exitCode===null)child.kill();await exited;result.server_stopped=true;}
  if(before){try{const after=await fingerprint();result.source_unchanged=before.hash===after.hash;result.source_fingerprint_before=before.hash;result.source_fingerprint_after=after.hash;if(!result.source_unchanged)process.exitCode=1;}catch{result.fingerprint_error='Could not verify source fingerprint';process.exitCode=1;}}
  for(const name of owned)await unlink(resolve(branding,name)).catch(e=>{if(e.code!=='ENOENT'){result.cleanup_error='Could not remove own uploaded raster';process.exitCode=1;}});
  result.uploads_cleaned=owned.size;
  await target?.end();await source.end();
  result.check_count=result.checks.length;
  result.verified=result.completed===true&&result.source_unchanged&&result.server_stopped&&!result.cleanup_error;
  await writeFile(resolve(backend,'../docs/ux-http-review-result.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
