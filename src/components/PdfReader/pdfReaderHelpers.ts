import type * as pdfjsLib from 'pdfjs-dist';

export const RENDER_SCALE = 1.5;
export const PAGE_GAP = 20;
const hasWindow = typeof window?.devicePixelRatio === 'number';
export const PIXEL_RATIO = hasWindow ? window.devicePixelRatio || 1 : 1;
// Keep backward-compatible export used by PdfJsReader
export const DPR = PIXEL_RATIO;

// Zoom constants
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.25;

// --- URL detection helpers --- //
const URL_START_RE = /https?:\/\/[^\s<>"]*$/iu;
// Includes soft/non-breaking hyphens
const URL_CONT_RE = /^[A-Za-z0-9./?&%=_#:\-\u00AD\u2010\u2011]+/u;
const SAME_LINE_EPS_PX = 1.5;
// Accept tiny horizontal gap on same line; larger gap means a space and URL ended
const HORIZONTAL_GAP_EPS_PX = 8;

/**
 * Makes every link in a rendered PDF page clickable by overlaying
 * transparent <a> elements on top of the rendered canvas / text layer.
 *
 * The function covers two separate cases:
 * • **PDF annotations** – formal link annotations embedded in the PDF file.
 * • **Plain-text URLs** – strings that merely look like URLs inside the
 *   rendered text layer (common in poorly generated PDFs).
 *
 * 1. Removes previously created anchors (marked by `data-pdf-link`).
 * 2. Retrieves annotations via `page.getAnnotations({ intent: 'display' })`.
 * 3. Filters for external links (`subtype === 'Link'` && `url`).
 * 4. Converts each annotation rectangle from PDF coordinate space to viewport
 *    coordinates via `viewport.convertToViewportRectangle`.
 * 5. Adjusts the rectangle by the current zoom factor so it matches the size
 *    of the rendered canvas/text layer.
 * 6. Appends an absolutely-positioned anchor to the `container` making the
 *    area clickable; links open in a new tab with `rel="noopener noreferrer"`.
 * 7. If **no annotations** are present (or only some links are plain text),
 *    the function additionally scans every `span` rendered by PDF.js for
 *    `https?://…` patterns. For each detected URL it derives the visual
 *    bounding rectangle using `getBoundingClientRect()` (which already takes
 *    `transform: scale()` and other CSS into account) and then merges
 *    consecutive sibling spans that belong to the same link to ensure the
 *    overlay covers the full visible text.
 *
 * @param page - The current `PDFPageProxy`.
 * @param viewport - The viewport that was used to render the page at
 *                   `RENDER_SCALE`.
 * @param container - The text layer div sitting above the canvas – anchors are
 *                    appended here so they inherit correct stacking context.
 * @param zoom - Current zoom factor (relative to `RENDER_SCALE`). Used to
 *               scale the rectangle so the overlay aligns with the canvas.
 */
const removeExistingAnchors = (parent: HTMLElement) => {
  const anchors = parent.querySelectorAll<HTMLElement>('[data-pdf-link]');
  for (const anchor of anchors) {
    anchor.remove();
  }
};

const renderAnnotationLinks = (
  anns: Array<Record<string, unknown>>,
  viewport: pdfjsLib.PageViewport,
  container: HTMLDivElement,
  zoom: number,
) => {
  const scaleFactor = zoom / RENDER_SCALE;
  for (const ann of anns) {
    const isLink = (ann as { subtype?: string, }).subtype === 'Link';
    const url = (ann as { url?: string, }).url;
    if (!isLink || !url) {
      continue;
    }

    // Only allow http(s) schemes to avoid javascript:/data: exploitation
    const isSafeHttpUrl = typeof url === 'string' && /^https?:\/\//iu.test(url);
    if (!isSafeHttpUrl) {
      continue;
    }

    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle((ann as { rect: number[], }).rect) as number[];
    if (!x1 || !y1 || !x2 || !y2) {
      continue;
    }

    const left = Math.min(x1, x2) * scaleFactor;
    const top = Math.min(y1, y2) * scaleFactor;
    const width = Math.abs(x1 - x2) * scaleFactor;
    const height = Math.abs(y1 - y2) * scaleFactor;

    const linkEl = document.createElement('a');
    linkEl.href = url;
    linkEl.rel = 'noopener noreferrer';
    linkEl.target = '_blank';
    linkEl.setAttribute('data-pdf-link', 'true');

    Object.assign(linkEl.style, {
      background: 'transparent',
      cursor: 'pointer',
      height: `${height}px`,
      left: `${left}px`,
      position: 'absolute',
      top: `${top}px`,
      width: `${width}px`,
    } as CSSStyleDeclaration);

    container.appendChild(linkEl);
  }
};

const canWrapAcrossLines = (previousChar: string, nextFirstChar: string): boolean => {
  return /[#&./:=?\u00AD\u2010\u2011-]$/u.test(previousChar) || /[#&./:=?]/u.test(nextFirstChar);
};

const extendUrlAcrossSpans = (
  spans: HTMLSpanElement[],
  startIndex: number,
  startSpan: HTMLSpanElement,
) => {
  const textContent = startSpan.textContent ?? '';
  let endSpan: HTMLSpanElement = startSpan;
  let endOffset = (endSpan.firstChild as Text)?.length ?? 0;
  let lastConsumedChar = textContent.charAt(textContent.length - 1);
  let lookaheadIndex = startIndex + 1;
  let previousRect = startSpan.getBoundingClientRect();
  const visitedSiblings: HTMLElement[] = [];

  while (lookaheadIndex < spans.length) {
    const siblingSpan = spans[lookaheadIndex];
    if (siblingSpan?.tagName !== 'SPAN') {
      break;
    }

    const siblingText = siblingSpan.textContent ?? '';
    const firstChar = siblingText.charAt(0) || '';
    const siblingRect = siblingSpan.getBoundingClientRect();
    const isSameLine = Math.abs(siblingRect.top - previousRect.top) <= SAME_LINE_EPS_PX;

    if (isSameLine) {
      const horizontalGap = siblingRect.left - previousRect.right;
      if (horizontalGap > HORIZONTAL_GAP_EPS_PX) {
        break;
      }
    } else if (!canWrapAcrossLines(lastConsumedChar, firstChar)) {
      break;
    }

    const continuation = siblingText.match(URL_CONT_RE)?.[0] ?? '';
    if (!continuation) {
      break;
    }

    visitedSiblings.push(siblingSpan);
    endSpan = siblingSpan;
    endOffset = continuation.length;
    lastConsumedChar = continuation.charAt(continuation.length - 1) || lastConsumedChar;
    previousRect = siblingRect;
    lookaheadIndex += 1;
  }

  return { endOffset, endSpan, nextIndex: lookaheadIndex, visitedSiblings };
};

const appendAnchorsForRange = (
  range: Range,
  href: string,
  containerRect: DOMRect,
  container: HTMLDivElement,
  renderedPositions: Set<string>,
) => {
  const rectList = Array.from(range.getClientRects());
  for (const rect of rectList) {
    const relativeLeft = rect.left - containerRect.left;
    const relativeTop = rect.top - containerRect.top;
    const key = `${Math.round(relativeLeft)}-${Math.round(relativeTop)}-${href}`;
    if (renderedPositions.has(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    renderedPositions.add(key);

    const linkEl = document.createElement('a');
    linkEl.href = href;
    linkEl.rel = 'noopener noreferrer';
    linkEl.target = '_blank';
    linkEl.setAttribute('data-pdf-link', 'true');

    Object.assign(linkEl.style, {
      background: 'transparent',
      cursor: 'pointer',
      height: `${rect.height}px`,
      left: `${relativeLeft}px`,
      position: 'absolute',
      top: `${relativeTop}px`,
      width: `${rect.width}px`,
    } as CSSStyleDeclaration);

    container.appendChild(linkEl);
  }
};

const renderPlainTextUrlLinks = (container: HTMLDivElement) => {
  const renderedPositions = new Set<string>();
  const containerRect = container.getBoundingClientRect();
  const spans = Array.from(container.querySelectorAll<HTMLSpanElement>('span'));
  const visited = new Set<HTMLElement>();

  for (let spanIndex = 0; spanIndex < spans.length; spanIndex += 1) {
    const startSpan = spans[spanIndex];
    if (startSpan && visited.has(startSpan)) {
      continue;
    }

    const text = startSpan?.textContent ?? '';
    const matchStart = text.match(URL_START_RE);
    if (!matchStart || !startSpan) {
      continue;
    }

    const startOffset = text.length - matchStart[0].length;
    visited.add(startSpan);
    const { endOffset, endSpan, nextIndex, visitedSiblings } = extendUrlAcrossSpans(spans, spanIndex, startSpan);
    for (const el of visitedSiblings) {
      visited.add(el);
    }

    const href = (matchStart[0] + (endSpan === startSpan ? '' : (endSpan.textContent ?? '').slice(0, endOffset)))
      .replace(/[),.;:\]\u00AD\u2010\u2011]+$/u, '');

    if (!/^https?:\/\/\S{3,}/iu.test(href)) {
      continue;
    }

    const range = document.createRange();
    range.setStart(startSpan.firstChild ?? startSpan, startOffset);
    range.setEnd(endSpan.firstChild ?? endSpan, endOffset);

    appendAnchorsForRange(range, href, containerRect, container, renderedPositions);

    // skip processed spans
    spanIndex = nextIndex - 1;
  }
};

export const renderClickableLinkAnnotations = async (
  page: pdfjsLib.PDFPageProxy,
  viewport: pdfjsLib.PageViewport,
  container: HTMLDivElement,
  zoom: number,
) => {
  removeExistingAnchors(container);
  const annotations = (await page.getAnnotations({ intent: 'display' })) as Array<Record<string, unknown>>;
  renderAnnotationLinks(annotations, viewport, container, zoom);
  renderPlainTextUrlLinks(container);
};
