/**
 * Standalone Local Development & Node.js Server
 * Creator: thenux
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { extractVideo } = require('./extractor');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, fallbackContent) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fallbackContent);
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // API Routes
  if (pathname.startsWith('/api') || pathname.startsWith('/.netlify/functions/api')) {
    const urlOrKey = reqUrl.searchParams.get('url') || reqUrl.searchParams.get('viewkey') || reqUrl.searchParams.get('id');

    if (req.method === 'GET' && (!urlOrKey && (pathname === '/api/health' || pathname === '/api' || pathname === '/api/' || pathname.endsWith('/api')))) {
      return sendJson(res, 200, {
        creator: 'thenux',
        status: 'online',
        name: 'Pornhub Video Downloader API',
        version: '1.0.0',
        endpoints: {
          extract: 'GET /api/download?url={PORNHUB_URL_OR_VIEWKEY}',
          info: 'GET /api/info?url={PORNHUB_URL_OR_VIEWKEY}'
        },
        example: '/api/download?url=https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa'
      });
    }

    if (req.method === 'POST') {
      let bodyStr = '';
      req.on('data', chunk => bodyStr += chunk);
      req.on('end', async () => {
        try {
          let postUrl = '';
          if (req.headers['content-type']?.includes('application/json')) {
            const parsed = JSON.parse(bodyStr);
            postUrl = parsed.url || parsed.sf_url || parsed.viewkey;
          } else {
            const params = new URLSearchParams(bodyStr);
            postUrl = params.get('url') || params.get('sf_url') || params.get('viewkey');
          }

          if (!postUrl) {
            return sendJson(res, 400, {
              creator: 'thenux',
              status: 'error',
              message: 'Missing "url" parameter in request body'
            });
          }

          const result = await extractVideo(postUrl);
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, 422, {
            creator: 'thenux',
            status: 'error',
            message: err.message || 'Error parsing video'
          });
        }
      });
      return;
    }

    // GET request with url parameter
    if (!urlOrKey) {
      return sendJson(res, 400, {
        creator: 'thenux',
        status: 'error',
        message: 'Missing required parameter "url" or "viewkey". Example: /api/download?url=https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa'
      });
    }

    try {
      const result = await extractVideo(urlOrKey);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 422, {
        creator: 'thenux',
        status: 'error',
        message: err.message || 'Failed to extract video'
      });
    }
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  serveStatic(res, filePath);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`⚡ PH Downloader API Server (by thenux)`);
    console.log(`🚀 Running at: http://localhost:${PORT}`);
    console.log(`📖 API Docs:   http://localhost:${PORT}/#api-docs`);
    console.log(`=========================================`);
  });
}

module.exports = server;
