import test from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import process from 'node:process';

test('lint understands JSX component parameters without allowing unused lowercase arguments', async () => {
  const eslint=new ESLint({cwd:process.cwd()});
  const [component]=await eslint.lintText('export default function Card({ Icon }) { return <Icon />; }',{filePath:'src/JsxLintFixture.jsx'});
  assert.equal(component.messages.filter(message=>message.ruleId==='no-unused-vars').length,0,'JSX component references are not unused arguments');
  const [unused]=await eslint.lintText('export default function Card({ unused }) { return <div />; }',{filePath:'src/JsxLintFixture.jsx'});
  assert.ok(unused.messages.some(message=>message.ruleId==='no-unused-vars'));
});
