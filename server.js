const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number.parseInt(process.env.PORT || '10000', 10);
const webRoot = path.join(__dirname, 'build', 'web');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) return null;
  return targetPath;
}

function sendFile(res, filePath) {
  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Flutter web outputs some non-fingerprinted files (e.g. main.dart.js).
    // Avoid long-lived caching to ensure deploys update reliably.
    const noCacheExts = new Set(['.html', '.js', '.json', '.map']);
    const cacheControl = noCacheExts.has(ext)
      ? 'no-cache, must-revalidate'
      : 'public, max-age=604800';

    /** @type {Record<string, string>} */
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    };

    // If users previously visited a different app on the same origin,
    // an old Service Worker can keep serving stale content.
    // Clear-Site-Data helps the browser drop SW/cache/storage when it receives
    // this response from the network.
    if (ext === '.html') {
      headers['Clear-Site-Data'] = '"cache", "storage"';
    }

    res.writeHead(200, headers);

    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/__health') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end('ok');
    return;
  }

  if (urlPath === '/__version') {
    const body = JSON.stringify(
      {
        commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || null,
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
    return;
  }

  const decoded = decodeURIComponent(urlPath);
  const requestPath = decoded === '/' ? '/index.html' : decoded;

  const candidate = safeJoin(webRoot, requestPath);
  if (!candidate) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  fs.stat(candidate, (err, stat) => {
    if (!err && stat.isFile()) {
      sendFile(res, candidate);
      return;
    }

    // SPA fallback: serve index.html for unknown routes.
    sendFile(res, path.join(webRoot, 'index.html'));
  });
});

server.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Serving ${webRoot} on port ${port}`);
});
