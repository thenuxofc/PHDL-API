/**
 * Netlify Serverless Function - PH Downloader API
 * Creator: thenux
 */

const { extractVideo } = require('../../src/extractor');

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
      // Fallback for body parsing
    }
  }

  const urlOrKey = query.url || query.viewkey || query.id || bodyData.url || bodyData.sf_url || bodyData.viewkey;

  // Root / Health check route
  if (!urlOrKey && (path.endsWith('/api') || path.endsWith('/api/') || path.endsWith('/health') || path.endsWith('/functions/api'))) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        creator: 'thenux',
        status: 'online',
        name: 'Pornhub Video Downloader API',
        version: '1.0.0',
        documentation: 'https://github.com/thenux/phdl-api',
        endpoints: {
          extract: 'GET /api/download?url={PORNHUB_URL_OR_VIEWKEY}',
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
        creator: 'thenux',
        status: 'error',
        message: 'Missing required parameter "url" or "viewkey". Example: /api/download?url=https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa'
      }, null, 2)
    };
  }

  try {
    const result = await extractVideo(urlOrKey);
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
        creator: 'thenux',
        status: 'error',
        message: error.message || 'An error occurred while extracting video metadata'
      }, null, 2)
    };
  }
};
