const https = require('https');

async function testDirectMp4Download() {
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
      const mp4Def = flashvars.mediaDefinitions.find(m => m.format === 'mp4' && m.remote);
      
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
          const list = JSON.parse(d2);
          console.log(`Found ${list.length} direct MP4 video streams!`);
          list.forEach(item => {
            console.log(`- [${item.quality}p] ${item.width}x${item.height} -> ${item.videoUrl.slice(0, 80)}...`);
          });

          const mp4_720 = list.find(l => l.quality === '720') || list[0];
          console.log('\nTesting direct streaming from 720p MP4 URL:');

          https.get(mp4_720.videoUrl, {
            family: 4,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://www.pornhub.com/'
            }
          }, res3 => {
            console.log('HTTP Status:', res3.statusCode);
            console.log('Content-Type:', res3.headers['content-type']);
            console.log('Content-Length (bytes):', res3.headers['content-length']);
            let downloaded = 0;
            res3.on('data', chunk => {
              downloaded += chunk.length;
              if (downloaded > 2000000) {
                console.log(`SUCCESS! Streamed ${downloaded} bytes of real MP4 file data!`);
                res3.destroy();
              }
            });
          });
        });
      });
    });
  });
}

testDirectMp4Download();
