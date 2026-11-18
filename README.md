# Inventory & Stock Management System

A small college project for managing a single store. React + Vite, plain CSS, Lucide icons, and browser localStorage. No backend, API key, or paid service is required.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

## Validate and build

```sh
npm test
npm run build
npm run preview
```

For a server-free demonstration, run `npm run demo` after building, then open `Inventory_Demo.html` in a modern browser. Its data is separate from the hosted app; use a JSON backup to transfer records.

## Deploy on Vercel

Import the project repository, choose **Vite**, and use the project directory as the root. `vercel.json` configures `npm run build` and the `dist` output directory. No environment variables are needed. Alternatively, run `npx vercel --prod` after signing in.

## Features

- Add, edit, and delete products with unique SKUs, categories, supplier, location, unit cost and reorder levels.
- Record stock receipts, issues and physical-count adjustments. Negative stock is prevented.
- View a dated movement history, including history for deleted products.
- Search, filter, sort and paginate inventory; export matching products or movements to CSV.
- Review low-stock/out-of-stock items and suggested reorder quantities.
- Download and restore validated JSON backups; reset to 16 realistic sample products.
- Responsive desktop/mobile layout and accessible native dialogs.

## Demo flow

1. Add a product with 10 units and a reorder level of 5.
2. Issue 6 units; it appears in Low stock.
3. Receive 10 units; it returns to In stock.
4. Check the movement history, export CSV, and download a backup.
5. Reload to show persistence. Reset sample data from Manage data when finished.

## Limitations

Data is local to one browser and origin. It does not sync between users or devices. Clearing browser data removes records, so keep backups. Product and supplier examples are fictional. There is no authentication, purchase-order sending, barcode hardware, or external API integration. Stock value uses current unit costs, not accounting valuation methods. Suggested reorders target twice the reorder level, with a minimum target of one unit. Quantities are whole units. Import supports this app's JSON backups, not arbitrary spreadsheets.

## Structure

- `src/App.jsx`: screens, forms and browser persistence.
- `src/main.jsx`: application entry and error boundary.
- `src/inventory.js`: stock rules, sample records, backup validation and CSV export.
- `src/styles.css`: responsive styles.
- `tests/inventory.test.js`: stock-rule and data-integrity tests.
- `tests/render.test.js`: actual React rendering and storage-failure checks.

## Verification

All 18 stock-rule, backup, currency, React rendering and storage-failure checks pass. The production build and standalone bundle generation pass. Interactive browser and responsive visual verification remain pending: this session could not reach the local preview, and its browser policy blocks local file URLs. No external APIs are used.

Source repository: https://github.com/omjirao00/Inventory_Stock_Management

Configured for Vercel deployment. Hosting has not been published yet.
