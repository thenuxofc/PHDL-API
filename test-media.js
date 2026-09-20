const https = require('https');

https.get('https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa', {
  family: 4,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Cookie': 'accessAgeDisclaimerPH=1; platform=pc; bs=foo'
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
    if (!match) return console.log('No flashvars');
    const parsed = JSON.parse(match[1]);
    console.log('MediaDefinitions:');
    parsed.mediaDefinitions.forEach(m => {
      console.log('Format:', m.format, 'Quality:', m.quality, 'remote:', m.remote, 'URL:', m.videoUrl);
    });
  });
});
