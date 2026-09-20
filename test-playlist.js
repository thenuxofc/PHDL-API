const https = require('https');

async function testPlaylist() {
  const masterUrl = 'https://hv-h.phncdn.com/hls/videos/202409/06/457459171/720P_4000K_457459171.mp4/master.m3u8?h=8Rlz77lps%2BgJM80xU2ga1YDxVoQ%3D&e=1789924912&f=1';
  
  // We can fetch master m3u8
  const masterContent = await new Promise((resolve, reject) => {
    https.get(masterUrl, {
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
        'Cookie': 'accessAgeDisclaimerPH=1; platform=pc'
      }
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  console.log('Master M3U8 content:\n', masterContent);
  
  // Find sub-playlist URL (e.g., index-v1-a1.m3u8?h=...)
  const lines = masterContent.split('\n');
  const subLine = lines.find(l => l.trim().startsWith('index-'));
  if (subLine) {
    const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
    const subUrl = baseUrl + subLine.trim();
    console.log('Sub-playlist URL:', subUrl);

    https.get(subUrl, {
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
        'Cookie': 'accessAgeDisclaimerPH=1; platform=pc'
      }
    }, res2 => {
      let d2 = '';
      res2.on('data', chunk => d2 += chunk);
      res2.on('end', () => {
        console.log('Sub-playlist status:', res2.statusCode);
        console.log('Sub-playlist preview:\n', d2.slice(0, 400));
      });
    });
  }
}

testPlaylist();
