const https = require('https');

async function testConverter() {
  const targetUrl = 'https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa';

  // Test savefrom / other public video download APIs for Pornhub
  console.log('Testing third-party / converter direct download extraction...');
  
  // Option 1: cobalt.tools API
  const cobaltReq = https.request('https://api.cobalt.tools/api/json', {
    method: 'POST',
    family: 4,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Cobalt API Status:', res.statusCode);
      console.log('Cobalt response:', d.slice(0, 300));
    });
  });
  cobaltReq.on('error', e => console.log('Cobalt error:', e.message));
  cobaltReq.write(JSON.stringify({ url: targetUrl }));
  cobaltReq.end();
}

testConverter();
