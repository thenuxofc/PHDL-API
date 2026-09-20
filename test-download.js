const https = require('https');
const fs = require('fs');

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': 'accessAgeDisclaimerPH=1; platform=pc',
        ...headers
      }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buffer: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

async function testDirectDownload() {
  console.log('1. Fetching video page...');
  const pageRes = await fetchUrl('https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa');
  const setCookies = pageRes.headers['set-cookie'] || [];
  const cookies = setCookies.map(c => c.split(';')[0]).join('; ') + '; accessAgeDisclaimerPH=1; platform=pc';

  const match = pageRes.buffer.toString('utf-8').match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
  const flashvars = JSON.parse(match[1]);
  const stream = flashvars.mediaDefinitions.find(m => m.format === 'hls' && m.quality === '240') || flashvars.mediaDefinitions[0];
  console.log('Using 240p stream for quick test:', stream.videoUrl);

  console.log('2. Fetching master playlist...');
  const masterRes = await fetchUrl(stream.videoUrl, { 'Referer': 'https://www.pornhub.com/', 'Cookie': cookies });
  const masterText = masterRes.buffer.toString('utf-8');
  console.log('Master status:', masterRes.status);
  console.log('Master text:\n', masterText);

  const subLine = masterText.split('\n').map(l => l.trim()).find(l => l.startsWith('index-'));
  if (subLine) {
    const baseUrl = stream.videoUrl.substring(0, stream.videoUrl.lastIndexOf('/') + 1);
    const subUrl = baseUrl + subLine;
    console.log('3. Fetching sub-playlist:', subUrl);
    const subRes = await fetchUrl(subUrl, { 'Referer': 'https://www.pornhub.com/', 'Cookie': cookies });
    const subText = subRes.buffer.toString('utf-8');
    const segs = subText.split('\n').map(l => l.trim()).filter(l => l.startsWith('seg-'));
    console.log(`Found ${segs.length} segments!`);

    console.log('4. Fetching first 3 segments and concatenating...');
    const combinedChunks = [];
    for (let i = 0; i < Math.min(3, segs.length); i++) {
      const segUrl = baseUrl + segs[i];
      const sRes = await fetchUrl(segUrl, { 'Referer': 'https://www.pornhub.com/', 'Cookie': cookies });
      console.log(` Segment ${i + 1} size: ${sRes.buffer.length} bytes, status: ${sRes.status}`);
      combinedChunks.push(sRes.buffer);
    }

    const totalBuffer = Buffer.concat(combinedChunks);
    fs.writeFileSync('sample_download.mp4', totalBuffer);
    console.log(`\nSuccessfully created sample_download.mp4 (${totalBuffer.length} bytes)!`);
  }
}

testDirectDownload();
