const { extractVideo } = require('./src/extractor');

async function run() {
  try {
    const res = await extractVideo('https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa');
    console.log('Result Status:', res.status);
    console.log('Creator:', res.creator);
    console.log('Title:', res.data.title);
    console.log('Duration:', res.data.duration.formatted);
    console.log('Thumbnail:', res.data.thumbnail);
    console.log('Author:', JSON.stringify(res.data.author));
    console.log('Stats:', JSON.stringify(res.data.stats));
    console.log('Tags:', res.data.tags.slice(0, 5));
    console.log('Available streams:');
    res.data.downloads.forEach(d => {
      console.log(` - [${d.quality}] ${d.resolution} | Format: ${d.format} | URL: ${d.url.slice(0, 60)}...`);
    });
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

run();
