import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import process from 'node:process';

test('login menyediakan tombol aksesibel untuk menampilkan password tanpa submit', async () => {
    const result = await build({ stdin: { contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MemoryRouter } from 'react-router-dom';
      import Login from './src/pages/authentication/authLoginCover.jsx';
      import { AuthContext } from './src/Context/AuthContext.jsx';
      module.exports = renderToStaticMarkup(React.createElement(MemoryRouter, null,
        React.createElement(AuthContext.Provider, { value: { state: { isAuthenticated: false }, dispatch() {} } }, React.createElement(Login))));
    `, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env': '{}' } });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
    const html = module.exports;
    assert.match(html, /type="button"[^>]*aria-label="Tampilkan password"/);
    assert.match(html, /aria-controls="login-password"/);
    assert.match(html, /aria-pressed="false"/);
    assert.match(html, /type="submit"[^>]*class="[^"]*bg-maroon/);
    assert.match(html, /<h2[^>]*>Selamat Datang di Sistem Informasi Manajemen <br\/>Laboratorium Komputer\s*<\/h2>/);
});
