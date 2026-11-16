import test from 'node:test';
import assert from 'node:assert/strict';
const themes=['#ffff00','#f8fafc','#000000','#07152e','#ff0000','#2563eb','#15803d'];
test('central dashboard palette meets text 4.5 and graphic 3 contrast for extreme/live brand colors',async()=>{
 const mod=await import('../../frontend/src/utils/dashboardTheme.js').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {};});
 assert.equal(typeof mod.dashboardTokens,'function','central contrast tokens exist');
 for(const primary of themes){
  const t=mod.dashboardTokens(primary),contrast=mod.contrastRatio;
  assert.equal(t['--dashboard-primary'],primary);
  assert.ok(contrast(t['--dashboard-on-primary'],primary)>=4.5,primary);
  assert.ok(contrast(t['--dashboard-text'],t['--dashboard-surface'])>=4.5);
  assert.ok(contrast(t['--dashboard-accent'],t['--dashboard-surface'])>=4.5);
  for(const tone of ['info','warning','danger','success','series-0','series-1','series-2','series-3']){
   assert.ok(contrast(t[`--dashboard-${tone}`],t['--dashboard-surface'])>=3,tone);
   assert.ok(contrast(t[`--dashboard-on-${tone}`],t[`--dashboard-${tone}`])>=4.5,tone);
  }
 }
});
