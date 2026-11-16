// Explicit isolated browser fixture; never shares the normal Vite cache/ports.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
const scratch=process.env.TMPDIR;
if (!scratch || !scratch.includes('operational-assets-evidence')) throw Error('Explicit operational evidence scratch path required.');
const server=await createServer({root:resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),resolve:{dedupe:['react','react-dom']},configFile:false,envFile:false,
 cacheDir:resolve(scratch,`vite-${randomUUID()}`),plugins:[react(),tailwind()],
 define:{'import.meta.env.VITE_BASE_URL':JSON.stringify('/api'),'import.meta.env.VITE_ASSET_BASE_URL':JSON.stringify('')},
 server:{host:'127.0.0.1',port:5198,strictPort:true}});
await server.listen();
console.log('OPERATIONAL_FIXTURE_READY http://127.0.0.1:5198/test/frontend/fixtures/assets.html');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await server.close();process.exit(0);});
