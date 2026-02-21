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

    res.writeHead(200, {
      'Content-Type': contentType,
      // Reasonable default caching; HTML is typically revalidated.
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
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
