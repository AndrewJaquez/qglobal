/**
 * Checks if the browser supports features required by the modern (generic) PDF.js bundle.
 * Uses feature detection (arrow functions, Promise, Symbol) and excludes Safari-based browsers
 * due to timing issues where `window.PDFViewerApplication.eventBus` may be unavailable early
 * in lifecycle when using the generic viewer. Safari (including Mobile Safari) will be routed
 * to the legacy bundle which contains additional readiness checks.
 * @returns {boolean} True if the browser is modern enough AND not Safari for the generic bundle.
 */
function isModernBrowser() {
  try {
    new Function('()=>{}');

    const hasCoreFeatures =
      typeof Promise !== 'undefined' && typeof Symbol !== 'undefined';

    // Detect Safari (desktop & iOS);
    // this intentionally routes them to the legacy viewer for stability.
    const ua = navigator.userAgent || '';
    const vendor = navigator.vendor || '';
    const isSafariVendor = /Apple Computer, Inc\./i.test(vendor);
    const isSafariUA = /safari/i.test(ua) && !/chrome|crios|chromium|edg/i.test(ua);
    const isSafari = isSafariVendor || isSafariUA;

    return hasCoreFeatures && !isSafari;
  } catch (e) {
    return false;
  }
}

/**
 * Returns the appropriate viewer path for the current browser.
 * Uses 'generic' for modern browsers and 'generic-legacy' for legacy browsers.
 * @returns {string} Path to the PDF viewer HTML.
 */
function getViewerBundlePath() {
  return isModernBrowser()
    ? '/qg/platform-pdfviewer/generic/web/viewer.html'
    : '/qg/platform-pdfviewer/generic-legacy/web/viewer.html';
}

/**
 * This method retrieves the value of a specific query parameter from the current page's URL.
 * It analyzes the current URL's search/query string and extracts the value associated with the
 * provided query parameter name. If the parameter is not present in the URL, the method
 * will return null.
 *
 * @param {string} param - The name of the query parameter to retrieve from the URL.
 * @return {string|null} The value of the specified query parameter, or null if the parameter
 * does not exist in the URL.
 * @author M. Gonzalez
 */
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * Decodes a Base64 encoded string into its original string representation. This function handles
 * both standard Base64 encoding as well as URL-safe Base64 encoding by first converting any
 * URL-safe characters ('-' and '_') into their standard Base64 equivalents ('+' and '/').
 * It then decodes the Base64 string into its original text.
 *
 * If the input is invalid or an error occurs during decoding (e.g., malformed Base64 string),
 * the function will log an error to the console and return null.
 *
 * @param {string} encodedString - The Base64 encoded string to be decoded. The input can be in
 *                                 either standard or URL-safe Base64 format.
 * @return {string|null} - The decoded string if successful, or null if an error occurs during decoding.
 *
 * @author M. Gonzalez
 */
function decodeBase64(encodedString) {
  try {
    // Replace URL-safe characters with standard Base64 characters
    const base64 = encodedString.replace(/-/g, '+').replace(/_/g, '/');
    // Decode the Base64 string
    return decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (error) {
    console.error('Error decoding Base64 string:', error);
    return null;
  }
}

/**
 * Constructs a fully qualified URL for accessing a PDF viewer on the current domain.
 *
 * This method takes a provided file path, encodes it to ensure it is safe for use within
 * a URL, and appends it as a query parameter to a predefined base URL. The constructed
 * URL points to a PDF viewer, with the bundle chosen based on the browser's capabilities.
 * To generate the final URL, it dynamically retrieves the domain of the current webpage
 * using `window.location.origin` and appends the required path and query string.
 *
 * This is useful for applications that need to dynamically generate links to the PDF
 * viewer for specific files hosted on the server.
 *
 * @param {string} decodedPath - The path to the file needing to be viewed in the PDF viewer.
 *                                This argument should be a decoded string representing the
 *                                file location (relative or absolute) to be processed for
 *                                use in the viewer URL.
 * @return {string} The fully constructed URL pointing to the PDF viewer with the provided
 *                  file path included as a parameter.
 * @author M. Gonzalez
 */
function constructURL(decodedPath) {
  const currentDomain = window.location.origin;
  const viewerPath = getViewerBundlePath();
  return `${currentDomain}${viewerPath}?file=${encodeURIComponent(decodedPath)}`;
}

/**
 * Sets the `src` attribute of an iframe element with a constructed URL derived from a Base64-encoded query parameter.
 *
 * This function retrieves a query parameter named 'id' from the current URL, which is expected to be a
 * Base64-encoded string representing a specific path. It decodes the Base64 string to obtain the actual path.
 * Using this decoded path, the function constructs a URL and updates the `src` attribute of an iframe
 * element with the ID of 'contentFrame'. If the query parameter is not found or decoding fails, appropriate
 * error messages will be logged to the console.
 *
 * The function does the following in detail:
 * - Reads the 'id' query parameter from the URL using `getQueryParam`.
 * - Decodes the Base64-encoded 'id' parameter into a usable string via `decodeBase64`.
 * - Constructs a URL from the decoded string using `constructURL`.
 * - Assigns the URL to the `src` attribute of an iframe identified by the ID 'contentFrame'.
 * - Logs descriptive errors to console if the query parameter is missing or decoding fails.
 *
 * @return {void} This function does not return a value.
 * @author M. Gonzalez
 */
function setIframeSource() {
  const base64EncodedPath = getQueryParam('id');
  if (base64EncodedPath) {
    const decodedPath = decodeBase64(base64EncodedPath);
    if (decodedPath) {
      const iframeURL = constructURL(decodedPath);
      const iframe = document.getElementById('contentFrame');
      iframe.src = iframeURL;
    } else {
      console.error('Failed to decode the Base64-encoded path.');
    }
  } else {
    console.error('Query parameter "id" not found.');
  }
}

// Execute the main function after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', setIframeSource);
