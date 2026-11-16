import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const baseline=JSON.parse(await readFile(new URL('./fixtures/protected-dashboard-actions.json',import.meta.url),'utf8'));
for(const [role,block] of Object.entries(baseline))test(`${role} preserves its original action design and workflow`,async()=>{
 const source=await readFile(new URL(`../../frontend/src/pages/${role}/${role}Dashboard.jsx`,import.meta.url),'utf8');
 assert.ok(source.replace(/\r\n/g,'\n').includes(block.replace(/\r\n/g,'\n')),'Original button JSX, spacing, classes, content and click handler remain unchanged');
 const css=await readFile(new URL('../../frontend/src/Components/dashboardTheme.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/dashboard-quick-action/);
 assert.match(source, /<Dashboard title=\{`Selamat /);
 assert.ok(source.indexOf('<DashboardInsights />') > source.indexOf('</button>'), 'Charts follow the original operational action');
});
test('Teknisi places its personalized greeting in the page heading without a duplicate below charts', async () => {
 const source = await readFile(new URL('../../frontend/src/pages/Teknisi/TeknisiDashboard.jsx', import.meta.url), 'utf8');
 assert.match(source, /<Dashboard title=\{`Selamat \$\{getGreetingTime\(moment\(\)\)\}, \$\{userName\}!`\}>/);
 assert.doesNotMatch(source, /title="Dashboard Teknisi"/);
 assert.equal((source.match(/Selamat /g) || []).length, 1);
 assert.match(source, /Ini adalah ringkasan tugas dan aktivitas perbaikan Anda\./);
});
