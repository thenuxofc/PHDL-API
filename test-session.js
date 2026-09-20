const https = require('https');

function fetchPageWithCookies(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': 'accessAgeDisclaimerPH=1; platform=pc'
      }
    }, res => {
      let data = '';
      const setCookies = res.headers['set-cookie'] || [];
      const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ') + '; accessAgeDisclaimerPH=1; platform=pc';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ body: data, cookies: cookieStr }));
    }).on('error', reject);
  });
}

function fetchStream(url, cookies) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
        'Cookie': cookies
      }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf-8') }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('1. Fetching PH video page with session cookies...');
  const { body, cookies } = await fetchPageWithCookies('https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa');
  const match = body.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
  const flashvars = JSON.parse(match[1]);
  const stream = flashvars.mediaDefinitions.find(m => m.format === 'hls' && m.quality === '720') || flashvars.mediaDefinitions[0];
  console.log('Stream URL:', stream.videoUrl);
  console.log('Session Cookies:', cookies.slice(0, 80) + '...');

  console.log('\n2. Fetching master playlist using same session cookies...');
  const masterRes = await fetchStream(stream.videoUrl, cookies);
  console.log('Master M3U8 Status:', masterRes.status);
  console.log('Master M3U8 Content:\n', masterRes.body);

  if (masterRes.status === 200 && masterRes.body.includes('index-')) {
    const subLine = masterRes.body.split('\n').map(l => l.trim()).find(l => l.startsWith('index-'));
    const baseUrl = stream.videoUrl.substring(0, stream.videoUrl.lastIndexOf('/') + 1);
    const subUrl = baseUrl + subLine;
    console.log('\n3. Fetching sub-playlist:', subUrl);
    const subRes = await fetchStream(subUrl, cookies);
    console.log('Sub-playlist status:', subRes.status);
    console.log('Sub-playlist preview:\n', subRes.body.slice(0, 300));
  }
}

run();
