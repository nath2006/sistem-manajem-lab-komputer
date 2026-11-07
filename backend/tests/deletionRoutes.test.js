import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
test('injectable preview router authenticates before querying and returns data envelope',async()=>{
 const {createDeletionRouter}=await import('../router/deletionRoutes.js');
 let calls=0;
 const app=express(); app.use('/api/deletion',createDeletionRouter({authenticate:(req,res,next)=>req.headers.authorization?(req.user={id:1,role:'Admin'},next()):res.sendStatus(401),service:{async preview(resource,id,actor){calls++;return {resource,id,can_delete:true,actor:actor.id};}}}));
 const server=app.listen(0); try {
 const url=`http://127.0.0.1:${server.address().port}/api/deletion/user/7`;
 assert.equal((await fetch(url)).status,401); assert.equal(calls,0);
 const response=await fetch(url,{headers:{authorization:'test'}}); assert.equal(response.status,200);assert.equal((await response.json()).data.resource,'user');assert.equal(calls,1);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
