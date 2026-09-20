/**
 * Utility functions for PH Video Downloader API
 * Creator: thenux
 */

/**
 * Extracts the Pornhub viewkey from various URL formats or raw keys
 * @param {string} input - URL or viewkey
 * @returns {string|null} - Extracted viewkey
 */
function extractViewKey(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Pattern 1: viewkey=xxxxx in query string
  const queryMatch = trimmed.match(/[?&]viewkey=([a-zA-Z0-9_-]+)/i);
  if (queryMatch) return queryMatch[1];

  // Pattern 2: /embed/xxxxx
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]+)/i);
  if (embedMatch) return embedMatch[1];

  // Pattern 3: /view_video.php\?viewkey=xxxxx
  const viewMatch = trimmed.match(/view_video\.php\?viewkey=([a-zA-Z0-9_-]+)/i);
  if (viewMatch) return viewMatch[1];

  // Pattern 4: Raw alphanumeric viewkey (typically 13-20 chars like 66db8ffed80aa or ph5a8c...)
  if (/^[a-zA-Z0-9_-]{5,32}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Formats duration from seconds into human-readable HH:MM:SS or MM:SS
 * @param {number|string} seconds 
 * @returns {string}
 */
function formatDuration(seconds) {
  const total = parseInt(seconds, 10);
  if (isNaN(total) || total < 0) return '00:00';

  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Unescapes common HTML entities
 * @param {string} str 
 * @returns {string}
 */
function unescapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

module.exports = {
  extractViewKey,
  formatDuration,
  unescapeHtml
};
