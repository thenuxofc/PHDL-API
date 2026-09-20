const { extractVideo } = require('./src/extractor');

async function run() {
  try {
    const res = await extractVideo('66db8ffed80aa', 'https://thenuxphdl.netlify.app');
    console.log('Result Status:', res.status);
    console.log('Creator:', res.creator);
    console.log('Title:', res.data.title);
    console.log('Duration:', res.data.duration.formatted);
    console.log('Thumbnail:', res.data.thumbnail);
    console.log('\nDirect MP4 & Stream Downloads:');
    res.data.downloads.forEach(d => {
      console.log(`- [${d.quality}] ${d.resolution} (${d.format.toUpperCase()}) -> Direct DL: ${d.downloadUrl}`);
    });
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

run();
