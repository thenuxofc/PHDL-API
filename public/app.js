/**
 * PH Downloader Web Application Logic
 * Creator: thenux
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dlForm = document.getElementById('dl-form');
  const urlInput = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const clearBtn = document.getElementById('clear-btn');
  const alertBox = document.getElementById('alert-box');
  const alertMsg = document.getElementById('alert-msg');
  const alertClose = document.getElementById('alert-close');
  const resultCard = document.getElementById('result-card');

  // Result Elements
  const resThumb = document.getElementById('res-thumb');
  const resDuration = document.getElementById('res-duration');
  const resTitle = document.getElementById('res-title');
  const resAuthor = document.getElementById('res-author');
  const resViews = document.getElementById('res-views');
  const resKey = document.getElementById('res-key');
  const resTags = document.getElementById('res-tags');
  const dlTableBody = document.getElementById('dl-table-body');
  const playPreviewBtn = document.getElementById('play-preview-btn');
  const playerContainer = document.getElementById('player-container');
  const closePlayerBtn = document.getElementById('close-player-btn');
  const hlsVideo = document.getElementById('hls-video');

  // Code Tabs & Copy
  const codeTabs = document.querySelectorAll('.code-tab');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  let currentHls = null;
  let activeStreamUrl = null;

  // Input Clear / Paste
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.classList.add('hidden');
    urlInput.focus();
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        clearBtn.classList.remove('hidden');
        handleExtract(urlInput.value.trim());
      }
    } catch (err) {
      urlInput.focus();
    }
  });

  alertClose.addEventListener('click', () => {
    alertBox.classList.add('hidden');
  });

  // Sample chips
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const sampleUrl = chip.getAttribute('data-url');
      urlInput.value = sampleUrl;
      clearBtn.classList.remove('hidden');
      handleExtract(sampleUrl);
    });
  });

  // Form Submit
  dlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = urlInput.value.trim();
    if (val) {
      handleExtract(val);
    }
  });

  // Main Extract Function
  async function handleExtract(url) {
    hideAlert();
    setLoading(true);
    resultCard.classList.add('hidden');
    closeVideoPlayer();

    try {
      const apiUrl = `/api/download?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to extract video links. Please verify the URL.');
      }

      renderResult(data.data);
    } catch (err) {
      showAlert(err.message || 'Network error or unable to fetch video stream.');
    } finally {
      setLoading(false);
    }
  }

  function renderResult(video) {
    resThumb.src = video.thumbnail || '';
    resDuration.textContent = video.duration?.formatted || '00:00';
    resTitle.textContent = video.title || 'Pornhub Video';

    // Author
    if (video.author?.name && video.author.name !== 'Unknown') {
      resAuthor.innerHTML = `<i class="fa-solid fa-user"></i> Author: <span>${escapeHtml(video.author.name)}</span>`;
      resAuthor.classList.remove('hidden');
    } else {
      resAuthor.classList.add('hidden');
    }

    // Views
    if (video.stats?.views) {
      resViews.innerHTML = `<i class="fa-solid fa-eye"></i> Views: <span>${escapeHtml(video.stats.views)}</span>`;
      resViews.classList.remove('hidden');
    } else {
      resViews.classList.add('hidden');
    }

    // Viewkey
    resKey.innerHTML = `<i class="fa-solid fa-key"></i> Key: <span>${escapeHtml(video.viewkey)}</span>`;

    // Tags
    resTags.innerHTML = '';
    if (video.tags && video.tags.length > 0) {
      video.tags.slice(0, 8).forEach(t => {
        const span = document.createElement('span');
        span.className = 'video-tag-pill';
        span.textContent = t;
        resTags.appendChild(span);
      });
    }

    // Download Table
    dlTableBody.innerHTML = '';
    const downloads = video.downloads || [];

    if (downloads.length > 0) {
      activeStreamUrl = downloads[0].url; // Best quality stream for preview

      downloads.forEach(d => {
        const tr = document.createElement('tr');

        // Quality badge class
        let qClass = 'q-def';
        if (d.qualityValue >= 1080) qClass = 'q-1080';
        else if (d.qualityValue >= 720) qClass = 'q-720';
        else if (d.qualityValue >= 480) qClass = 'q-480';
        else if (d.qualityValue >= 240) qClass = 'q-240';

        const isMp4 = d.format === 'mp4' || d.isDirectMp4;
        const dlUrl = d.downloadUrl || d.directUrl || d.url;

        tr.innerHTML = `
          <td>
            <span class="quality-badge ${qClass}">
              <i class="fa-solid fa-video"></i> ${escapeHtml(d.quality)}
            </span>
          </td>
          <td>${escapeHtml(d.resolution || '-')}</td>
          <td><span class="format-pill" style="${isMp4 ? 'color: var(--accent-green); background: rgba(16, 185, 129, 0.1); font-weight: 700;' : ''}">${escapeHtml((d.format || 'MP4').toUpperCase())}</span></td>
          <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <a href="${escapeHtml(d.directUrl || dlUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: none;">
              ${escapeHtml((d.directUrl || dlUrl).slice(0, 32))}...
            </a>
          </td>
          <td>
            <div class="action-buttons-cell">
              <a href="${escapeHtml(dlUrl)}" target="_blank" download="${escapeHtml(video.title)}_${d.quality}.mp4" class="btn-action btn-dl" style="font-weight: 700; letter-spacing: 0.02em;">
                <i class="fa-solid fa-cloud-arrow-down"></i> Download MP4
              </a>
              <button type="button" class="btn-action btn-copy" data-copy="${escapeHtml(d.directUrl || dlUrl)}" title="Copy direct video link">
                <i class="fa-regular fa-copy"></i> Copy Link
              </button>
            </div>
          </td>
        `;
        dlTableBody.appendChild(tr);
      });
    } else {
      dlTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 24px;">
            No direct stream definitions found for this video.
          </td>
        </tr>
      `;
    }

    // Attach copy buttons
    dlTableBody.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const copyText = btn.getAttribute('data-copy');
        copyToClipboard(copyText, 'Direct MP4 link copied to clipboard!');
      });
    });

    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Play Preview button on thumbnail
  playPreviewBtn.addEventListener('click', () => {
    if (activeStreamUrl) {
      playStream(activeStreamUrl);
    }
  });

  closePlayerBtn.addEventListener('click', closeVideoPlayer);

  function playStream(streamUrl) {
    if (!streamUrl) return;
    playerContainer.classList.remove('hidden');

    if (Hls.isSupported()) {
      if (currentHls) {
        currentHls.destroy();
      }
      currentHls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      currentHls.loadSource(streamUrl);
      currentHls.attachMedia(hlsVideo);
      currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
        hlsVideo.play().catch(() => {});
      });
    } else if (hlsVideo.canPlayType('application/vnd.apple.mpegurl')) {
      // Native iOS Safari HLS support
      hlsVideo.src = streamUrl;
      hlsVideo.addEventListener('loadedmetadata', () => {
        hlsVideo.play().catch(() => {});
      });
    } else {
      showToast('HLS playback is not supported on this browser.');
    }

    playerContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function closeVideoPlayer() {
    if (currentHls) {
      currentHls.destroy();
      currentHls = null;
    }
    hlsVideo.pause();
    hlsVideo.removeAttribute('src');
    hlsVideo.load();
    playerContainer.classList.add('hidden');
  }

  // Code Tabs
  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      codeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');
      document.querySelectorAll('.code-block').forEach(b => b.classList.add('hidden'));
      const activeBlock = document.getElementById(`code-${target}`);
      if (activeBlock) {
        activeBlock.classList.remove('hidden');
      }
    });
  });

  // Copy Code Snippet
  copyCodeBtn.addEventListener('click', () => {
    const visibleCode = document.querySelector('.code-block:not(.hidden) code');
    if (visibleCode) {
      copyToClipboard(visibleCode.innerText, 'Code snippet copied!');
    }
  });

  // Helper Utilities
  function setLoading(loading) {
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');

    if (loading) {
      btnText.classList.add('hidden');
      spinner.classList.remove('hidden');
      submitBtn.disabled = true;
    } else {
      btnText.classList.remove('hidden');
      spinner.classList.add('hidden');
      submitBtn.disabled = false;
    }
  }

  function showAlert(msg) {
    alertMsg.textContent = msg;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    alertBox.classList.add('hidden');
  }

  function showToast(msg) {
    toastText.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  function copyToClipboard(text, successMsg = 'Copied!') {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMsg);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
