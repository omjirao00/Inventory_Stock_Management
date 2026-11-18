import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDemoData, STORAGE_KEY } from '../src/inventory.js';

// Render the actual React application without a browser or network.
// These checks cover rendering and storage failures, not visual layout or clicks.
const compiled = buildSync({ entryPoints: [fileURLToPath(new URL('../src/App.jsx', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['react', 'react-dom'] });
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const App = module.exports.default;
const render = () => renderToStaticMarkup(React.createElement(App));
function storage(value = null) {
  const values = new Map(value === null ? [] : [[STORAGE_KEY, value]]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, data) => values.set(key, data) };
  return values;
}

test('initial app renders seeded inventory and control elements', () => {
  const saved = storage();
  const html = render();
  assert.match(html, /All products/);
  assert.match(html, /A4 paper/);
  assert.match(html, /Export CSV/);
  assert.match(html, /Add product/);
  assert.match(html, /1–8 of 16 products/);
  assert.match(html, /aria-label="Search products"/);
  assert.equal(JSON.parse(saved.get(STORAGE_KEY)).products.length, 16);
});
test('saved data is used instead of reseeding, including a valid empty inventory', () => {
  storage(JSON.stringify({ version: 1, products: [], movements: [] }));
  const html = render();
  assert.match(html, /Your inventory starts here/);
  assert.match(html, /0 products/);
  assert.doesNotMatch(html, /Wireless mouse/);
});
test('corrupt saved data displays recovery guidance without silently overwriting it', () => {
  const saved = storage('not JSON');
  const html = render();
  assert.match(html, /Saved data could not be loaded/);
  assert.equal(saved.get(STORAGE_KEY), 'not JSON');
});
test('disabled browser storage renders sample data with a visible warning', () => {
  storage();
  globalThis.localStorage.setItem = () => { throw new Error('Storage is disabled'); };
  const html = render();
  assert.match(html, /role="alert"/);
  assert.match(html, /Sample data is shown/);
  assert.match(html, /Storage needs attention/);
  assert.doesNotMatch(html, /Saved in this browser/);
  assert.match(html, /1–8 of 16 products/);
});
test('a restored inventory renders actual stock totals and categories', () => {
  storage(JSON.stringify(createDemoData()));
  const html = render();
  assert.match(html, /Needs attention/);
  assert.match(html, /2 out of stock/);
  assert.match(html, /Across 5 categories/);
});
