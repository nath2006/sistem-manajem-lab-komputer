import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function browser(t) {
  const originals = { document: globalThis.document, Image: globalThis.Image };
  const images = [], draws = [], links = [], canvases = [];
  globalThis.Image = class { constructor() { images.push(this); } };
  globalThis.document = {
    getElementById: () => links[0],
    head: { appendChild: link => links.push(link) },
    createElement: tag => {
      if (tag === 'canvas') {
        const canvas = { getContext: () => ({ drawImage: (...args) => draws.push(args.slice(1)) }), toDataURL: () => 'data:image/png;base64,test' };
        canvases.push(canvas); return canvas;
      }
      return { setAttribute(key, value) { this[key] = value; }, removeAttribute(key) { delete this[key]; } };
    },
  };
  t.after(() => { globalThis.document = originals.document; globalThis.Image = originals.Image; });
  return { images, draws, links, canvases };
}

test('wide, tall and square logos are centered without stretching in a square PNG favicon', async t => {
  const { updateSchoolFavicon } = await import('../../frontend/src/utils/schoolFavicon.js').catch(() => ({}));
  assert.equal(typeof updateSchoolFavicon, 'function');
  const fixture = browser(t);
  for (const [width, height] of [[240, 60], [60, 240], [100, 100]]) {
    const cancel = updateSchoolFavicon('/uploads/branding/school.png', '/fallback.png');
    t.after(cancel);
    const image = fixture.images.at(-1);
    assert.equal(image.crossOrigin, 'anonymous');
    image.naturalWidth = width; image.naturalHeight = height; image.onload();
    const [x, y, drawnWidth, drawnHeight] = fixture.draws.at(-1), canvas = fixture.canvases.at(-1);
    assert.equal(canvas.width, canvas.height);
    assert.equal(drawnWidth / drawnHeight, width / height);
    assert.equal(x * 2 + drawnWidth, canvas.width);
    assert.equal(y * 2 + drawnHeight, canvas.height);
    assert.ok(Math.max(drawnWidth, drawnHeight) < canvas.width);
    assert.match(fixture.links[0].href, /^data:image\/png;base64,/);
    cancel();
  }
  assert.equal(fixture.links.length, 1);
});

test('document favicon is driven by resolved settings instead of the Vite icon', async () => {
  const html = await readFile(new URL('../../frontend/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /vite\.svg/);
  const provider = await readFile(new URL('../../frontend/src/Context/SettingsContext.jsx', import.meta.url), 'utf8');
  assert.match(provider, /updateSchoolFavicon\(value\.logoSrc, defaultLogo\)/);
});

test('favicon has no browser side effects when rendering without a DOM', async () => {
  const { updateSchoolFavicon } = await import('../../frontend/src/utils/schoolFavicon.js');
  assert.doesNotThrow(() => updateSchoolFavicon('/logo.png', '/fallback.png')());
});

test('failed logos use the same proportionate fallback and obsolete loads cannot overwrite a new logo', async t => {
  const { updateSchoolFavicon } = await import('../../frontend/src/utils/schoolFavicon.js');
  const fixture = browser(t);
  const oldCancel = updateSchoolFavicon('/old.png', '/fallback.png');
  t.after(oldCancel);
  const oldImage = fixture.images.at(-1), lateLoad = oldImage.onload;
  oldCancel();
  const cancel = updateSchoolFavicon('/new.png', '/fallback.png');
  t.after(cancel);
  fixture.images.at(-1).onerror();
  const fallback = fixture.images.at(-1);
  assert.equal(fallback.src, '/fallback.png');
  fallback.naturalWidth = 40; fallback.naturalHeight = 80; fallback.onload();
  const href = fixture.links[0].href, drawCount = fixture.draws.length;
  oldImage.naturalWidth = oldImage.naturalHeight = 80; lateLoad();
  assert.equal(fixture.links[0].href, href);
  assert.equal(fixture.draws.length, drawCount);
  assert.equal(fixture.links.length, 1);
});
