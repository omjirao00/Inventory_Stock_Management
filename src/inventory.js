export const STORAGE_KEY = 'inventory-stock-v1';
export const CATEGORIES = ['Electronics', 'Stationery', 'Lab supplies', 'Furniture', 'Consumables'];
export const UNITS = ['pcs', 'boxes', 'packs', 'reams', 'bottles'];
const MAX_QUANTITY = 1000000;
const MAX_COST = 10000000;
const id = () => crypto.randomUUID();
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const fail = (message) => { throw new Error(message); };
const text = (value, label, limit, required = true) => {
  if (typeof value !== 'string') fail(`${label} must be text.`);
  const result = value.trim();
  if ((required && !result) || result.length > limit) fail(`${label} must be ${required ? '1' : '0'}–${limit} characters.`);
  return result;
};
const quantity = (value, label = 'Quantity') => {
  if (value === '' || value === null || typeof value === 'boolean') fail(`${label} is required.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > MAX_QUANTITY) fail(`${label} must be a whole number between 0 and 1,000,000.`);
  return number;
};

export function stockStatus(product) {
  return product.quantity === 0 ? 'out' : product.quantity <= product.minimum ? 'low' : 'healthy';
}

export function suggestedOrder(product) {
  return Math.max(0, Math.max(1, product.minimum * 2) - product.quantity);
}

export function validateProduct(input, products = [], editingId = null) {
  const name = text(input.name, 'Product name', 100);
  const sku = text(input.sku, 'SKU', 40).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(sku)) fail('Use letters, numbers, dots, hyphens or underscores in the SKU.');
  if (products.some(p => p.id !== editingId && p.sku.toUpperCase() === sku)) fail('This SKU already exists. Use a unique SKU.');
  const category = text(input.category, 'Category', 50);
  const unit = text(input.unit, 'Unit', 20);
  const supplier = text(input.supplier ?? '', 'Supplier', 100, false);
  const location = text(input.location ?? '', 'Location', 50, false);
  const minimum = quantity(input.minimum, 'Reorder level');
  if (input.cost === '' || input.cost === null || typeof input.cost === 'boolean') fail('Unit cost is required.');
  const cost = Number(input.cost);
  if (!Number.isFinite(cost) || cost < 0 || cost > MAX_COST) fail('Unit cost must be between ₹0 and ₹1,00,00,000.');
  return { name, sku, category, unit, supplier, location, minimum, cost: round(cost) };
}

export function saveProduct(data, input, editingId = null) {
  const fields = validateProduct(input, data.products, editingId);
  const now = new Date().toISOString();
  if (editingId) {
    if (!data.products.some(p => p.id === editingId)) fail('This product no longer exists.');
    return { ...data, products: data.products.map(p => p.id === editingId ? { ...p, ...fields, updatedAt: now } : p) };
  }
  if (data.products.length >= 5000) fail('This demo supports up to 5,000 products.');
  const opening = quantity(input.quantity, 'Opening stock');
  const product = { ...fields, id: id(), quantity: opening, createdAt: now, updatedAt: now };
  const movement = { id: id(), productId: product.id, productName: product.name, sku: product.sku, unit: product.unit,
    type: 'opening', delta: opening, before: 0, after: opening, note: 'Opening stock', createdAt: now };
  return { ...data, products: [...data.products, product], movements: [movement, ...data.movements] };
}

export function recordMovement(data, input) {
  const product = data.products.find(p => p.id === input.productId);
  if (!product) fail('Select an existing product.');
  if (!['in', 'out', 'adjust'].includes(input.type)) fail('Choose a valid movement type.');
  const value = quantity(input.quantity, input.type === 'adjust' ? 'Counted quantity' : 'Quantity');
  if (input.type !== 'adjust' && value === 0) fail('Quantity must be greater than zero.');
  const after = input.type === 'adjust' ? value : product.quantity + (input.type === 'in' ? value : -value);
  if (after < 0) fail(`Only ${product.quantity} ${product.unit} available. You cannot issue more than the current stock.`);
  if (after > MAX_QUANTITY) fail('Stock cannot exceed 1,000,000 units per product.');
  const note = text(input.note ?? '', 'Reference / note', 200, input.type === 'adjust');
  if (after === product.quantity) fail('The counted quantity matches the current stock. No adjustment is needed.');
  const now = new Date().toISOString();
  const movement = { id: id(), productId: product.id, productName: product.name, sku: product.sku, unit: product.unit,
    type: input.type, delta: after - product.quantity, before: product.quantity, after, note, createdAt: now };
  return { ...data, products: data.products.map(p => p.id === product.id ? { ...p, quantity: after, updatedAt: now } : p), movements: [movement, ...data.movements] };
}

export function deleteProduct(data, productId) {
  if (!data.products.some(p => p.id === productId)) fail('This product no longer exists.');
  return { ...data, products: data.products.filter(p => p.id !== productId) };
}

export function summary(products) {
  return { products: products.length, units: products.reduce((n, p) => n + p.quantity, 0),
    value: round(products.reduce((n, p) => n + p.quantity * p.cost, 0)),
    low: products.filter(p => stockStatus(p) !== 'healthy').length };
}

export function createDemoData() {
  const rows = [
    ['ELC-001', 'Wireless mouse', 'Electronics', 'pcs', 24, 10, 649, 'Techline Distributors', 'A-01'],
    ['ELC-002', 'USB-C hub · 6 port', 'Electronics', 'pcs', 7, 8, 1899, 'Techline Distributors', 'A-02'],
    ['STN-001', 'A4 paper · 75 GSM', 'Stationery', 'reams', 48, 15, 280, 'Paper & Co.', 'B-01'],
    ['STN-002', 'Ballpoint pens · blue', 'Stationery', 'boxes', 32, 10, 120, 'Paper & Co.', 'B-02'],
    ['LAB-001', 'Digital multimeter', 'Lab supplies', 'pcs', 12, 5, 850, 'Precision Instruments', 'C-01'],
    ['ELC-003', 'HDMI cable · 2 m', 'Electronics', 'pcs', 0, 8, 299, 'Techline Distributors', 'A-03'],
    ['CON-001', 'Hand sanitiser · 500 ml', 'Consumables', 'bottles', 18, 10, 145, 'Everyday Supplies', 'D-01'],
    ['LAB-002', 'Arduino Uno board', 'Lab supplies', 'pcs', 6, 10, 599, 'Precision Instruments', 'C-02'],
    ['STN-003', 'Whiteboard markers', 'Stationery', 'packs', 21, 8, 180, 'Paper & Co.', 'B-03'],
    ['ELC-004', 'Mechanical keyboard', 'Electronics', 'pcs', 16, 5, 1499, 'Techline Distributors', 'A-04'],
    ['FUR-001', 'Adjustable desk chair', 'Furniture', 'pcs', 8, 3, 3200, 'Campus Furnishings', 'E-01'],
    ['LAB-003', 'Breadboard · 830 points', 'Lab supplies', 'pcs', 35, 15, 95, 'Precision Instruments', 'C-03'],
    ['CON-002', 'AA alkaline batteries', 'Consumables', 'packs', 5, 10, 160, 'Everyday Supplies', 'D-02'],
    ['STN-004', 'A5 ruled notebooks', 'Stationery', 'pcs', 64, 20, 65, 'Paper & Co.', 'B-04'],
    ['FUR-002', 'Storage organiser', 'Furniture', 'pcs', 10, 4, 450, 'Campus Furnishings', 'E-02'],
    ['LAB-004', 'Safety goggles', 'Lab supplies', 'pcs', 0, 6, 199, 'Precision Instruments', 'C-04'],
  ];
  const createdAt = new Date(Date.now() - 7 * 86400000).toISOString();
  const products = rows.map(([sku, name, category, unit, qty, minimum, cost, supplier, location], i) => ({ id: `sample-${i + 1}`, sku, name, category, unit, quantity: qty, minimum, cost, supplier, location, createdAt, updatedAt: createdAt }));
  const movements = products.map(p => ({ id: `opening-${p.id}`, productId: p.id, productName: p.name, sku: p.sku, unit: p.unit, type: 'opening', delta: p.quantity, before: 0, after: p.quantity, note: 'Sample opening stock', createdAt }));
  let data = { version: 1, products, movements };
  // Matched receipts/issues show an audit trail without altering the sample balances.
  for (const [productIndex, units, hours] of [[0, 6, 30], [2, 12, 23], [4, 2, 12]]) {
    for (const [type, offset, note] of [['in', 1, 'Restock received'], ['out', 0, 'Issued to computer lab']]) {
      data = recordMovement(data, { productId: products[productIndex].id, type, quantity: units, note });
      data.movements[0].createdAt = new Date(Date.now() - (hours + offset) * 3600000).toISOString();
      data.products.find(p => p.id === products[productIndex].id).updatedAt = data.movements[0].createdAt;
    }
  }
  return data;
}

export function parseBackup(raw) {
  let data;
  try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { fail('This file is not valid JSON. Choose an Inventory backup.'); }
  if (!data || data.version !== 1 || !Array.isArray(data.products) || !Array.isArray(data.movements)) fail('This is not a supported Inventory backup.');
  if (data.products.length > 5000 || data.movements.length > 50000) fail('This backup is too large for the browser demo.');
  const date = value => { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) fail('The backup contains an invalid date.'); return new Date(value).toISOString(); };
  const products = [];
  const productIds = new Set();
  for (const p of data.products) {
    if (!p || typeof p !== 'object') fail('Invalid product in backup.');
    const productId = text(p.id, 'Product ID', 100);
    if (productIds.has(productId)) fail('Duplicate product ID in backup.');
    productIds.add(productId);
    products.push({ ...validateProduct(p, products), id: productId, quantity: quantity(p.quantity), createdAt: date(p.createdAt), updatedAt: date(p.updatedAt) });
  }
  const movementIds = new Set();
  const movements = data.movements.map(m => {
    if (!m || typeof m !== 'object') fail('Invalid movement in backup.');
    const movementId = text(m.id, 'Movement ID', 100);
    if (movementIds.has(movementId)) fail('Duplicate movement ID in backup.');
    movementIds.add(movementId);
    if (!['in', 'out', 'adjust', 'opening'].includes(m.type)) fail('Invalid movement type in backup.');
    const before = quantity(m.before), after = quantity(m.after);
    if (!Number.isSafeInteger(m.delta) || m.delta !== after - before) fail('Invalid stock balance in backup.');
    if ((m.type === 'in' && m.delta <= 0) || (m.type === 'out' && m.delta >= 0) || (m.type === 'adjust' && m.delta === 0) || (m.type === 'opening' && before !== 0)) fail('Movement direction does not match its type.');
    return { id: movementId, productId: text(m.productId, 'Product ID', 100), productName: text(m.productName, 'Product name', 100), sku: text(m.sku, 'SKU', 40), unit: text(m.unit, 'Unit', 20), type: m.type, delta: m.delta, before, after, note: text(m.note, 'Note', 200, false), createdAt: date(m.createdAt) };
  });
  // Validate each product's complete audit chain, including deleted products.
  const chains = new Map();
  for (const movement of [...movements].reverse()) {
    const previous = chains.get(movement.productId);
    if (previous === undefined ? movement.type !== 'opening' : movement.type === 'opening' || movement.before !== previous) fail('The backup has an inconsistent stock history.');
    chains.set(movement.productId, movement.after);
  }
  if (products.some(p => chains.get(p.id) !== p.quantity)) fail('Product quantities do not match the stock history.');
  return { version: 1, products, movements };
}

function csvCell(value) {
  let string = String(value ?? '');
  if (typeof value === 'string' && /^[=+@\-\t\r]/.test(string)) string = `'${string}`;
  return `"${string.replaceAll('"', '""')}"`;
}
export function toCsv(rows) { return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'); }
export function inventoryCsv(products) {
  return toCsv([['SKU', 'Product', 'Category', 'Supplier', 'Location', 'Quantity', 'Unit', 'Reorder level', 'Unit cost (INR)', 'Stock value (INR)', 'Status'],
    ...products.map(p => [p.sku, p.name, p.category, p.supplier, p.location, p.quantity, p.unit, p.minimum, p.cost, round(p.cost * p.quantity), stockStatus(p)])]);
}
export function movementsCsv(movements) {
  return toCsv([['Date (ISO)', 'SKU', 'Product', 'Type', 'Change', 'Before', 'After', 'Unit', 'Reference / note'],
    ...movements.map(m => [m.createdAt, m.sku, m.productName, m.type, m.delta, m.before, m.after, m.unit, m.note])]);
}
