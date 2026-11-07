import test from 'node:test';
import assert from 'node:assert/strict';
import { renderUI } from './helpers/renderUI.js';

test('route suspense renders a status while the lazy chunk is pending', async () => {
  const {html} = await renderUI(`
    import React from 'react';
    import {renderToString} from 'react-dom/server';
    import {MemoryRouter,Routes,Route} from 'react-router-dom';
    import RouteBoundary from './src/Components/RouteBoundary.jsx';
    const Pending = React.lazy(() => new Promise(() => {}));
    export const html = renderToString(<MemoryRouter><Routes><Route element={<RouteBoundary/>}><Route path="/" element={<Pending/>}/></Route></Routes></MemoryRouter>);
  `);
  assert.match(html,/role="status"/);
  assert.match(html,/Memuat halaman/);
});

test('route error boundary preserves healthy children and offers reload recovery', async () => {
  const {RouteErrorBoundary} = await renderUI(`export {RouteErrorBoundary} from './src/Components/RouteBoundary.jsx';`);
  const boundary = new RouteErrorBoundary({children:'healthy route'});
  assert.equal(boundary.render(),'healthy route');
  boundary.state = RouteErrorBoundary.getDerivedStateFromError(new Error('Failed to fetch dynamically imported module'));
  const failed = boundary.render();
  assert.equal(failed.props.role,'alert');
  const children = failed.props.children;
  const reload = children.find(child=>child.type==='button');
  let reloaded=0;
  const previous=globalThis.window;
  globalThis.window={location:{reload(){reloaded++;}}};
  try { reload.props.onClick(); assert.equal(reloaded,1); }
  finally { if (previous === undefined) delete globalThis.window; else globalThis.window=previous; }
  assert.equal(children.find(child=>child.props?.to==='/login').props.to,'/login');
  assert.ok(!children.some(child=>child.type==='a'), 'Recovery navigation stays client-side');
});
