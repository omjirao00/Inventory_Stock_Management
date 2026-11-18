import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoData, saveProduct, recordMovement, deleteProduct, parseBackup, stockStatus, suggestedOrder, summary, inventoryCsv } from '../src/inventory.js';

const blank = () => ({ version: 1, products: [], movements: [] });
const input = (overrides = {}) => ({ name: 'Test mouse', sku: 'QA-001', category: 'Electronics', unit: 'pcs', cost: '100.25', minimum: '5', quantity: '10', supplier: 'Test supplier', location: 'A-01', ...overrides });
const fixture = () => saveProduct(blank(), input());

test('sample inventory round-trips through the backup validator with a consistent history', () => {
  const data = createDemoData();
  assert.equal(data.products.length, 16);
  assert.equal(data.movements.length, 22);
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
  assert.equal(summary(data.products).low, 5);
});
test('new product creates an opening balance and preserves original input', () => {
  const original = blank(), next = saveProduct(original, input());
  assert.equal(original.products.length, 0);
  assert.equal(next.products[0].quantity, 10);
  assert.equal(next.movements[0].delta, 10);
  assert.equal(next.movements[0].type, 'opening');
});
test('duplicate SKUs are rejected regardless of case', () => {
  assert.throws(() => saveProduct(fixture(), input({ sku: 'qa-001' })), /already exists/);
});
test('editing changes metadata without changing stock or history', () => {
  const data = fixture(), next = saveProduct(data, input({ name: 'Updated name', quantity: 999 }), data.products[0].id);
  assert.equal(next.products[0].name, 'Updated name');
  assert.equal(next.products[0].quantity, 10);
  assert.equal(next.movements.length, 1);
});
test('receipts, issues, and counted adjustments maintain an audit chain', () => {
  let data = fixture(); const productId = data.products[0].id;
  data = recordMovement(data, { productId, type: 'in', quantity: 5, note: 'Receipt' });
  data = recordMovement(data, { productId, type: 'out', quantity: 9, note: 'Issue' });
  data = recordMovement(data, { productId, type: 'adjust', quantity: 3, note: 'Physical count' });
  assert.equal(data.products[0].quantity, 3);
  assert.equal(data.movements[0].delta, -3);
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
});
test('overselling, fractional quantities and empty quantities are rejected', () => {
  const data = fixture(), productId = data.products[0].id;
  assert.throws(() => recordMovement(data, { productId, type: 'out', quantity: 11 }), /Only 10/);
  assert.throws(() => recordMovement(data, { productId, type: 'in', quantity: 1.5 }), /whole number/);
  assert.throws(() => recordMovement(data, { productId, type: 'in', quantity: '' }), /required/);
  assert.throws(() => recordMovement(data, { productId, type: 'in', quantity: 0 }), /greater than zero/);
  assert.equal(data.products[0].quantity, 10);
});
test('adjustments require a reason and can reduce stock to zero', () => {
  const data = fixture(), productId = data.products[0].id;
  assert.throws(() => recordMovement(data, { productId, type: 'adjust', quantity: 0, note: '' }), /characters/);
  const next = recordMovement(data, { productId, type: 'adjust', quantity: 0, note: 'Missing after count' });
  assert.equal(stockStatus(next.products[0]), 'out');
  assert.throws(() => recordMovement(data, { productId, type: 'adjust', quantity: 10, note: 'Counted' }), /No adjustment/);
});
test('status boundary includes reorder level; zero is out of stock', () => {
  assert.equal(stockStatus({ quantity: 5, minimum: 5 }), 'low');
  assert.equal(stockStatus({ quantity: 6, minimum: 5 }), 'healthy');
  assert.equal(stockStatus({ quantity: 0, minimum: 0 }), 'out');
});
test('suggested orders replenish stock and handle a zero reorder level', () => {
  assert.equal(suggestedOrder({ quantity: 4, minimum: 5 }), 6);
  assert.equal(suggestedOrder({ quantity: 0, minimum: 0 }), 1);
  assert.equal(suggestedOrder({ quantity: 20, minimum: 5 }), 0);
});
test('deletion retains history and rejects further movements to the deleted product', () => {
  const data = fixture(), productId = data.products[0].id, next = deleteProduct(data, productId);
  assert.equal(next.products.length, 0);
  assert.equal(next.movements.length, 1);
  assert.throws(() => recordMovement(next, { productId, type: 'in', quantity: 1 }), /existing product/);
  assert.deepEqual(parseBackup(JSON.stringify(next)), next);
});
test('bad backups, changed quantities, duplicate IDs and false deltas are rejected', () => {
  assert.throws(() => parseBackup('{'), /valid JSON/);
  assert.throws(() => parseBackup({ version: 2, products: [], movements: [] }), /supported/);
  let data = fixture(); data.products[0].quantity = 45;
  assert.throws(() => parseBackup(data), /do not match/);
  data = fixture(); data.products.push({ ...data.products[0] });
  assert.throws(() => parseBackup(data), /Duplicate product ID/);
  data = fixture(); data.movements[0].delta = 2;
  assert.throws(() => parseBackup(data), /Invalid stock balance/);
});
test('unit cost and stock value preserve currency precision', () => {
  const data = saveProduct(blank(), input({ cost: 0.1, quantity: 3 }));
  assert.equal(summary(data.products).value, 0.3);
  assert.throws(() => saveProduct(blank(), input({ cost: -1 })), /Unit cost/);
});
test('CSV quotes commas, newlines and formula-like text safely', () => {
  const data = saveProduct(blank(), input({ name: '=SUM(1,2)', supplier: 'A "quoted" supplier\nSecond line' }));
  const csv = inventoryCsv(data.products);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('A ""quoted"" supplier\nSecond line'));
  assert.equal(csv.includes('undefined'), false);
});
