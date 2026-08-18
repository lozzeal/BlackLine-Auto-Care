/**
 * Локальний dev-сервер без залежностей: статика з кореня + функція /api/submit-form.
 * Емулює те, що на проді робить Vercel.
 *
 *   node scripts/dev-server.mjs          → http://localhost:3000
 *   node scripts/dev-server.mjs --port=4000
 *
 * Змінні читаються з .env.local (якщо файл є). Без TELEGRAM_BOT_TOKEN
 * форма чесно поверне 503 — так само, як у проді.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Веб-корінь = корінь проєкту (як outputDirectory: "." на Vercel).
const webRoot = root;
// Службові теки та файли, які Vercel не деплоїть (.vercelignore) —
// локально теж не віддаємо, щоб поведінка збігалась із продом.
const HIDDEN = ['memory', 'docs', 'scripts', 'node_modules', 'README.md', '.env.example'];
const port = Number((process.argv.find((a) => a.startsWith('--port=')) || '').split('=')[1]) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

/* --- .env.local --- */
try {
  const raw = await readFile(path.join(root, '.env.local'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
  console.log('· підхоплено .env.local');
} catch {
  console.log('· .env.local не знайдено — /api/submit-form відповідатиме 503');
}

const { default: bookingHandler } = await import(new URL('../api/submit-form.js', import.meta.url));

/** Додає до ServerResponse хелпери, які на Vercel є з коробки. */
function enhance(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return res;
  };
  return res;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  const top = pathname.split('/').filter(Boolean)[0];
  if (top && (HIDDEN.includes(top) || top.startsWith('.'))) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }

  // cleanUrls: /about → /about.html
  const candidates = [pathname];
  if (!path.extname(pathname)) candidates.push(pathname + '.html');

  for (const candidate of candidates) {
    const filePath = path.join(webRoot, candidate);
    if (!filePath.startsWith(webRoot)) break;   // захист від ../
    try {
      const info = await stat(filePath);
      if (!info.isFile()) continue;
      const body = await readFile(filePath);
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      return res.end(body);
    } catch { /* пробуємо наступний варіант */ }
  }

  const notFound = await readFile(path.join(webRoot, '404.html')).catch(() => 'Not found');
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(notFound);
}

createServer(async (req, res) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} → ${res.statusCode} (${Date.now() - started}ms)`);
  });

  try {
    if (req.url.split('?')[0] === '/api/submit-form') {
      return await bookingHandler(req, enhance(res));
    }
    return await serveStatic(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Internal error' }));
  }
}).listen(port, () => {
  console.log(`\n  BlackLine Auto Care → http://localhost:${port}\n`);
});
