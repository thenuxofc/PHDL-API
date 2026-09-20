const https = require('https');
const http = require('http');
const { extractVideo } = require('./src/extractor');

async function testFullStreamProxy() {
  console.log('Extracting fresh video...');
  const result = await extractVideo('66db8ffed80aa');
  const stream = result.data.downloads.find(d => d.qualityValue === 720) || result.data.downloads[0];
  console.log('Got fresh master stream URL:', stream.url);

  // Fetch master m3u8 with headers
  const getStreamContent = (targetUrl) => new Promise((resolve, reject) => {
    https.get(targetUrl, {
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
        'Cookie': 'accessAgeDisclaimerPH=1; platform=pc'
      }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buffer: Buffer.concat(chunks) }));
    }).on('error', reject);
  });

  const masterRes = await getStreamContent(stream.url);
  console.log('Master M3U8 Status:', masterRes.status);
  const masterText = masterRes.buffer.toString('utf-8');
  console.log('Master M3U8 lines:', masterText.split('\n').filter(Boolean));

  // Find sub-playlist
  const subLine = masterText.split('\n').map(l => l.trim()).find(l => l.startsWith('index-'));
  if (subLine) {
    const baseUrl = stream.url.substring(0, stream.url.lastIndexOf('/') + 1);
    const subUrl = baseUrl + subLine;
    console.log('\nFetching sub-playlist:', subUrl);
    const subRes = await getStreamContent(subUrl);
    console.log('Sub-playlist status:', subRes.status);
    const subText = subRes.buffer.toString('utf-8');
    const segLines = subText.split('\n').map(l => l.trim()).filter(l => l.startsWith('seg-'));
    console.log(`Found ${segLines.length} video segments! First 3 segments:`, segLines.slice(0, 3));

    // Test downloading 1st segment
    const segUrl = baseUrl + segLines[0];
    console.log('\nTesting segment download from:', segUrl);
    const segRes = await getStreamContent(segUrl);
    console.log('Segment status:', segRes.status);
    console.log('Segment binary size (bytes):', segRes.buffer.length);
    console.log('Content-Type:', segRes.headers['content-type']);
  }
}

testFullStreamProxy();
