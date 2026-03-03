// popup.js – asks the active tab's content script for its detected PDF info

const statusEl = document.getElementById('status');
const downloadBtn = document.getElementById('downloadBtn');

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url?.includes('qglobal.pearsonassessments.com')) {
    statusEl.innerHTML = '<em>Not on a Q-Global page.</em>';
    return;
  }

  if (!tab.url.includes('file-viewer-pdf')) {
    statusEl.innerHTML = '<em>Navigate to a PDF resource in the Q-Global Resource Library to use this extension.</em>';
    return;
  }

  // Ask the content script for its detected PDF info
  chrome.tabs.sendMessage(tab.id, { type: 'GET_PDF_INFO' }, (response) => {
    if (chrome.runtime.lastError || !response?.url) {
      statusEl.innerHTML =
        '<em>PDF not yet detected. Wait a moment for the viewer to load, then re-open this popup.</em>';
      return;
    }

    statusEl.innerHTML = `
      <div class="label">Detected PDF</div>
      <div class="filename">${escapeHtml(response.filename)}</div>
    `;

    downloadBtn.disabled = false;
    downloadBtn.addEventListener('click', () => {
      downloadBtn.disabled = true;
      downloadBtn.textContent = '⏳ Fetching…';
      // Ask the content script (which has session cookies) to do the fetch
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_DOWNLOAD' }, () => {
        downloadBtn.textContent = '✅ Download started!';
      });
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

init();
