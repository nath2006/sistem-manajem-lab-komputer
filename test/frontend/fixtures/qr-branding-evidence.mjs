// Synthetic browser-only evidence server: no application API or database.
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const bundle=await build({absWorkingDir:root,stdin:{contents:`import {buildLabelPdf,createLabelPrintJob} from './frontend/src/features/AsetIT/assetQr.js';import {getDocumentBranding,loadDocumentLogo} from './frontend/src/utils/documentBranding.js';window.qrEvidence={buildLabelPdf,createLabelPrintJob,getDocumentBranding,loadDocumentLogo};`,resolveDir:root},bundle:true,platform:'browser',format:'iife',write:false});
const server=createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/missing.png'){res.writeHead(404);res.end();}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Owned QR branding evidence</title><script src="/bundle.js"></script><p>Synthetic QR branding evidence; no database.</p>');}});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}`,pid:process.pid})));
process.on('SIGTERM',()=>server.close());
