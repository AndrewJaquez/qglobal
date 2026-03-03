(function () {
  'use strict';

  if (document.getElementById('qglobal-pdf-dl-btn')) return; // prevent double-inject

  let pdfUrl = null;
  let pdfFilename = 'document.pdf';
  let downloadBtn = null;

  // ── Base64 decode (handles standard and URL-safe variants) ──────────────────
  function decodeB64(str) {
    try {
      const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      return decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (_) {
      return null;
    }
  }

  // ── Extract the PDF API URL and filename from the pdfviewer iframe src ──────
  // iframe src: .../index.html?id=<base64 of API URL>
  // API URL ends with: /fetch-file-content/<base64 of "object-path=/PATH/FILE.pdf">
  function extractPdfInfo(iframeSrc) {
    try {
      const iframeUrl = new URL(iframeSrc);
      const encodedId = iframeUrl.searchParams.get('id');
      if (!encodedId) return null;

      const apiUrl = decodeB64(encodedId);
      if (!apiUrl || !apiUrl.startsWith('http')) return null;

      // Derive filename from the last base64 segment of the API URL
      let filename = 'document.pdf';
      try {
        const lastSegment = apiUrl.split('/').pop();
        const decoded = decodeB64(lastSegment);
        if (decoded) {
          // "object-path=/GFTA-3/GFTA-3 Q-global Stimulus Book.pdf"
          const match = decoded.match(/([^/]+\.pdf)$/i);
          if (match) filename = match[1];
        }
      } catch (_) {}

      return { url: apiUrl, filename };
    } catch (_) {
      return null;
    }
  }

  // ── Inject a floating download button ──────────────────────────────────────
  function createButton() {
    const btn = document.createElement('button');
    btn.id = 'qglobal-pdf-dl-btn';
    btn.textContent = '⬇ Download PDF';
    Object.assign(btn.style, {
      position: 'fixed',
      top: '64px',
      right: '20px',
      zIndex: '2147483647',
      background: '#003057',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 18px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      letterSpacing: '0.02em',
      transition: 'background 0.15s',
    });

    btn.addEventListener('mouseenter', () => { btn.style.background = '#004d8c'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#003057'; });
    btn.addEventListener('click', handleDownload);

    document.body.appendChild(btn);
    return btn;
  }

  function setButtonState(text, disabled) {
    if (!downloadBtn) return;
    downloadBtn.textContent = text;
    downloadBtn.disabled = disabled;
    downloadBtn.style.opacity = disabled ? '0.7' : '1';
  }

  function resetButton() {
    setButtonState('⬇ Download PDF', false);
  }

  // ── Extract PDF bytes from the already-loaded PDF.js instance ─────────────
  // fetch() from content script returns 401 (server rejects non-page requests).
  // Solution: background.js runs chrome.scripting.executeScript in world:'MAIN',
  // which can access PDFViewerApplication inside the iframes and pull the bytes
  // that PDF.js already downloaded — no network request, no auth issues.
  function handleDownload() {
    if (!downloadBtn) return;
    setButtonState('⏳ Reading PDF…', true);

    chrome.runtime.sendMessage(
      { type: 'DOWNLOAD_FROM_PDFJS', filename: pdfFilename },
      (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          const err = chrome.runtime.lastError?.message || response?.error || 'Unknown error';
          console.error('[Q-Global DL]', err);
          setButtonState(`❌ ${err}`, false);
          setTimeout(resetButton, 6000);
        } else {
          setButtonState('✅ Saved!', false);
          setTimeout(resetButton, 4000);
        }
      }
    );
  }

  // ── Scan all iframes for the pdfviewer iframe ───────────────────────────────
  function scanIframes() {
    // Check regular DOM iframes
    for (const iframe of document.querySelectorAll('iframe')) {
      const src = iframe.src || iframe.getAttribute('src') || '';
      if (src.includes('platform-pdfviewer') && src.includes('?id=')) {
        const info = extractPdfInfo(src);
        if (info && info.url !== pdfUrl) {
          pdfUrl = info.url;
          pdfFilename = info.filename;
          if (!downloadBtn) downloadBtn = createButton();
          console.log('[Q-Global DL] PDF URL detected:', pdfUrl);
          console.log('[Q-Global DL] Filename:', pdfFilename);
          return true;
        }
      }
    }

    // Also check inside shadow roots of Angular components
    for (const el of document.querySelectorAll('*')) {
      if (!el.shadowRoot) continue;
      for (const iframe of el.shadowRoot.querySelectorAll('iframe')) {
        const src = iframe.src || iframe.getAttribute('src') || '';
        if (src.includes('platform-pdfviewer') && src.includes('?id=')) {
          const info = extractPdfInfo(src);
          if (info && info.url !== pdfUrl) {
            pdfUrl = info.url;
            pdfFilename = info.filename;
            if (!downloadBtn) downloadBtn = createButton();
            console.log('[Q-Global DL] PDF URL detected (shadow):', pdfUrl);
            return true;
          }
        }
      }
    }

    return false;
  }

  // ── Respond to popup messages ──────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_PDF_INFO') {
      sendResponse(pdfUrl ? { url: pdfUrl, filename: pdfFilename } : null);
    } else if (message.type === 'TRIGGER_DOWNLOAD') {
      handleDownload();
      sendResponse({ ok: true });
    }
  });

  // ── Boot ───────────────────────────────────────────────────────────────────
  if (!scanIframes()) {
    const observer = new MutationObserver(() => {
      if (scanIframes()) observer.disconnect();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
    // Safety timeout – stop watching after 2 minutes
    setTimeout(() => observer.disconnect(), 120_000);
  }
})();
