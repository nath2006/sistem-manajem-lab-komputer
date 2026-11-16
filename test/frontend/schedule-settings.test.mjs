import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Execute actual callbacks with deterministic hook/network boundaries, no DOM/auth/DB.
async function providerHarness() {
  let index = 0;
  const states = [];
  const react = require('react');
  const hooks = { ...react,
    useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { const i = index++; return states[i] ||= {current: initial}; },
    useCallback(callback) { return callback; }, useMemo(callback) { return callback(); }, useEffect() {},
  };
  let response;
  const api = { get: async () => { if (response instanceof Error) throw response; return {data:{data:response}}; } };
  const result = await build({entryPoints:['src/Context/SettingsContext.jsx'], bundle:true, platform:'node', format:'cjs', write:false, jsx:'automatic', external:['react','react/jsx-runtime'], plugins:[{name:'api',setup(b){b.onResolve({filter:/utils\/api$/},()=>({path:'api',namespace:'test'})); b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'module.exports = globalThis.__scheduleTestApi;'}));}}]});
  globalThis.__scheduleTestApi = api;
  const module = {exports:{}};
  new Function('require','module','exports',result.outputFiles[0].text)(name => name === 'react' ? hooks : require(name), module, module.exports);
  delete globalThis.__scheduleTestApi;
  return { response(value) {response=value;}, read() { index=0; return module.exports.SettingsProvider({children:null}).props.value; } };
}
const valid = {school_name:'Sekolah Uji', schedule_start:'08:00', schedule_end:'15:00', lesson_duration:45};
test('schedule readiness follows successful valid loads, failure and admin refresh', async () => {
  const h = await providerHarness();
  assert.equal(h.read().loaded, false);
  h.response(valid); await h.read().reloadSettings();
  assert.equal(h.read().loaded, true);
  assert.equal(h.read().settings.schedule_start, '08:00');
  h.response(new Error('offline')); await h.read().reloadSettings();
  assert.equal(h.read().loaded, false);
  assert.ok(h.read().error);
  h.read().updateSettings({...valid, lesson_duration:30});
  assert.equal(h.read().loaded, true);
  assert.equal(h.read().error, '');
  assert.equal(h.read().settings.lesson_duration, 30);
});
test('invalid settings never publish an unsafe negative grid duration or authorize submission', async () => {
  const h = await providerHarness();
  h.response({...valid, lesson_duration:-1}); await h.read().reloadSettings();
  assert.equal(h.read().loaded, false);
  assert.ok(h.read().settings.lesson_duration > 0, 'display must retain safe defaults, not an infinite grid step');
  h.read().updateSettings({school_name:'Incomplete'});
  assert.equal(h.read().loaded, false);
});
