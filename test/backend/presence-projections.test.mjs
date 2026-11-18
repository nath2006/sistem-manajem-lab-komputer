import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../../backend/' + p, import.meta.url), 'utf8');
// A source-isolated production-module harness prevents importing either live DB client.
async function moduleWith(p, values) {
 const key='__presenceTest'+Math.random().toString(36).slice(2);globalThis[key]=values;
 const source='const {'+Object.keys(values).join(',')+'}=globalThis['+JSON.stringify(key)+'];\n'+read(p).replace(/^import .*;.*$/gm,'');
 try{return await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}finally{delete globalThis[key];}
}
test('UserService overlays every response, strips password, rejects manual flag and never writes it', async()=>{
 const row={user_id:1,is_online:true,password:'must-not-leak'};let written;
 const repo={list:async()=>[row],getById:async()=>row,create:async data=>{written=data;return row;},update:async(id,data)=>{written=data;return row;}};
 const {UserService}=await moduleWith('services/UserService.js',{bcrypt:{hash:async()=> 'hashed'},HttpError:class extends Error{constructor(status,msg){super(msg);this.status=status;}},UserRepository:class{constructor(){return repo;}},coerceUserRole:x=>x,presenceRegistry:{isOnline:()=>false}});
 const service=new UserService();
 assert.equal((await service.list())[0].is_online,false);
 assert.equal((await service.detail(1)).password,undefined);
 assert.equal((await service.create({username:'u',password:'p',nama_lengkap:'n',email:'e',role:'Admin'})).is_online,false);
 assert.equal(Object.hasOwn(written,'is_online'),false);
 assert.equal((await service.update(1,{email:'e'})).is_online,false);
 await assert.rejects(service.update(1,{is_online:false}),e=>e.status===400);
});
test('dashboard counts valid live IDs and overlays role roster without persisted presence',async()=>{
 const db={async query(sql){
   if(sql.includes('SELECT user_id FROM user'))return [[{user_id:1},{user_id:2}]];
   if(sql.includes('nama_lengkap ASC'))return [[{user_id:1,is_online:false},{user_id:2,is_online:true}]];
   if(sql.includes('COUNT'))return [[{total_perangkat:3,total_lab:4,total_user:2,total_pengumuman:0}]];
   return [[]];
 }};
 const {getDashboardStats,getUsersWithRoles}=await moduleWith('controllers/dashboardController.js',{db,presenceRegistry:{isOnline:id=>id===1||id===999}});
 const res={status(){return this;},json(value){this.value=value;}};
 await getDashboardStats({},res);assert.equal(res.value.data.totalOnlineUsers,1);
 await getUsersWithRoles({},res);assert.deepEqual(res.value.data.map(x=>x.is_online),[true,false]);
});
test('mount before audit and remove login/logout persistence writes',()=>{
 const index=read('index.js');assert.ok(index.indexOf("app.use('/api/presence'")<index.indexOf("app.use('/api', activityLog)"));
 assert.doesNotMatch(read('controllers/authController.js'),/UPDATE user SET is_online/);
});
