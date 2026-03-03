// background.js – Q-Global PDF Downloader
// Uses chrome.scripting.executeScript (world: MAIN) to reach PDFViewerApplication
// inside the nested iframes and extract the already-downloaded PDF bytes directly.
// No extra network request → no auth issues.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'DOWNLOAD_FROM_PDFJS') return;

  const tabId = sender.tab?.id;
  if (!tabId) { sendResponse({ success: false, error: 'No tab ID' }); return; }

  const { filename } = message;

  chrome.scripting.executeScript(
    {
      target: { tabId },
      world: 'MAIN',   // runs in the real page JS world – can access all globals
      args: [filename],
      func: async (filename) => {
        try {
          // ── Walk the iframe chain ─────────────────────────────────────────
          // Top frame → platform-pdfviewer/index.html → viewer.html (PDF.js)
          const outer = document.querySelector('iframe[src*="platform-pdfviewer"]');
          if (!outer) throw new Error('Viewer iframe not found in DOM');

          const inner = outer.contentDocument?.getElementById('contentFrame');
          if (!inner) throw new Error('contentFrame iframe not found');

          const app = inner.contentWindow?.PDFViewerApplication;
          if (!app) throw new Error('PDFViewerApplication not available');
          if (!app.pdfDocument) throw new Error('PDF not loaded yet – try again in a moment');

          // ── Pull the raw bytes from the already-loaded PDF ────────────────
          const bytes = await app.pdfDocument.getData(); // Uint8Array

          // ── Trigger a browser download via blob URL ────────────────────────
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 3000);

          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },
    },
    (results) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse(results?.[0]?.result ?? { success: false, error: 'executeScript returned nothing' });
    }
  );

  return true; // keep message channel open for async sendResponse
});
