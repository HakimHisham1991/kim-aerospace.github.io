console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Handles line highlighting in the UI
 * @module lineHighlighter
 */

/**
 * Highlights a specific G-code line in the UI
 * @param {number} lineNumber - Line number to highlight
 */
export function highlightLine(lineNumber) {
  const contentDiv = document.getElementById('contentDiv');
  if (!contentDiv) {
    console.warn('contentDiv element not found. Cannot highlight line.');
    return;
  }

  const lineSpans = contentDiv.querySelectorAll('span.line');
  lineSpans.forEach(span => {
    span.style.backgroundColor = '';
    span.style.fontWeight = '';
  });

  if (lineNumber >= 0 && lineSpans[lineNumber]) {
    const lineSpan = lineSpans[lineNumber];
    lineSpan.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
    lineSpan.style.fontWeight = 'bold';
    console.debug(`Highlighted line ${lineNumber + 1}`);
  } else if (lineNumber < 0) {
    console.debug(`Cleared all highlights`);
  }
}