const https = require('https');

async function testCorsOnGetMedia() {
  const pageUrl = 'https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa';
  https.get(pageUrl, {
    family: 4,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': 'accessAgeDisclaimerPH=1; platform=pc'
    }
  }, res => {
    let data = '';
    const setCookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    res.on('data', c => data += c);
    res.on('end', () => {
      const match = data.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
      const flashvars = JSON.parse(match[1]);
      const mp4Def = flashvars.mediaDefinitions.find(m => m.format === 'mp4' && m.remote);
      console.log('get_media URL:', mp4Def.videoUrl);

      // Make request with Origin: https://thenuxphdl.netlify.app
      https.get(mp4Def.videoUrl, {
        family: 4,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://thenuxphdl.netlify.app',
          'Referer': pageUrl,
          'Cookie': setCookies + '; accessAgeDisclaimerPH=1; platform=pc'
        }
      }, res2 => {
        console.log('get_media Status:', res2.statusCode);
        console.log('Access-Control-Allow-Origin:', res2.headers['access-control-allow-origin']);
        console.log('Access-Control-Allow-Credentials:', res2.headers['access-control-allow-credentials']);
      });
    });
  });
}

testCorsOnGetMedia();
