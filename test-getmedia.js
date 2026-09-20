const https = require('https');

async function testGetMedia() {
  const url = 'https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa';
  https.get(url, {
    family: 4,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cookie': 'accessAgeDisclaimerPH=1; platform=pc; bs=foo'
    }
  }, res => {
    let data = '';
    const setCookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    res.on('data', c => data += c);
    res.on('end', () => {
      const match = data.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
      const flashvars = JSON.parse(match[1]);
      console.log('Flashvars keys:', Object.keys(flashvars));
      console.log('MediaDefinitions:');
      flashvars.mediaDefinitions.forEach(m => console.log('Format:', m.format, 'Quality:', m.quality, 'remote:', m.remote, 'URL:', m.videoUrl));

      const mp4Def = flashvars.mediaDefinitions.find(m => m.format === 'mp4' && m.remote);
      if (mp4Def) {
        console.log('\nFetching remote get_media with referer & cookies:', mp4Def.videoUrl);
        https.get(mp4Def.videoUrl, {
          family: 4,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': url,
            'Cookie': setCookies + '; accessAgeDisclaimerPH=1; platform=pc'
          }
        }, res2 => {
          let d2 = '';
          res2.on('data', c => d2 += c);
          res2.on('end', () => {
            console.log('get_media response:', d2);
          });
        });
      }
    });
  });
}

testGetMedia();
