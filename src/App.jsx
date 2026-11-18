import React, { useEffect, useRef, useState } from 'react';
import { Archive, ArrowDownLeft, ArrowDownToLine, ArrowLeftRight, ArrowRight, ArrowUpRight, Box, Check, CheckCircle2, ChevronLeft, ChevronRight, Database, Download, HardDrive, Layers3, Package, PackageOpen, Pencil, Plus, RotateCcw, Search, SlidersHorizontal, Store, TriangleAlert, Trash2, Upload, X } from 'lucide-react';
import { STORAGE_KEY, CATEGORIES, UNITS, stockStatus, suggestedOrder, summary, createDemoData, saveProduct, recordMovement, deleteProduct, parseBackup, inventoryCsv, movementsCsv } from './inventory.js';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
const number = (value) => new Intl.NumberFormat('en-IN').format(value);
const date = (value, time = false) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value));
const statusLabels = { healthy: 'In stock', low: 'Low stock', out: 'Out of stock' };
const typeLabels = { in: 'Stock in', out: 'Stock out', adjust: 'Adjustment', opening: 'Opening stock' };
const navItems = [{ id: 'inventory', title: 'Inventory', icon: Package }, { id: 'movements', title: 'Stock movements', icon: ArrowLeftRight }, { id: 'low', title: 'Low stock', icon: TriangleAlert }, { id: 'data', title: 'Manage data', icon: Database }];

function download(contents, filename, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { data: parseBackup(stored), error: '' };
    const data = createDemoData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { data, error: '' };
  } catch {
    return { data: createDemoData(), error: 'Saved data could not be loaded. Sample data is shown. Your original saved data has not been changed. Restore a valid backup in Manage data.' };
  }
}

function Modal({ title, description, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => { if (dialog.open) dialog.close(); }; }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} aria-labelledby="modal-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-content"><div className="modal-header"><div><h2 id="modal-title">{title}</h2><p>{description}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>{children}</div>
  </dialog>;
}
function Field({ label, hint, children, full = false }) {
  return <label className={`field ${full ? 'full' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function ErrorNote({ children }) { return children ? <div className="error-note" role="alert"><TriangleAlert size={17} /><span>{children}</span></div> : null; }
function Status({ product }) { const status = stockStatus(product); return <span className={`status ${status}`}><i />{statusLabels[status]}</span>; }
function EmptyState({ title, text, action, label }) {
  return <div className="empty-state"><PackageOpen size={34} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p>{action && <button className="button secondary" onClick={action}>{label}</button>}</div>;
}
function Pagination({ count, page, setPage, size, noun }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return <div className="table-footer"><span>{count ? `${(page - 1) * size + 1}–${Math.min(page * size, count)} of ${count} ${noun}` : `0 ${noun}`}</span><div className="pagination"><button className="icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={17} /></button><span>Page {page} of {pages}</span><button className="icon-button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={17} /></button></div></div>;
}

function ProductForm({ product, data, onSave, onClose, onDelete }) {
  const [error, setError] = useState('');
  const categories = [...new Set([...CATEGORIES, ...data.products.map(p => p.category)])];
  const units = [...new Set([...UNITS, ...data.products.map(p => p.unit)])];
  function submit(e) {
    e.preventDefault();
    try { onSave(saveProduct(data, Object.fromEntries(new FormData(e.currentTarget)), product?.id), product ? 'Product updated.' : 'Product added.'); }
    catch (err) { setError(err.message); }
  }
  return <Modal title={product ? 'Edit product' : 'Add product'} description={product ? 'Update product details. Use a stock movement to change quantity.' : 'Add an item to your inventory. Fields marked * are required.'} onClose={onClose} wide>
    <form onSubmit={submit}><div className="modal-body"><ErrorNote>{error}</ErrorNote><div className="form-grid">
      <Field label="Product name *" full><input name="name" defaultValue={product?.name} placeholder="e.g. Wireless mouse" maxLength={100} required autoFocus /></Field>
      <Field label="SKU *" hint="A unique code for this product."><input name="sku" defaultValue={product?.sku} placeholder="e.g. ELC-005" maxLength={40} required /></Field>
      <Field label="Category *"><select name="category" defaultValue={product?.category || 'Electronics'}>{categories.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Unit cost (₹) *"><input name="cost" type="number" min="0" max="10000000" step="0.01" defaultValue={product?.cost ?? ''} placeholder="0.00" required /></Field>
      <Field label="Unit *"><select name="unit" defaultValue={product?.unit || 'pcs'}>{units.map(u => <option key={u}>{u}</option>)}</select></Field>
      {!product && <Field label="Opening stock *"><input name="quantity" type="number" min="0" max="1000000" step="1" defaultValue="0" required /></Field>}
      <Field label="Reorder level *" hint="Alert when stock reaches this quantity or below."><input name="minimum" type="number" min="0" max="1000000" step="1" defaultValue={product?.minimum ?? 5} required /></Field>
      <Field label="Storage location"><input name="location" defaultValue={product?.location} placeholder="e.g. A-01" maxLength={50} /></Field>
      <Field label="Supplier" full><input name="supplier" defaultValue={product?.supplier} placeholder="Supplier name" maxLength={100} /></Field>
    </div></div><div className="modal-footer">{product && <button type="button" className="button text-danger" onClick={() => onDelete(product)}><Trash2 size={16} />Delete</button>}<div className="spacer" /><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit"><Check size={17} />{product ? 'Save changes' : 'Add product'}</button></div></form>
  </Modal>;
}

function MovementForm({ data, productId, initialType, onSave, onClose }) {
  const [selectedId, setSelectedId] = useState(productId || data.products[0]?.id || '');
  const [type, setType] = useState(initialType || 'in');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const product = data.products.find(p => p.id === selectedId);
  const after = product && qty !== '' ? type === 'adjust' ? Number(qty) : product.quantity + (type === 'in' ? Number(qty) : -Number(qty)) : null;
  function submit(e) {
    e.preventDefault();
    try { onSave(recordMovement(data, { productId: selectedId, type, quantity: qty, note: new FormData(e.currentTarget).get('note') }), 'Stock movement recorded.'); }
    catch (err) { setError(err.message); }
  }
  return <Modal title="Record stock movement" description="Every movement is saved to the stock history." onClose={onClose}>
    <form onSubmit={submit}><div className="modal-body"><ErrorNote>{error}</ErrorNote>
      <div className="type-selector" aria-label="Movement type">{[['in', 'Stock in', ArrowDownLeft], ['out', 'Stock out', ArrowUpRight], ['adjust', 'Adjust', SlidersHorizontal]].map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={type === value} className={type === value ? 'selected' : ''} onClick={() => { setType(value); setError(''); }}><Icon size={17} />{label}</button>)}</div>
      <Field label="Product *"><select value={selectedId} onChange={e => { setSelectedId(e.target.value); setError(''); }} required autoFocus>{[...data.products].sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></Field>
      {product && <div className="balance-preview"><div><span>Current stock</span><strong>{number(product.quantity)} <small>{product.unit}</small></strong></div><ArrowRight size={19} /><div><span>After movement</span><strong className={after < 0 ? 'danger-text' : ''}>{after === null ? '—' : number(after)} <small>{product.unit}</small></strong></div></div>}
      <Field label={type === 'adjust' ? 'Counted quantity *' : 'Quantity *'} hint={type === 'adjust' ? 'Enter the actual quantity on the shelf, not the difference.' : `Number of ${product?.unit || 'units'} to ${type === 'in' ? 'receive' : 'issue'}.`}><input type="number" min={type === 'adjust' ? 0 : 1} max="1000000" step="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" required /></Field>
      <Field label={`Reference / note${type === 'adjust' ? ' *' : ''}`}><textarea name="note" placeholder={type === 'adjust' ? 'Reason for adjustment' : 'e.g. Purchase order #104 or issued to lab'} maxLength={200} required={type === 'adjust'} rows="3" /></Field>
    </div><div className="modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit"><Check size={17} />Record movement</button></div></form>
  </Modal>;
}

export default function App() {
  const [initial] = useState(loadData);
  const [data, setData] = useState(initial.data);
  const [warning, setWarning] = useState(initial.error);
  const [storageReady, setStorageReady] = useState(!initial.error);
  const [view, setView] = useState('inventory');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [movementType, setMovementType] = useState('all');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);
  const totals = summary(data.products);
  const currentNav = navItems.find(n => n.id === view);
  const pageSize = view === 'movements' ? 10 : 8;
  const categories = [...new Set(data.products.map(p => p.category))].sort();
  const lowerSearch = search.trim().toLowerCase();
  const filtered = data.products.filter(p => (view !== 'low' || stockStatus(p) !== 'healthy') &&
    (category === 'all' || p.category === category) && (status === 'all' || stockStatus(p) === status) &&
    `${p.name} ${p.sku} ${p.supplier} ${p.location}`.toLowerCase().includes(lowerSearch))
    .sort((a, b) => sort === 'quantity' ? a.quantity - b.quantity : sort === 'value' ? b.quantity * b.cost - a.quantity * a.cost : sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : a.name.localeCompare(b.name));
  const filteredMovements = data.movements.filter(m => (movementType === 'all' || m.type === movementType) && `${m.productName} ${m.sku} ${m.note}`.toLowerCase().includes(lowerSearch));
  const itemCount = view === 'movements' ? filteredMovements.length : filtered.length;
  const safePage = Math.min(page, Math.max(1, Math.ceil(itemCount / pageSize)));
  const productsOnPage = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const movementPage = filteredMovements.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilters = search || category !== 'all' || status !== 'all' || movementType !== 'all';

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { setPage(1); }, [search, category, status, sort, movementType]);
  useEffect(() => {
    const sync = event => {
      if (event.key !== STORAGE_KEY) return;
      try { if (!event.newValue) throw new Error(); setData(parseBackup(event.newValue)); setModal(null); setToast('Inventory updated from another tab.'); }
      catch { setWarning('Data changed in another tab and could not be read. Reload or restore a backup.'); }
    };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  function clearFilters() { setSearch(''); setCategory('all'); setStatus('all'); setMovementType('all'); setPage(1); }
  function navigate(next) { setView(next); clearFilters(); setSort(next === 'low' ? 'quantity' : 'name'); }
  function commit(next, message) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { setStorageReady(false); throw new Error('Could not save in this browser. Storage may be full or disabled. Download a backup in Manage data, then free some space.'); }
    setData(next); setStorageReady(true); setWarning(''); setModal(null); setToast(message);
  }
  function confirmAction(action, message) { try { commit(action(), message); } catch (err) { setModal(m => ({ ...m, error: err.message })); } }
  function exportCsv() {
    download(view === 'movements' ? movementsCsv(filteredMovements) : inventoryCsv(filtered), `${view === 'movements' ? 'stock-movements' : view === 'low' ? 'low-stock' : 'inventory'}-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
    setToast('CSV exported. Includes all matching rows.');
  }
  async function importBackup(e) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setBusy(true);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('Choose a backup smaller than 8 MB.');
      const restored = parseBackup(await file.text());
      setModal({ type: 'restore', data: restored });
    } catch (err) { setWarning(err.message); } finally { setBusy(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Box size={24} strokeWidth={1.65} /></span><div><strong>Inventory</strong><span>Stock management</span></div></div>
      <div className="workspace-label">WORKSPACE</div><nav aria-label="Main navigation">{navItems.map(({ id, title, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''} ${id === 'data' ? 'data-nav' : ''}`} onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined}><Icon size={19} /><span>{title}</span>{id === 'low' && totals.low > 0 && <b>{totals.low}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><HardDrive size={18} /><div><strong>Local workspace</strong><p>Your data stays in this browser.</p><button onClick={() => navigate('data')}>Backup & restore <ArrowRight size={13} /></button></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><Store size={16} /><span>Main store</span><span className="slash">/</span><strong>{currentNav.title}</strong></div><div className="topbar-meta"><span className={`saved-indicator ${storageReady ? '' : 'storage-warning'}`}><i />{storageReady ? 'Saved in this browser' : 'Storage needs attention'}</span><span className="today">{date(new Date())}</span></div></header>
      <main id="main-content">
        {warning && <div className="warning-banner" role="alert"><TriangleAlert size={19} /><span>{warning}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => setWarning('')}><X size={16} /></button></div>}
        <div className="page-heading"><div><div className="eyebrow">MAIN STORE</div><h1>{currentNav.title}{view === 'low' && <span className="heading-count">{totals.low}</span>}</h1><p>{view === 'inventory' ? 'A clear view of every item, quantity, and stock level.' : view === 'movements' ? 'Track every receipt, issue, and inventory adjustment.' : view === 'low' ? 'Items at or below their reorder level. Keep your shelves ready.' : 'Keep a copy of your inventory and prepare your next demonstration.'}</p></div><div className="heading-actions">{view !== 'data' && <button className="button secondary" onClick={exportCsv}><Download size={17} />Export CSV</button>}{view === 'inventory' ? <button className="button primary" onClick={() => setModal({ type: 'product' })}><Plus size={18} />Add product</button> : view !== 'data' && <button className="button primary" disabled={!data.products.length} onClick={() => setModal({ type: 'movement', initialType: 'in' })}><ArrowLeftRight size={17} />{view === 'low' ? 'Receive stock' : 'Record movement'}</button>}</div></div>

        {view === 'inventory' && <section className="metrics" aria-label="Inventory summary">
          <div className="metric"><div className="metric-label">Total products <Package size={16} /></div><strong>{number(totals.products)}</strong><span>Across {categories.length} categories</span></div>
          <div className="metric"><div className="metric-label">Stock on hand <Layers3 size={16} /></div><strong>{number(totals.units)}</strong><span>Combined product units</span></div>
          <div className="metric"><div className="metric-label">Inventory value <Archive size={16} /></div><strong>{money(totals.value)}</strong><span>Based on unit cost</span></div>
          <button className="metric metric-link" onClick={() => navigate('low')}><div className="metric-label">Needs attention <TriangleAlert size={16} /></div><strong>{number(totals.low)}<ArrowUpRight size={19} /></strong><span>{data.products.filter(p => p.quantity === 0).length} out of stock · View items</span></button>
        </section>}

        {view === 'low' && totals.low > 0 && <div className="reorder-banner"><div className="reorder-icon"><TriangleAlert size={22} /></div><div><strong>{data.products.filter(p => p.quantity === 0).length} items are out of stock</strong><p>Orders target twice the reorder level, with at least one unit.</p></div><div className="reorder-total"><span>Estimated replenishment</span><strong>{money(data.products.filter(p => stockStatus(p) !== 'healthy').reduce((n, p) => n + suggestedOrder(p) * p.cost, 0))}</strong></div></div>}

        {view !== 'data' && <section className="table-panel" aria-label={view === 'movements' ? 'Stock movement history' : 'Product inventory'}>
          <div className="panel-heading"><div><h2>{view === 'movements' ? 'Movement history' : view === 'low' ? 'Reorder list' : 'All products'}</h2><span className="count-pill">{view === 'movements' ? filteredMovements.length : filtered.length}</span></div><span className="panel-note">{view === 'movements' ? 'Newest first' : view === 'low' ? 'Restock before you run out' : 'Track, update, and organise'}</span></div>
          <div className="table-toolbar"><label className="search-field"><Search size={18} /><input aria-label={view === 'movements' ? 'Search movements' : 'Search products'} placeholder={view === 'movements' ? 'Search product, SKU, or reference…' : 'Search name, SKU, supplier…'} value={search} onChange={e => setSearch(e.target.value)} />{search && <button className="icon-button" onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}</label><div className="filter-fields">
            {view === 'movements' ? <select aria-label="Movement type filter" value={movementType} onChange={e => setMovementType(e.target.value)}><option value="all">All movements</option>{Object.entries(typeLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select> : <><select aria-label="Category filter" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>{view === 'inventory' && <select aria-label="Stock status filter" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>}<select className="sort-select" aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name: A–Z</option><option value="quantity">Stock: low to high</option><option value="value">Value: high to low</option><option value="newest">Recently added</option></select></>}
          </div></div>
          {hasFilters && <div className="filter-summary"><span>{itemCount} result{itemCount !== 1 ? 's' : ''} matching your filters</span><button onClick={clearFilters}>Clear filters <X size={13} /></button></div>}

          {view !== 'movements' ? (filtered.length ? <div className="table-scroll"><table className="product-table"><thead><tr><th>Product</th><th>Category</th><th className="numeric">On hand</th><th className="numeric">{view === 'low' ? 'Suggested order' : 'Unit cost'}</th><th>Status</th><th className="actions-heading">Actions</th></tr></thead><tbody>{productsOnPage.map(p => <tr key={p.id}><td><div className="product-cell"><span className={`product-symbol category-${CATEGORIES.indexOf(p.category)}`}><Package size={19} strokeWidth={1.65} /></span><div><strong>{p.name}</strong><span className="product-meta"><code>{p.sku}</code>{p.location && <><i />{p.location}</>}</span></div></div></td><td><span className="category-text">{p.category}</span></td><td className="numeric"><strong className={stockStatus(p) === 'out' ? 'danger-text' : stockStatus(p) === 'low' ? 'amber-text' : ''}>{number(p.quantity)} <small className="unit-label">{p.unit}</small></strong><span className="cell-sub">Min. {p.minimum}</span></td><td className="numeric">{view === 'low' ? <><strong>{number(suggestedOrder(p))} <small className="unit-label">{p.unit}</small></strong><span className="cell-sub">{money(suggestedOrder(p) * p.cost)}</span></> : money(p.cost)}</td><td><Status product={p} /></td><td><div className="row-actions"><button className="icon-button" title={`Record stock for ${p.name}`} aria-label={`Record stock for ${p.name}`} onClick={() => setModal({ type: 'movement', productId: p.id })}><ArrowLeftRight size={17} /></button><button className="icon-button" title={`Edit ${p.name}`} aria-label={`Edit ${p.name}`} onClick={() => setModal({ type: 'product', product: p })}><Pencil size={16} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title={hasFilters ? 'No matching products' : view === 'low' ? 'Stock levels look good' : 'Your inventory starts here'} text={hasFilters ? 'Try a different search or clear your filters.' : view === 'low' ? 'All products are above their reorder level.' : 'Add your first product to start recording stock.'} action={hasFilters ? clearFilters : view === 'low' ? () => navigate('inventory') : () => setModal({ type: 'product' })} label={hasFilters ? 'Clear filters' : view === 'low' ? 'View inventory' : 'Add product'} />) : (filteredMovements.length ? <div className="table-scroll"><table className="movement-table"><thead><tr><th>Date & time</th><th>Product</th><th>Movement</th><th className="numeric">Change</th><th className="numeric">Balance</th><th>Reference / note</th></tr></thead><tbody>{movementPage.map(m => <tr key={m.id}><td className="date-cell">{date(m.createdAt)}<span className="cell-sub">{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.createdAt))}</span></td><td><strong>{m.productName}</strong><span className="cell-sub"><code>{m.sku}</code>{!data.products.some(p => p.id === m.productId) && ' · Deleted'}</span></td><td><span className={`movement-badge ${m.type}`}>{m.type === 'in' ? <ArrowDownLeft size={14} /> : m.type === 'out' ? <ArrowUpRight size={14} /> : m.type === 'adjust' ? <SlidersHorizontal size={14} /> : <Box size={14} />}{typeLabels[m.type]}</span></td><td className={`numeric ${m.delta > 0 ? 'green-text' : m.delta < 0 ? 'amber-text' : ''}`}><strong>{m.delta > 0 ? '+' : ''}{number(m.delta)}</strong></td><td className="numeric">{number(m.after)} <small className="unit-label">{m.unit}</small></td><td className="note-cell">{m.note || '—'}</td></tr>)}</tbody></table></div> : <EmptyState title="No movements found" text={hasFilters ? 'Try a different search or movement type.' : 'Record a receipt, issue, or stock adjustment to begin.'} action={hasFilters ? clearFilters : data.products.length ? () => setModal({ type: 'movement' }) : () => navigate('inventory')} label={hasFilters ? 'Clear filters' : data.products.length ? 'Record movement' : 'Add a product first'} />)}
          <Pagination count={itemCount} page={safePage} setPage={setPage} size={pageSize} noun={view === 'movements' ? 'movements' : 'products'} />
        </section>}

        {view === 'inventory' && <div className="below-table"><span><CheckCircle2 size={15} />Changes save automatically after each action.</span><button onClick={() => navigate('movements')}>View stock movements <ArrowRight size={15} /></button></div>}

        {view === 'data' && <div className="data-page"><section className="storage-overview"><span className="storage-icon"><HardDrive size={26} /></span><div><h2>Saved on this device</h2><p>{totals.products} products and {data.movements.length} stock movements. Download a backup before clearing your browser data or switching devices.</p></div><span className="status healthy"><i />Browser storage</span></section><section className="data-actions">
          <div className="data-action"><Download size={23} /><div><h3>Download a backup</h3><p>Save all products and their complete stock history as a JSON file.</p></div><button className="button secondary" onClick={() => { download(JSON.stringify(data, null, 2), `inventory-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); setToast('Backup downloaded.'); }}><ArrowDownToLine size={16} />Download backup</button></div>
          <div className="data-action"><Upload size={23} /><div><h3>Restore a backup</h3><p>Choose a backup made by this app. You can review it before replacing your current data.</p></div><button className="button secondary" disabled={busy} onClick={() => fileInput.current.click()}><Upload size={16} />{busy ? 'Checking file…' : 'Choose backup'}</button><input ref={fileInput} className="hidden-input" type="file" accept=".json,application/json" onChange={importBackup} aria-label="Choose backup file" /></div>
          <div className="data-action"><RotateCcw size={23} /><div><h3>Reset sample data</h3><p>Start again with 16 sample products and stock history. This replaces your current inventory.</p></div><button className="button secondary" onClick={() => setModal({ type: 'reset' })}><RotateCcw size={16} />Reset demo</button></div>
        </section><div className="data-explainer"><h3>About this project</h3><p>A single-store inventory and stock management system. Sample products and suppliers are fictional. Stock value uses the current unit cost, and all amounts are in Indian rupees (INR).</p><p>Records are stored in this browser, with no account or shared database. Other browsers and devices have separate inventories. Use backups to transfer your data.</p></div></div>}
        <footer className="app-footer"><span>Inventory & Stock Management System</span><span>Single-store workspace <i /> INR ₹</span></footer>
      </main>
    </div>
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} /><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
    {modal?.type === 'product' && <ProductForm product={modal.product} data={data} onClose={() => setModal(null)} onSave={commit} onDelete={product => setModal({ type: 'delete', product })} />}
    {modal?.type === 'movement' && <MovementForm data={data} productId={modal.productId} initialType={modal.initialType} onClose={() => setModal(null)} onSave={commit} />}
    {['delete', 'reset', 'restore'].includes(modal?.type) && <Modal title={modal.type === 'delete' ? 'Delete product?' : modal.type === 'reset' ? 'Reset to sample data?' : 'Restore this backup?'} description={modal.type === 'delete' ? `Remove ${modal.product.name} (${modal.product.sku}) from your inventory.` : modal.type === 'reset' ? 'Your current products and stock history will be replaced.' : `This backup contains ${modal.data.products.length} products and ${modal.data.movements.length} movements.`} onClose={() => setModal(null)}><div className="modal-body"><ErrorNote>{modal.error}</ErrorNote><div className="confirm-note"><TriangleAlert size={20} /><p>{modal.type === 'delete' ? `This removes ${modal.product.quantity} ${modal.product.unit} from the active inventory. Past movements will remain in the history. This cannot be undone without a backup.` : 'Download a backup first if you want to keep your current data. This action replaces everything in this browser.'}</p></div></div><div className="modal-footer"><button className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className={`button ${modal.type === 'delete' ? 'danger' : 'primary'}`} onClick={() => modal.type === 'delete' ? confirmAction(() => deleteProduct(data, modal.product.id), 'Product deleted. Stock history retained.') : modal.type === 'reset' ? confirmAction(createDemoData, 'Sample data restored.') : confirmAction(() => modal.data, 'Backup restored successfully.')}>{modal.type === 'delete' ? 'Delete product' : modal.type === 'reset' ? 'Reset demo' : 'Restore backup'}</button></div></Modal>}
  </div>;
}

