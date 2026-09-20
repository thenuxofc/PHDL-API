/**
 * Netlify Serverless Function - PH Downloader API & Stream Proxy
 * Creator: Thenux
 */

const { extractVideo, proxyStream } = require('../../src/extractor');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json; charset=utf-8'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const path = event.path || '';
  const query = event.queryStringParameters || {};
  let bodyData = {};

  if (event.body) {
    try {
      if (event.isBase64Encoded) {
        const buff = Buffer.from(event.body, 'base64');
        bodyData = JSON.parse(buff.toString('utf-8'));
      } else if (event.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(event.body);
        bodyData = Object.fromEntries(params.entries());
      } else {
        bodyData = JSON.parse(event.body);
      }
    } catch (e) {
      // Fallback
    }
  }

  const host = event.headers['host'] || 'thenuxphdl.netlify.app';
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const hostBaseUrl = `${proto}://${host}`;

  // Route 1: Stream & Segment Proxy (/api/stream)
  if (path.includes('/api/stream') || path.endsWith('/stream')) {
    const streamTargetUrl = query.url || query.src;
    const cookies = query.cookies || '';

    if (!streamTargetUrl) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing stream target url parameter' })
      };
    }

    try {
      const streamRes = await proxyStream(streamTargetUrl, cookies, hostBaseUrl);
      const isMpegUrl = streamRes.headers['Content-Type']?.includes('mpegurl') || streamTargetUrl.includes('.m3u8');
      
      if (isMpegUrl) {
        return {
          statusCode: streamRes.status || 200,
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          },
          body: streamRes.body.toString('utf-8')
        };
      } else {
        // Binary (.ts segment)
        return {
          statusCode: streamRes.status || 200,
          isBase64Encoded: true,
          headers: {
            'Content-Type': 'video/mp2t',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
          },
          body: streamRes.body.toString('base64')
        };
      }
    } catch (err) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Stream proxy error: ' + err.message })
      };
    }
  }

  const urlOrKey = query.url || query.viewkey || query.id || bodyData.url || bodyData.sf_url || bodyData.viewkey;

  // Root / Health check route
  if (!urlOrKey && (path.endsWith('/api') || path.endsWith('/api/') || path.endsWith('/health') || path.endsWith('/functions/api'))) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        creator: 'Thenux',
        status: 'online',
        name: 'Pornhub Video Downloader & Stream API',
        version: '1.2.0',
        documentation: 'https://github.com/thenuxofc/PHDL-API',
        official_store: 'https://www.thenuxofc.store',
        ai_platform: 'https://ai.thenuxofc.store',
        api_hub: 'https://api.thenuxofc.store',
        endpoints: {
          extract: 'GET /api/download?url={PORNHUB_URL_OR_VIEWKEY}',
          stream: 'GET /api/stream?url={STREAM_URL}',
          info: 'GET /api/info?url={PORNHUB_URL_OR_VIEWKEY}',
          post_convert: 'POST /api/convert (body: { "url": "..." })'
        },
        example: '/api/download?url=https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa'
      }, null, 2)
    };
  }

  if (!urlOrKey) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        creator: 'Thenux',
        status: 'error',
        message: 'Missing required parameter "url" or "viewkey". Example: /api/download?url=https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa'
      }, null, 2)
    };
  }

  try {
    const result = await extractVideo(urlOrKey, hostBaseUrl);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 422,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        creator: 'Thenux',
        status: 'error',
        message: error.message || 'An error occurred while extracting video metadata'
      }, null, 2)
    };
  }
};
