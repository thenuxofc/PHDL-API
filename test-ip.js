const https = require('https');

async function testForwardedIp() {
  const testClientIp = '175.157.118.168'; // User's IP
  const pageUrl = 'https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa';

  https.get(pageUrl, {
    family: 4,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cookie': 'accessAgeDisclaimerPH=1; platform=pc; bs=foo',
      'X-Forwarded-For': testClientIp,
      'Client-IP': testClientIp,
      'X-Real-IP': testClientIp,
      'CF-Connecting-IP': testClientIp
    }
  }, res => {
    let data = '';
    const setCookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    res.on('data', c => data += c);
    res.on('end', () => {
      const match = data.match(/flashvars_\d+\s*=\s*({[\s\S]*?});/);
      const flashvars = JSON.parse(match[1]);
      const mp4Def = flashvars.mediaDefinitions.find(m => m.format === 'mp4' && m.remote);
      
      https.get(mp4Def.videoUrl, {
        family: 4,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': pageUrl,
          'Cookie': setCookies + '; accessAgeDisclaimerPH=1; platform=pc',
          'X-Forwarded-For': testClientIp,
          'Client-IP': testClientIp,
          'X-Real-IP': testClientIp,
          'CF-Connecting-IP': testClientIp
        }
      }, res2 => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
          console.log('get_media response with Forwarded-IP:\n', d2);
        });
      });
    });
  });
}

testForwardedIp();
