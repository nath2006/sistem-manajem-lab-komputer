import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const result=await build({entryPoints:[path.join(root,'test/frontend/onboarding/browser-fixture.jsx')],bundle:true,alias:{react:path.join(root,'frontend/node_modules/react'),'react-dom':path.join(root,'frontend/node_modules/react-dom'),'react-router-dom':path.join(root,'frontend/node_modules/react-router-dom')},write:false,format:'iife',jsx:'automatic',loader:{'.png':'dataurl'},define:{'import.meta.env':JSON.stringify({PROD:false,DEV:true,VITE_BASE_URL:'/api'})}});
const assets=path.join(root,'frontend/dist/assets');
const css=await readFile(path.join(assets,(await readdir(assets)).find(name=>name.endsWith('.css'))));
const server=createServer((req,res)=>{
 if(req.url==='/fixture.js'){res.setHeader('content-type','text/javascript');res.end(result.outputFiles[0].contents);}
 else if(req.url==='/fixture.css'){res.setHeader('content-type','text/css');res.end(css);}
 else {res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');}
});
server.listen(5197,'127.0.0.1',()=>console.log('Synthetic onboarding fixture on 5197 with no backend access'));
