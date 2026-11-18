import test from 'node:test';
import assert from 'node:assert/strict';
const branding = await import('../../frontend/src/utils/documentBranding.js').catch(()=>({}));
test('shared branding preserves canonical settings and uses resolved logo and validated color',()=>{
 assert.equal(typeof branding.getDocumentBranding,'function');
 const settings={school_name:'  Sekolah Contoh  ',logo_url:'/uploads/branding/logo.png',primary_color:'#123abc'};
 assert.deepEqual(branding.getDocumentBranding(settings,'https://api.example/uploads/branding/logo.png'),{schoolName:'Sekolah Contoh',systemName:'Sistem Manajemen IT dan Penggunaan Lab',logoSrc:'https://api.example/uploads/branding/logo.png',primaryColor:'#123abc'});
 assert.equal(settings.logo_url,'/uploads/branding/logo.png');
 assert.equal(branding.getDocumentBranding().schoolName,'Nama institusi belum diatur');
 assert.equal(branding.getDocumentBranding({primary_color:'red;bad'}).primaryColor,'#800000');
});
test('logo loader permits unset logos, preserves intrinsic aspect and retries configured failures',async()=>{
 assert.equal(typeof branding.loadDocumentLogo,'function');
 assert.equal(await branding.loadDocumentLogo(''),null);
 const oldImage=globalThis.Image, oldDocument=globalThis.document;
 let fail=true, observed;
 globalThis.Image=class {naturalWidth=240;naturalHeight=80;set src(value){observed={value,crossOrigin:this.crossOrigin};queueMicrotask(()=>fail?this.onerror():this.onload());}};
 globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/png;base64,test'})};
 try {
 await assert.rejects(branding.loadDocumentLogo('https://school.example/logo.webp'),/Logo.*Pengaturan/);
 fail=false;
 assert.deepEqual(await branding.loadDocumentLogo('https://school.example/logo.webp'),{dataUrl:'data:image/png;base64,test',width:240,height:80});
 assert.equal(observed.crossOrigin,'anonymous');
 }finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
