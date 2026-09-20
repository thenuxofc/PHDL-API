/**
 * Core Video Extractor for Pornhub Videos
 * Creator: thenux
 */

const https = require('https');
const http = require('http');
const { extractViewKey, formatDuration, unescapeHtml } = require('./utils');

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Perform HTTPS GET request with browser headers and IPv4 priority
 * @param {string} targetUrl 
 * @param {object} customHeaders 
 * @returns {Promise<{status: number, headers: object, body: string}>}
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
      // Handle HTTP redirects (301, 302, 303, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, targetUrl).toString();
        return fetchUrl(redirectUrl, customHeaders).then(resolve).catch(reject);
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
 * @returns {Promise<object>}
 */
async function extractVideo(urlOrKey) {
  const viewkey = extractViewKey(urlOrKey);
  if (!viewkey) {
    throw new Error('Invalid Pornhub URL or viewkey. Please provide a valid Pornhub video link (e.g., https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa) or viewkey.');
  }

  const primaryUrl = `https://www.pornhub.com/view_video.php?viewkey=${viewkey}`;
  let pageResponse = await fetchUrl(primaryUrl);

  let html = pageResponse.body;
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
        'Referer': primaryUrl
      });
      const embedMatch = embedResponse.body.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
      if (embedMatch) {
        flashvars = JSON.parse(embedMatch[1]);
      }
    } catch (err) {
      // Continue to evaluate
    }
  }

  if (!flashvars) {
    // Check if video is deleted or unavailable
    if (html.includes('video has been removed') || html.includes('video is unavailable') || html.includes('flagged for review')) {
      throw new Error('This video is unavailable or has been removed from Pornhub.');
    }
    if (html.includes('geo-restricted') || html.includes('not available in your country')) {
      throw new Error('This video is geo-restricted.');
    }
    throw new Error('Failed to parse video stream metadata. The video may be private, premium-only, or require login.');
  }

  // Extract metadata
  const title = unescapeHtml(flashvars.video_title || 'Pornhub Video');
  const durationSeconds = parseInt(flashvars.video_duration, 10) || 0;
  const thumbnail = flashvars.image_url || '';
  const canonicalUrl = flashvars.link_url || primaryUrl;
  const isHD = Boolean(flashvars.isHD);

  // Extract author / uploader from page HTML if available
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

  // Extract action tags & categories
  const tags = [];
  if (flashvars.actionTags) {
    const parsedTags = flashvars.actionTags.split(',').map(t => t.split(':')[0].trim()).filter(Boolean);
    tags.push(...parsedTags);
  }

  // Process and organize media formats / streams
  const mediaDefinitions = flashvars.mediaDefinitions || [];
  const downloads = [];

  for (const media of mediaDefinitions) {
    // Only include streams that have a valid videoUrl
    if (!media.videoUrl || typeof media.videoUrl !== 'string' || media.videoUrl.trim() === '') {
      continue;
    }

    const qualityStr = String(media.quality || '');
    const qualityNum = parseInt(qualityStr, 10) || 0;
    const format = media.format || 'hls';
    const resolution = media.width && media.height ? `${media.width}x${media.height}` : (qualityNum ? `${qualityNum}p` : 'Auto');

    downloads.push({
      quality: qualityNum ? `${qualityNum}p` : (qualityStr || 'Default'),
      qualityValue: qualityNum,
      format: format,
      resolution: resolution,
      width: media.width || null,
      height: media.height || null,
      url: media.videoUrl,
      isDefault: Boolean(media.defaultQuality)
    });
  }

  // Sort downloads by quality descending (1080p -> 720p -> 480p -> 240p)
  downloads.sort((a, b) => b.qualityValue - a.qualityValue);

  return {
    creator: 'thenux',
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

module.exports = {
  extractVideo,
  fetchUrl
};
