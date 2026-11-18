import { readFile, writeFile } from 'node:fs/promises';

let html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const js = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)[1];
const css = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)[1];
const script = await readFile(new URL(`../dist${js}`, import.meta.url), 'utf8');
const styles = await readFile(new URL(`../dist${css}`, import.meta.url), 'utf8');
const icon = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
html = html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/, () => `<script type="module">${script.replaceAll('</script', '<\\/script')}</script>`)
  .replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, () => `<style>${styles}</style>`)
  .replace('/favicon.svg', `data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}`);
await writeFile(new URL('../Inventory_Demo.html', import.meta.url), html);
console.log('Created Inventory_Demo.html — open directly in a modern browser.');
