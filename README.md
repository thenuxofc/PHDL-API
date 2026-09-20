# ⚡ PH Video Downloader API & Stream Extractor

<p align="center">
  <img src="https://img.shields.io/badge/Creator-Thenux-10b981?style=for-the-badge&logo=codeforces&logoColor=white" alt="Creator: Thenux">
  <img src="https://img.shields.io/badge/Deploy-Netlify%20Ready-00c7b7?style=for-the-badge&logo=netlify&logoColor=white" alt="Netlify Deploy">
  <img src="https://img.shields.io/badge/GitHub-thenuxofc%2FPHDL--API-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License">
</p>

---

> **Engineered with ❤️ by Thenux**  
> High-performance, zero-dependency Pornhub video downloader & metadata extraction REST API + modern web application. Optimized for **Netlify Serverless**, standalone Node.js servers, Telegram bots, Discord bots, and automation pipelines.

---

## 🌐 Official Thenux Ecosystem

| Platform | Link | Description |
|---|---|---|
| 🛍️ **Official Store** | [www.thenuxofc.store](https://www.thenuxofc.store) | Official scripts, software, premium bots & services |
| 🤖 **Thenux AI** | [ai.thenuxofc.store](https://ai.thenuxofc.store) | Next-generation AI models, tools & intelligence |
| ⚡ **Thenux API Hub** | [api.thenuxofc.store](https://api.thenuxofc.store) | Production-ready APIs for developers & creators |
| 🐙 **Official Repository** | [github.com/thenuxofc/PHDL-API](https://github.com/thenuxofc/PHDL-API) | Source code, updates, issues & contributions |

---

## 🌟 Features

- ⚡ **Lightning-Fast Extraction**: Extracts 1080p (Full HD), 720p (HD), 480p (SD), 240p video streams in milliseconds.
- 🎬 **Complete Video Metadata**: Video title, high-res cover thumbnail, formatted duration (`04:42`), uploader/author profile link, view counts, ratings, and tags.
- 📺 **In-Browser Video Preview**: Built-in responsive HTML5 + HLS.js streaming video player.
- 🚀 **Serverless & Edge Ready**: Native Netlify Functions handler (`netlify/functions/api.js`) with zero external dependency bloat.
- 🖥️ **Standalone Node.js Server**: Built-in HTTP server (`src/server.js`) for local development or VPS/Docker hosting.
- 🔓 **Universal CORS Enabled**: Consume the API from any frontend (React, Vue, Next.js), cURL, Python, PHP, or bot framework.
- 🏷️ **Creator Brand**: `Thenux` branding in JSON responses, headers, and UI.

---

## 📡 API Endpoints

### 1. Extract Video Download Streams & Metadata
```http
GET /api/download?url={PORNHUB_URL_OR_VIEWKEY}
GET /api/info?url={PORNHUB_URL_OR_VIEWKEY}
```

#### Example Request:
```bash
curl -X GET "https://api.thenuxofc.store/api/download?url=https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa"
```
*(Or query with raw viewkey: `/api/download?url=66db8ffed80aa`)*

#### Example Response (`200 OK`):
```json
{
  "creator": "Thenux",
  "status": "success",
  "timestamp": "2026-09-20T21:07:08.000Z",
  "data": {
    "viewkey": "66db8ffed80aa",
    "title": "Every morning they leave us alone and this happens… naughty stepsister",
    "duration": {
      "seconds": 282,
      "formatted": "04:42"
    },
    "thumbnail": "https://ei.phncdn.com/videos/202409/06/457459171/original/(m=qH504TZbeaAaGwObaaaa)(mh=uRGR7b_HXx0w-jD1)0.jpg",
    "url": "https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa",
    "isHD": true,
    "author": {
      "name": "Neilc9913",
      "url": "https://www.pornhub.com/users/neilc9913"
    },
    "stats": {
      "views": "1.2M",
      "rating": "94%"
    },
    "tags": [
      "Handjob",
      "Titty Fucking"
    ],
    "downloads_count": 4,
    "downloads": [
      {
        "quality": "1080p",
        "qualityValue": 1080,
        "format": "hls",
        "resolution": "1080x1920",
        "url": "https://ev-h.phncdn.com/hls/videos/202409/06/457459171/1080P_4000K_457459171.mp4/master.m3u8?...",
        "isDefault": false
      },
      {
        "quality": "720p",
        "qualityValue": 720,
        "format": "hls",
        "resolution": "720x1280",
        "url": "https://ev-h.phncdn.com/hls/videos/202409/06/457459171/720P_4000K_457459171.mp4/master.m3u8?...",
        "isDefault": true
      },
      {
        "quality": "480p",
        "qualityValue": 480,
        "format": "hls",
        "resolution": "480x854",
        "url": "https://ev-h.phncdn.com/hls/videos/202409/06/457459171/480P_2000K_457459171.mp4/master.m3u8?...",
        "isDefault": false
      },
      {
        "quality": "240p",
        "qualityValue": 240,
        "format": "hls",
        "resolution": "240x426",
        "url": "https://ev-h.phncdn.com/hls/videos/202409/06/457459171/240P_1000K_457459171.mp4/master.m3u8?...",
        "isDefault": false
      }
    ]
  }
}
```

---

### 2. POST Conversion Endpoint
```http
POST /api/convert
Content-Type: application/json

{
  "url": "https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa"
}
```

---

### 3. API Health & Status
```http
GET /api/health
```

---

## 💻 Code Integration Examples

### JavaScript / Node.js
```javascript
const targetUrl = 'https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa';
const response = await fetch(`https://your-domain.netlify.app/api/download?url=${encodeURIComponent(targetUrl)}`);
const data = await response.json();

console.log('Creator:', data.creator); // Thenux
console.log('Title:', data.data.title);
console.log('Streams:', data.data.downloads);
```

### Python 3
```python
import requests

url = "https://your-domain.netlify.app/api/download"
params = {"url": "https://www.pornhub.com/view_video.php?viewkey=66db8ffed80aa"}

res = requests.get(url, params=params)
data = res.json()

print(f"Title: {data['data']['title']}")
print(f"Creator: {data['creator']}") # Thenux
for stream in data['data']['downloads']:
    print(f"[{stream['quality']}] {stream['resolution']} -> {stream['url']}")
```

### PHP
```php
<?php
$url = "https://your-domain.netlify.app/api/download?url=" . urlencode("66db8ffed80aa");
$response = file_get_contents($url);
$data = json_decode($response, true);

echo "Title: " . $data['data']['title'] . "\n";
echo "Creator: " . $data['creator'] . "\n"; // Thenux
?>
```

---

## 🚀 GitHub & Netlify Deployment

### Step 1: Push to GitHub Repository
```bash
git init
git add .
git commit -m "feat: Pornhub Video Downloader API by Thenux"
git branch -M main
git remote add origin https://github.com/thenuxofc/PHDL-API.git
git push -u origin main
```

### Step 2: Deploy to Netlify
1. Go to [app.netlify.com](https://app.netlify.com/).
2. Click **"Add new site"** &rarr; **"Import an existing project"**.
3. Connect your GitHub account and choose **`thenuxofc/PHDL-API`**.
4. Netlify automatically reads [`netlify.toml`](file:///d:/phdl-api/netlify.toml):
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
5. Click **"Deploy site"**. Your API and Web App will be live with free automatic SSL/HTTPS!

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/thenuxofc/PHDL-API.git
cd PHDL-API

# Start local server
npm start
```
Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.

---

## 👨‍💻 Author & Credits

- **Creator**: **Thenux**
- **Official Store**: [www.thenuxofc.store](https://www.thenuxofc.store)
- **AI Hub**: [ai.thenuxofc.store](https://ai.thenuxofc.store)
- **API Services**: [api.thenuxofc.store](https://api.thenuxofc.store)
- **GitHub**: [@thenuxofc](https://github.com/thenuxofc)
- **License**: MIT
