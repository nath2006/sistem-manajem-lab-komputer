import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import process from 'node:process';
const require = createRequire(import.meta.url);

// Exercise actual form event callbacks with an isolated state dispatcher.
// No HTTP transport/results are replaced; this is not a browser renderer.
async function loadForms() {
  const result = await build({stdin:{contents:`export {default as Create} from './src/features/Ticketing/CreateTicketForm'; export {default as Action} from './src/features/Ticketing/TicketActionForm'; export {default as Classification} from './src/features/Ticketing/TicketClassificationForm'; export {default as Policy} from './src/features/Ticketing/SlaPolicyForm';`,loader:'jsx',resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'form-state',setup(build){build.onLoad({filter:/(CreateTicketForm|TicketActionForm|TicketClassificationForm|SlaPolicyForm)\.jsx$/},args=>({contents:readFileSync(args.path,'utf8').replace("import { useState } from 'react';",'const useState = (...args) => globalThis.ticketFormState(...args);'),loader:'jsx'}));}}]});
  const module={exports:{}};
  new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
  return module.exports;
}
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
function harness(Form, props) {
  const values=[]; let index=0;
  const render=()=>{index=0;globalThis.ticketFormState=initial=>{const slot=index++;if (!(slot in values)) values[slot]=typeof initial==='function'?initial():initial;return [values[slot],next=>{values[slot]=typeof next==='function'?next(values[slot]):next;}];};return Form(props);};
  const change=(type, offset, value)=>{nodes(render()).filter(n=>n.type===type)[offset].props.onChange({target:{value}});};
  const submit=()=>render().props.onSubmit({preventDefault(){}});
  return {render,change,submit};
}
test('actual create, action and classification callbacks validate drafts and submit versioned payloads', async () => {
  const forms=await loadForms(); const sent=[];
  const options={types:['incident'],categories:['hardware']};
  const props={options,saving:false,closeModal(){},onSubmit:payload=>sent.push(payload),detail:{version:7,status:'assigned',type:'incident',category:'hardware',impact:'medium',urgency:'medium'},state:{role:'Admin'}};
  const create=harness(forms.Create,props);create.submit();assert.equal(sent.length,0);
  create.change('input',0,' Title ');create.change('textarea',0,' Description ');create.submit();
  assert.deepEqual(sent.pop(),{title:'Title',description:'Description',type:'incident',category:'hardware',impact:'medium',urgency:'medium'});
  const action=harness(forms.Action,props);action.submit();assert.equal(sent.length,0);
  const select=nodes(action.render()).find(n=>typeof n.type==='function' && n.props.label==='Tindakan'); select.props.onChange('start');
  action.change('textarea',0,' Starting ');action.submit();assert.deepEqual(sent.pop(),{action:'start',note:'Starting',version:7});
  const classification=harness(forms.Classification,props);classification.submit();assert.equal(sent.length,0);
  classification.change('textarea',0,' Review ');classification.submit();assert.deepEqual(sent.pop(),{version:7,note:'Review',type:'incident',category:'hardware',impact:'medium',urgency:'medium'});
  delete globalThis.ticketFormState;
});
test('SLA form rejects non-positive or fractional targets before submitting', async () => {
  const {Policy}=await loadForms();const sent=[];
  const form=harness(Policy,{options:{policies:[{priority:'P1',response_minutes:5,resolution_minutes:60}]},onSubmit:p=>sent.push(p)});
  form.change('textarea',0,' Update ');form.change('input',0,'0');form.submit();assert.equal(sent.length,0);
  form.change('input',0,'1.5');form.submit();assert.equal(sent.length,0);
  form.change('input',0,'10');form.submit();assert.deepEqual(sent.pop(),{policies:[{priority:'P1',response_minutes:10,resolution_minutes:60}],note:'Update'});
  delete globalThis.ticketFormState;
});
