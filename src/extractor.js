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
 * Extracts direct MP4 and HLS video downloads from Pornhub
 * @param {string} urlOrKey 
 * @param {string} baseUrl - Host base URL
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

  const mediaDefinitions = flashvars.mediaDefinitions || [];
  const downloads = [];

  // Check if there is a remote MP4 endpoint (get_media) to fetch TRUE direct MP4 URLs
  const mp4Endpoint = mediaDefinitions.find(m => m.format === 'mp4' && m.remote && m.videoUrl);
  if (mp4Endpoint && mp4Endpoint.videoUrl) {
    try {
      const getMediaRes = await fetchUrl(mp4Endpoint.videoUrl, {
        'Referer': primaryUrl,
        'Cookie': sessionCookies
      });
      const mp4List = JSON.parse(getMediaRes.body);
      if (Array.isArray(mp4List) && mp4List.length > 0) {
        for (const item of mp4List) {
          if (!item.videoUrl) continue;
          const qualityNum = parseInt(item.quality, 10) || 0;
          const directDlUrl = `${baseUrl}/api/dl?url=${encodeURIComponent(item.videoUrl)}&title=${encodeURIComponent(title)}_${qualityNum}p.mp4`;

          downloads.push({
            quality: `${qualityNum}p`,
            qualityValue: qualityNum,
            format: 'mp4',
            resolution: item.width && item.height ? `${item.width}x${item.height}` : `${qualityNum}p`,
            width: item.width || null,
            height: item.height || null,
            downloadUrl: directDlUrl, // Direct 1-click MP4 file download
            directUrl: item.videoUrl,  // Direct CDN MP4 URL
            isDefault: Boolean(item.defaultQuality),
            isDirectMp4: true
          });
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // Also include HLS streams
  for (const media of mediaDefinitions) {
    if (media.format === 'hls' && media.videoUrl) {
      const qualityStr = String(media.quality || '');
      const qualityNum = parseInt(qualityStr, 10) || 0;
      
      // If we already have direct MP4 for this quality, skip duplicate HLS or mark as HLS
      const existingMp4 = downloads.find(d => d.qualityValue === qualityNum && d.format === 'mp4');
      if (!existingMp4) {
        const streamProxyUrl = `${baseUrl}/api/stream?url=${encodeURIComponent(media.videoUrl)}&cookies=${encodeURIComponent(sessionCookies)}`;
        downloads.push({
          quality: qualityNum ? `${qualityNum}p` : (qualityStr || 'Default'),
          qualityValue: qualityNum,
          format: 'hls',
          resolution: media.width && media.height ? `${media.width}x${media.height}` : (qualityNum ? `${qualityNum}p` : 'Auto'),
          width: media.width || null,
          height: media.height || null,
          downloadUrl: streamProxyUrl,
          directUrl: media.videoUrl,
          isDefault: Boolean(media.defaultQuality),
          isDirectMp4: false
        });
      }
    }
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

module.exports = {
  extractVideo,
  fetchUrl
};
