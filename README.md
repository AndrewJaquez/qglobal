# Q-Global PDF Downloader

A Chrome extension that saves PDFs from the [Q-Global Resource Library](https://qglobal.pearsonassessments.com) to your computer.

The viewer loads PDFs through a JS-rendered iframe chain using PDF.js, with authentication handled by the Angular app's session state — not browser cookies. This extension reads the PDF bytes directly out of the already-loaded PDF.js instance in memory, so no re-authentication or extra network request is needed.

---

## Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The extension icon will appear in your toolbar (pin it for easy access)

---

## Usage

1. Log in to [qglobal.pearsonassessments.com](https://qglobal.pearsonassessments.com)
2. Navigate to **Resources → Resource Library** and open any PDF
3. Wait for the PDF viewer to fully load (you should see pages rendering)
4. Click the **⬇ Download PDF** button that appears in the top-right corner of the page
5. The file saves to your default Downloads folder with the original filename

The button label shows progress:

| Label | Meaning |
|---|---|
| ⬇ Download PDF | Ready |
| ⏳ Reading PDF… | Extracting bytes from PDF.js |
| ✅ Saved! | File saved to Downloads |
| ❌ [message] | Something went wrong — see below |

---

## Troubleshooting

**Button doesn't appear**
The extension only injects on PDF viewer pages (`/file-viewer-pdf/*`). Make sure you've opened a specific PDF resource, not just the resource list.

**"PDF not loaded yet"**
The viewer was still rendering when you clicked. Wait a few seconds for the pages to appear, then try again.

**"Viewer iframe not found"**
The page structure may have changed. Try refreshing the page and waiting for the PDF to fully load before clicking.

**Download doesn't start**
Check that Chrome isn't blocking popups or downloads for this site. Also ensure the extension has the required permissions (`tabs`, `scripting`) — visible under the extension's detail page in `chrome://extensions`.

---

## How it works

The Q-Global viewer renders PDFs through two nested iframes:

```
qglobal.pearsonassessments.com (main page)
  └─ /qg/platform-pdfviewer/index.html?id=<base64>
       └─ /qg/platform-pdfviewer/generic/web/viewer.html?file=<api-url>
            └─ PDF.js fetches and renders the PDF
```

The `?id=` parameter is a Base64-encoded URL pointing to the authenticated PDF API endpoint. The extension decodes this to identify the document name and confirm it's on a PDF viewer page.

When you click Download, the extension uses `chrome.scripting.executeScript` with `world: 'MAIN'` to inject code into the page's JavaScript environment. That code walks the iframe chain, calls `PDFViewerApplication.pdfDocument.getData()` on the already-loaded PDF.js instance, and triggers a blob download — no additional network request, no re-authentication.

---

## Files

```
extension/
├── manifest.json   — Extension config (MV3), permissions, content script match rules
├── background.js   — Service worker; runs executeScript in the page's main world
├── content.js      — Detects the PDF URL, injects the download button, relays messages
├── popup.html      — Extension toolbar popup UI
└── popup.js        — Popup logic; queries content script for PDF info
```
