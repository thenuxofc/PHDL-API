/**
 * Core Video Extractor for Pornhub Videos
 * Creator: Thenux
 */

const https = require('https');
const http = require('http');
const { extractViewKey, formatDuration, unescapeHtml } = require('./utils');

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Perform HTTPS GET request with browser headers and IPv4 priority, returning cookies
 * @param {string} targetUrl 
 * @param {object} customHeaders 
 * @returns {Promise<{status: number, headers: object, cookies: string, body: string}>}
 */
function fetchUrl(targetUrl, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'http:' ? http : https;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'http:' ? 80 : 443),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      family: 4, // Force IPv4 to prevent connection hangs
      timeout: 15000,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Cookie': 'accessAgeDisclaimerPH=1; platform=pc; bs=foo; age_verified=1',
        ...customHeaders
      }
    };

    const req = client.request(options, (res) => {
      const setCookies = res.headers['set-cookie'] || [];
      const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ') + '; accessAgeDisclaimerPH=1; platform=pc';

      // Handle HTTP redirects (301, 302, 303, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, targetUrl).toString();
        return fetchUrl(redirectUrl, {
          ...customHeaders,
          'Cookie': cookieHeader
        }).then(resolve).catch(reject);
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies: cookieHeader,
          body: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out while connecting to source server.'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Extracts video details and download streams from Pornhub
 * @param {string} urlOrKey 
 * @param {string} baseUrl - Host base URL for generating working stream proxy links
 * @returns {Promise<object>}
 */
async function extractVideo(urlOrKey, baseUrl = '') {
  const viewkey = extractViewKey(urlOrKey);
  if (!viewkey) {
    throw new Error('Invalid Pornhub URL or viewkey. Please provide a valid Pornhub video link or viewkey (e.g. 66db8ffed80aa).');
  }

  const primaryUrl = `https://www.pornhub.com/view_video.php?viewkey=${viewkey}`;
  let pageResponse = await fetchUrl(primaryUrl);

  let html = pageResponse.body;
  let sessionCookies = pageResponse.cookies || 'accessAgeDisclaimerPH=1; platform=pc';
  let flashvars = null;

  // Try extracting flashvars from primary page
  const flashvarsMatch = html.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
  if (flashvarsMatch) {
    try {
      flashvars = JSON.parse(flashvarsMatch[1]);
    } catch (e) {
      // JSON parse fallback
    }
  }

  // Fallback to embed page if primary page didn't yield flashvars
  if (!flashvars || !flashvars.mediaDefinitions) {
    const embedUrl = `https://www.pornhub.com/embed/${viewkey}`;
    try {
      const embedResponse = await fetchUrl(embedUrl, {
        'Referer': primaryUrl,
        'Cookie': sessionCookies
      });
      const embedMatch = embedResponse.body.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
      if (embedMatch) {
        flashvars = JSON.parse(embedMatch[1]);
        if (embedResponse.cookies) {
          sessionCookies = embedResponse.cookies;
        }
      }
    } catch (err) {
      // Continue
    }
  }

  if (!flashvars) {
    // Check if video is deleted or unavailable
    if (html.includes('video has been removed') || html.includes('video is unavailable') || html.includes('flagged for review')) {
      throw new Error('This video is unavailable or has been removed from Pornhub.');
    }
    if (html.includes('geo-restricted') || html.includes('not available in your country')) {
      throw new Error('This video is geo-restricted in the requested region.');
    }
    throw new Error('Failed to parse video stream metadata. The video may be private or requires authentication.');
  }

  // Extract metadata
  const title = unescapeHtml(flashvars.video_title || 'Pornhub Video');
  const durationSeconds = parseInt(flashvars.video_duration, 10) || 0;
  const thumbnail = flashvars.image_url || '';
  const canonicalUrl = flashvars.link_url || primaryUrl;
  const isHD = Boolean(flashvars.isHD);

  // Extract author / uploader
  let author = 'Unknown';
  let authorUrl = '';
  const authorMatch = html.match(/class="usernameBadgesWrapper"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i) ||
                      html.match(/<span class="username">([^<]+)<\/span>/i) ||
                      html.match(/data-mxptext="uploader:[^"]*name:([^"]+)"/i);
  if (authorMatch) {
    if (authorMatch[2]) {
      author = unescapeHtml(authorMatch[2].trim());
      authorUrl = authorMatch[1].startsWith('http') ? authorMatch[1] : `https://www.pornhub.com${authorMatch[1]}`;
    } else if (authorMatch[1]) {
      author = unescapeHtml(authorMatch[1].trim());
    }
  }

  // Extract views count
  let views = null;
  const viewsMatch = html.match(/<span class="count">([0-9,\.]+[KMB]?)<\/span>\s*<span class="views">views/i) ||
                     html.match(/<span class="views">[\s\S]*?<span class="count">([0-9,\.]+[KMB]?)/i);
  if (viewsMatch) {
    views = viewsMatch[1];
  }

  // Extract rating / votes
  let rating = null;
  const ratingMatch = html.match(/class="percent">([0-9]+)%<\/span>/i);
  if (ratingMatch) {
    rating = ratingMatch[1] + '%';
  }

  // Extract action tags
  const tags = [];
  if (flashvars.actionTags) {
    const parsedTags = flashvars.actionTags.split(',').map(t => t.split(':')[0].trim()).filter(Boolean);
    tags.push(...parsedTags);
  }

  // Process and organize media formats / streams
  const mediaDefinitions = flashvars.mediaDefinitions || [];
  const downloads = [];
  const encodedCookies = encodeURIComponent(sessionCookies);

  for (const media of mediaDefinitions) {
    if (!media.videoUrl || typeof media.videoUrl !== 'string' || media.videoUrl.trim() === '') {
      continue;
    }

    const qualityStr = String(media.quality || '');
    const qualityNum = parseInt(qualityStr, 10) || 0;
    const format = media.format || 'hls';
    const resolution = media.width && media.height ? `${media.width}x${media.height}` : (qualityNum ? `${qualityNum}p` : 'Auto');

    // Build working stream proxy URL (bypasses Pornhub CDN referer & cookie blocks)
    const streamProxyUrl = `${baseUrl}/api/stream?url=${encodeURIComponent(media.videoUrl)}&cookies=${encodedCookies}`;

    downloads.push({
      quality: qualityNum ? `${qualityNum}p` : (qualityStr || 'Default'),
      qualityValue: qualityNum,
      format: format,
      resolution: resolution,
      width: media.width || null,
      height: media.height || null,
      streamUrl: streamProxyUrl, // Fully working proxy stream URL for players & downloads
      url: streamProxyUrl,
      rawUrl: media.videoUrl,    // Original CDN URL
      isDefault: Boolean(media.defaultQuality)
    });
  }

  // Sort downloads by quality descending (1080p -> 720p -> 480p -> 240p)
  downloads.sort((a, b) => b.qualityValue - a.qualityValue);

  return {
    creator: 'Thenux',
    status: 'success',
    timestamp: new Date().toISOString(),
    data: {
      viewkey: viewkey,
      title: title,
      duration: {
        seconds: durationSeconds,
        formatted: formatDuration(durationSeconds)
      },
      thumbnail: thumbnail,
      url: canonicalUrl,
      isHD: isHD,
      author: {
        name: author,
        url: authorUrl || null
      },
      stats: {
        views: views,
        rating: rating
      },
      tags: tags,
      downloads_count: downloads.length,
      downloads: downloads
    }
  };
}

/**
 * Proxies and rewrites HLS streams (.m3u8 playlists and .ts segments)
 * @param {string} targetUrl 
 * @param {string} cookies 
 * @param {string} hostBaseUrl 
 * @returns {Promise<{status: number, headers: object, body: Buffer}>}
 */
function proxyStream(targetUrl, cookies = '', hostBaseUrl = '') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'http:' ? http : https;

    const req = client.get(targetUrl, {
      family: 4,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Referer': 'https://www.pornhub.com/',
        'Cookie': cookies || 'accessAgeDisclaimerPH=1; platform=pc'
      }
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        let buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';

        // If it's an M3U8 playlist, rewrite relative URLs to pass through our proxy
        if (contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL') || targetUrl.includes('.m3u8')) {
          let text = buffer.toString('utf-8');
          const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
          const encodedCookies = encodeURIComponent(cookies);

          // Replace relative lines (.m3u8 or .ts) with proxy URLs
          const rewritten = text.split('\n').map(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return line;

            let absoluteUrl = trimmed;
            if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
              absoluteUrl = baseUrl + trimmed;
            }
            return `${hostBaseUrl}/api/stream?url=${encodeURIComponent(absoluteUrl)}&cookies=${encodedCookies}`;
          }).join('\n');

          buffer = Buffer.from(rewritten, 'utf-8');
        }

        resolve({
          status: res.statusCode,
          headers: {
            'Content-Type': contentType || 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*'
          },
          body: buffer
        });
      });
    });

    req.on('error', reject);
  });
}

module.exports = {
  extractVideo,
  proxyStream,
  fetchUrl
};
