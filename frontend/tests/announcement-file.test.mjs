import test from 'node:test';
import assert from 'node:assert/strict';
test('attachment URLs support LAN relative API and reject unsafe paths',async()=>{
 const {resolveAnnouncementFileUrl:r,getAnnouncementFileName:n}=await import('../src/utils/announcementFile.js');
 const options={apiBase:'/api',assetBase:'http://192.168.1.5:5174',origin:'http://192.168.1.5:5174'};
 assert.equal(r('my notice.pdf',options),'http://192.168.1.5:5174/uploads/pengumuman/my%20notice.pdf');
 assert.equal(r('uploads\\pengumuman\\notice.pdf',options),'http://192.168.1.5:5174/uploads/pengumuman/notice.pdf');
 assert.equal(r('https://files.example/a.pdf?token=a%2Fb&x=1',options),'https://files.example/a.pdf?token=a%2Fb&x=1');
 for(const file of ['javascript:alert(1)','data:text/html,x','../secret','%2e%2e/secret','//evil/a','uploads/../secret','https://files.example/%2e%2e/secret','https://user:password@files.example/a.pdf','uploads/%252e%252e/secret','uploads/a%2fb','uploads/%00file','a%zz.pdf']) assert.equal(r(file,options),null,file);
 assert.equal(r('a.pdf',{apiBase:'https://api.example/api'}),'https://api.example/uploads/pengumuman/a.pdf');
 assert.equal(n('https://files.example/my%20file.pdf?secret=x'),'my file.pdf');
 assert.equal(r('a#b?.pdf',options),'http://192.168.1.5:5174/uploads/pengumuman/a%23b%3F.pdf');
 assert.equal(r('/uploads/pengumuman/sudah%20encode.pdf',options),'http://192.168.1.5:5174/uploads/pengumuman/sudah%20encode.pdf');
 assert.equal(r('a.pdf',{assetBase:'https://cdn.example/lab/',apiBase:'https://api.example/api'}),'https://cdn.example/lab/uploads/pengumuman/a.pdf');
 assert.equal(r('a.pdf',{apiBase:'/api'}),null);
 assert.equal(n('uploads\\pengumuman\\file.pdf'),'file.pdf');
});
