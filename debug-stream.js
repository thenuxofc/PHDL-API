const https = require('https');

async function debugPornhubStream() {
  const pageUrl = 'https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa';
  const pageRes = await new Promise((resolve) => {
    https.get(pageUrl, {
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': 'accessAgeDisclaimerPH=1; platform=pc'
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ headers: res.headers, body: data }));
    });
  });

  const flashvarsMatch = pageRes.body.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
  const flashvars = JSON.parse(flashvarsMatch[1]);
  console.log('Video title:', flashvars.video_title);

  // Check all media definitions
  for (const m of flashvars.mediaDefinitions) {
    if (!m.videoUrl) continue;
    console.log('\n--- Format:', m.format, m.quality, 'URL:', m.videoUrl);

    // Try various headers
    const testHeaders = [
      { name: 'Referer PH', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Referer': 'https://www.pornhub.com/' } },
      { name: 'No referer', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } },
      { name: 'With Cookies', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.pornhub.com/', 'Cookie': 'accessAgeDisclaimerPH=1; platform=pc' } }
    ];

    for (const th of testHeaders) {
      const resp = await new Promise((res) => {
        https.get(m.videoUrl, { family: 4, headers: th.headers }, r => {
          let b = '';
          r.on('data', chunk => b += chunk);
          r.on('end', () => res({ status: r.statusCode, body: b.slice(0, 150), headers: r.headers }));
        }).on('error', e => res({ error: e.message }));
      });
      console.log(`[${th.name}] Status:`, resp.status, 'Response:', resp.body ? resp.body.trim().replace(/\n/g, ' ') : resp.error);
    }
  }
}

debugPornhubStream();
