import test from 'node:test';
import assert from 'node:assert/strict';
test('lab, inspection and user delete-only handlers preserve envelopes and structured conflicts',async()=>{
 const cases=[['lab','createDeleteLab','laboratorium','Data Lab Berhasil Dihapus'],['pemeriksaan','createDeletePemeriksaan','pemeriksaan','Pemeriksaan berhasil dihapus.'],['user','createDeleteUser','user','User Berhasil Dihapus']];
 for(const [file,exportName,resource,message] of cases){
 const factory=(await import(`../controllers/${file}Controller.js`))[exportName];const events=[];
 const req={params:{id:'2'},user:{id:1,role:'Admin'}};const res={status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
 const service={async remove(r,id,actor){assert.equal(r,resource);assert.equal(id,'2');assert.equal(actor,req.user);events.push('committed');return {foto_lab:'a.png'};}};
 await factory({service,removeImage:()=>events.push('image')})(req,res);assert.equal(res.code,200);assert.equal(res.body.message,message);assert.deepEqual(events,resource==='laboratorium'?['committed','image']:['committed']);
 const data={resource,id:2,label:'Data',can_delete:false,retained:true,blockers:[],message:'Tertaut'};
 service.remove=async()=>{throw Object.assign(new Error(data.message),{status:409,data});};events.length=0;await factory({service,removeImage:()=>events.push('image')})(req,res);assert.equal(res.code,409);assert.equal(res.body.data,data);assert.deepEqual(events,[]);
 }
});
test('device delete delegates actor and removes image only after success',async()=>{
 const {createDeleteDevice}=await import('../controllers/deviceController.js');
 const events=[]; const req={params:{id:'2'},user:{id:8,role:'Kepala Lab'}};
 const res={status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
 const service={async remove(resource,id,actor){assert.equal(resource,'perangkat');assert.equal(id,'2');assert.equal(actor,req.user);events.push('committed');return {foto_perangkat:'a.png'};}};
 await createDeleteDevice({service,removeImage:()=>events.push('image')})(req,res);
 assert.deepEqual(events,['committed','image']); assert.equal(res.code,200);assert.equal(res.body.message,'Data Perangkat Berhasil Dihapus');
 service.remove=async()=>{throw Object.assign(new Error('Tertaut'),{status:409,data:{blockers:[]}});};events.length=0;
 await createDeleteDevice({service,removeImage:()=>events.push('image')})(req,res);assert.equal(res.code,409);assert.deepEqual(events,[]);
});
