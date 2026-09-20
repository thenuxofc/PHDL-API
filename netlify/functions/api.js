/**
 * Netlify Serverless Function - PH Downloader API & Direct MP4 Downloader
 * Creator: Thenux
 */

const { extractVideo, proxyStream } = require('../../src/extractor');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range, X-Requested-With',
  'Content-Type': 'application/json; charset=utf-8'
};

function getClientIp(event) {
  const headers = event.headers || {};
  const xForwardedFor = headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return headers['x-nf-client-connection-ip'] || 
         headers['client-ip'] || 
         headers['x-real-ip'] || 
         headers['cf-connecting-ip'] || '';
}

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
  const clientIp = query.ip || getClientIp(event);

  // Route 1: Direct File Download Route (/api/dl) - Redirects with attachment header
  if (path.includes('/api/dl') || path.endsWith('/dl')) {
    const directUrl = query.url;
    let filename = query.title || 'video.mp4';
    if (!filename.endsWith('.mp4')) filename += '.mp4';
    filename = filename.replace(/[^\w\d_.-]/g, '_');

    if (!directUrl) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing direct download url parameter' })
      };
    }

    return {
      statusCode: 302,
      headers: {
        'Location': directUrl,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      },
      body: ''
    };
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
        name: 'Pornhub Video Downloader & Direct MP4 API',
        version: '1.4.0',
        documentation: 'https://github.com/thenuxofc/PHDL-API',
        official_store: 'https://www.thenuxofc.store',
        ai_platform: 'https://ai.thenuxofc.store',
        api_hub: 'https://api.thenuxofc.store',
        endpoints: {
          extract: 'GET /api/download?url={PORNHUB_URL_OR_VIEWKEY}',
          direct_dl: 'GET /api/dl?url={DIRECT_MP4_URL}&title={FILENAME}',
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
    const result = await extractVideo(urlOrKey, hostBaseUrl, clientIp);
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
