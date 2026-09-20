const server = require('./src/server');
const http = require('http');
const fs = require('fs');

server.listen(3005, async () => {
  console.log('Server started on 3005. Extracting video info...');
  
  http.get('http://localhost:3005/api/download?url=66db8ffed80aa', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const json = JSON.parse(data);
      const mp4_240 = json.data.downloads.find(d => d.quality === '240p' && d.isDirectMp4) || json.data.downloads[0];
      console.log('Selected stream:', mp4_240.quality, mp4_240.format);
      
      const dlUrl = `http://localhost:3005/api/dl?url=${encodeURIComponent(mp4_240.directUrl)}&title=test_download.mp4`;
      console.log('Testing /api/dl streaming...');

      http.get(dlUrl, (res2) => {
        console.log('/api/dl HTTP Status:', res2.statusCode);
        console.log('Content-Type:', res2.headers['content-type']);
        console.log('Content-Disposition:', res2.headers['content-disposition']);
        console.log('Content-Length:', res2.headers['content-length']);

        let received = 0;
        const fileStream = fs.createWriteStream('test_download.mp4');
        res2.pipe(fileStream);

        res2.on('data', chunk => {
          received += chunk.length;
          if (received > 3000000) {
            console.log(`Successfully received ${received} bytes through /api/dl!`);
            res2.destroy();
            fileStream.close();
            server.close(() => {
              if (fs.existsSync('test_download.mp4')) fs.unlinkSync('test_download.mp4');
              console.log('Test completed with 100% success on Node.js server!');
            });
          }
        });
      });
    });
  });
});
