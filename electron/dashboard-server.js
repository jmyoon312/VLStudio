import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm'
};

const PROXY_PREFIXES = [
  '/api/',
  '/media/',
  '/downloads/',
  '/thumbnails/',
  '/temp/',
  '/files/',
  '/docs/',
  '/openapi.json',
  '/docs'
];

let serverInstance = null;

export function startDashboardServer(port = 5183, backendPort = 8000, hotpatchDir = null) {
  if (serverInstance) {
    return serverInstance;
  }

  // Candidate paths for dashboard static build
  const candidateDirs = [
    hotpatchDir,
    path.join(process.resourcesPath || '', 'apps', 'dashboard', 'dist'),
    path.join(process.resourcesPath || '', 'dist'),
    path.join(__dirname, '..', 'apps', 'dashboard', 'dist'),
    path.join(__dirname, '..', 'dist')
  ].filter(Boolean);

  const getActiveStaticDir = () => {
    for (const d of candidateDirs) {
      if (fs.existsSync(path.join(d, 'index.html'))) {
        return d;
      }
    }
    return candidateDirs[candidateDirs.length - 1];
  };

  serverInstance = http.createServer((req, res) => {
    const reqUrl = req.url || '/';
    const parsedPath = reqUrl.split('?')[0];

    // 1. Reverse Proxy to FastAPI Backend (port 8000)
    const shouldProxy = PROXY_PREFIXES.some(prefix => parsedPath === prefix || parsedPath.startsWith(prefix));
    if (shouldProxy) {
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: backendPort,
          path: reqUrl,
          method: req.method,
          headers: {
            ...req.headers,
            host: `127.0.0.1:${backendPort}`,
            'x-forwarded-host': req.headers.host || `localhost:${port}`,
            'x-forwarded-proto': 'http'
          }
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.warn(`[DashboardServer] Backend proxy error (${parsedPath}):`, err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backend gateway unavailable', detail: err.message }));
        }
      });

      req.pipe(proxyReq);
      return;
    }

    // 2. Static File Serving from Active Dashboard Dist
    const staticDir = getActiveStaticDir();
    let filePath = path.join(staticDir, parsedPath === '/' ? 'index.html' : parsedPath);

    // Security check: prevent directory traversal
    if (!filePath.startsWith(staticDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': stats.size,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // SPA Fallback: serve index.html for client-side routing
      const indexPath = path.join(staticDir, 'index.html');
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (!indexErr && indexStats.isFile()) {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': indexStats.size,
            'Cache-Control': 'no-cache'
          });
          fs.createReadStream(indexPath).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found - Dashboard static files missing');
        }
      });
    });
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[DashboardServer] Port ${port} is already in use. Skipping built-in server.`);
    } else {
      console.error('[DashboardServer] Server error:', err.message);
    }
  });

  serverInstance.listen(port, '0.0.0.0', () => {
    console.log(`🚀 [DashboardServer] Universal Web Dashboard running at http://0.0.0.0:${port} (Tunnel & Chrome ready)`);
  });

  return serverInstance;
}

export function stopDashboardServer() {
  if (serverInstance) {
    try {
      serverInstance.close();
      console.log('[DashboardServer] Server stopped.');
    } catch {}
    serverInstance = null;
  }
}
