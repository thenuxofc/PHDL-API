/**
 * Standalone Local Development & Node.js Server
 * Creator: Thenux
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { extractVideo, proxyStream } = require('./extractor');

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

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost:' + PORT}`);
  const pathname = reqUrl.pathname;
  const hostBaseUrl = `${reqUrl.protocol}//${req.headers.host || 'localhost:' + PORT}`;

  // API Route: Stream Proxy (/api/stream)
  if (pathname === '/api/stream' || pathname === '/.netlify/functions/api/stream') {
    const streamTargetUrl = reqUrl.searchParams.get('url');
    const cookies = reqUrl.searchParams.get('cookies') || '';

    if (!streamTargetUrl) {
      return sendJson(res, 400, { error: 'Missing stream target url parameter' });
    }

    try {
      const streamRes = await proxyStream(streamTargetUrl, cookies, hostBaseUrl);
      res.writeHead(streamRes.status || 200, streamRes.headers);
      return res.end(streamRes.body);
    } catch (err) {
      return sendJson(res, 502, { error: 'Proxy error: ' + err.message });
    }
  }

  // API Routes: Info, Extract, Health
  if (pathname.startsWith('/api') || pathname.startsWith('/.netlify/functions/api')) {
    const urlOrKey = reqUrl.searchParams.get('url') || reqUrl.searchParams.get('viewkey') || reqUrl.searchParams.get('id');

    if (req.method === 'GET' && (!urlOrKey && (pathname === '/api/health' || pathname === '/api' || pathname === '/api/' || pathname.endsWith('/api')))) {
      return sendJson(res, 200, {
        creator: 'Thenux',
        status: 'online',
        name: 'Pornhub Video Downloader & Stream API',
        version: '1.2.0',
        official_store: 'https://www.thenuxofc.store',
        ai_platform: 'https://ai.thenuxofc.store',
        api_hub: 'https://api.thenuxofc.store',
        endpoints: {
          extract: 'GET /api/download?url={PORNHUB_URL_OR_VIEWKEY}',
          stream: 'GET /api/stream?url={STREAM_URL}',
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
              creator: 'Thenux',
              status: 'error',
              message: 'Missing "url" parameter in request body'
            });
          }

          const result = await extractVideo(postUrl, hostBaseUrl);
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, 422, {
            creator: 'Thenux',
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
        creator: 'Thenux',
        status: 'error',
        message: 'Missing required parameter "url" or "viewkey". Example: /api/download?url=https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa'
      });
    }

    try {
      const result = await extractVideo(urlOrKey, hostBaseUrl);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 422, {
        creator: 'Thenux',
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
    console.log(`⚡ PH Downloader API Server (by Thenux)`);
    console.log(`🚀 Running at: http://localhost:${PORT}`);
    console.log(`📖 API Docs:   http://localhost:${PORT}/#api-docs`);
    console.log(`=========================================`);
  });
}

module.exports = server;
