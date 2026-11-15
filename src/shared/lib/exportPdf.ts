// Client-side vector PDF export converting print-styled 2D SVG dielines via svg2pdf.js & pdf-lib
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { svg2pdf } from 'svg2pdf.js';

export const PDF_POINTS_PER_MM = 2.83465;

export interface PdfExportDieline {
  totalWidth: number;
  totalHeight: number;
}

export interface ExportDielinePdfOptions {
  autoDownload?: boolean | undefined;
  filename?: string | undefined;
}

const SELECTION_AND_UI_SELECTOR = [
  '[data-selection-overlay]',
  '[data-selection-box]',
  '[data-testid="handle-rotate"]',
  '[data-testid^="handle-resize-"]',
  '[data-ui-overlay]',
].join(', ');

/** Formats a local calendar date as YYYY-MM-DD for print export filenames. */
export function buildDielinePdfFilename(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `tanepack-dieline-${year}-${month}-${day}.pdf`;
}

/** Triggers a browser download of generated PDF bytes and releases the object URL. */
export function triggerPdfBytesDownload(
  pdfBytes: Uint8Array,
  filename = buildDielinePdfFilename(),
): void {
  const copy = new Uint8Array(pdfBytes);
  const blob = new Blob([copy.buffer], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

/**
 * Clones the live SVG stage and applies print-ready CAD styles without altering visible UI:
 * white sheet background, 0.25mm solid red cuts (#ff0000), 0.25mm dashed blue folds (#0000ff),
 * intact artwork colors, viewBox locked to dieline bounds, and zero selection handles/overlays.
 */
export function preparePrintSvgForPdf(
  svgElement: SVGSVGElement,
  dieline: PdfExportDieline,
): SVGSVGElement {
  const widthMm = dieline.totalWidth;
  const heightMm = dieline.totalHeight;
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) {
    throw new RangeError('Dieline dimensions must be positive finite numbers for PDF export.');
  }

  const pageWidthPt = widthMm * PDF_POINTS_PER_MM;
  const pageHeightPt = heightMm * PDF_POINTS_PER_MM;

  const cloned = svgElement.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  cloned.setAttribute('viewBox', `0 0 ${widthMm} ${heightMm}`);
  cloned.setAttribute('width', String(pageWidthPt));
  cloned.setAttribute('height', String(pageHeightPt));
  cloned.style.removeProperty('filter');
  cloned.style.removeProperty('transform');

  for (const uiNode of cloned.querySelectorAll(SELECTION_AND_UI_SELECTOR)) {
    uiNode.remove();
  }

  const paperRect = cloned.querySelector('[data-layer="paper"]');
  if (paperRect) {
    paperRect.setAttribute('x', '0');
    paperRect.setAttribute('y', '0');
    paperRect.setAttribute('width', String(widthMm));
    paperRect.setAttribute('height', String(heightMm));
    paperRect.setAttribute('rx', '0');
    paperRect.setAttribute('fill', '#ffffff');
    paperRect.setAttribute('stroke', 'none');
  }

  // Keep page strictly trim-sized with distinct red cuts and blue folds (hide outer bleed guide)
  const bleedLayer = cloned.querySelector('[data-layer="bleeds"]');
  if (bleedLayer) {
    bleedLayer.remove();
  }

  for (const cutNode of cloned.querySelectorAll(
    '[data-layer="cuts"] path, [data-layer="cuts"] line, [data-layer="cuts"] rect, [data-layer="cuts"] polygon',
  )) {
    cutNode.setAttribute('fill', 'none');
    cutNode.setAttribute('stroke', '#ff0000');
    cutNode.setAttribute('stroke-width', '0.25');
    cutNode.setAttribute('stroke-opacity', '1');
    cutNode.setAttribute('stroke-linecap', 'round');
    cutNode.setAttribute('stroke-linejoin', 'round');
    cutNode.removeAttribute('stroke-dasharray');
  }

  for (const foldNode of cloned.querySelectorAll(
    '[data-layer="folds"] path, [data-layer="folds"] line',
  )) {
    foldNode.setAttribute('fill', 'none');
    foldNode.setAttribute('stroke', '#0000ff');
    foldNode.setAttribute('stroke-width', '0.25');
    foldNode.setAttribute('stroke-opacity', '1');
    if (!foldNode.getAttribute('stroke-dasharray')) {
      foldNode.setAttribute('stroke-dasharray', '1, 1');
    }
  }

  // svg2pdf.js reads alignment-baseline rather than dominant-baseline for vertical centering
  for (const textNode of cloned.querySelectorAll('text, tspan')) {
    const dominant = textNode.getAttribute('dominant-baseline');
    if (dominant && !textNode.getAttribute('alignment-baseline')) {
      textNode.setAttribute('alignment-baseline', dominant);
    }
    if (textNode instanceof SVGElement) {
      textNode.style.removeProperty('user-select');
      textNode.style.removeProperty('cursor');
    }
  }

  return cloned;
}

/**
 * Generates a print-ready vector PDF matching the exact millimeter dimensions of the dieline
 * (1 mm = 2.83465 pt) via svg2pdf.js and pdf-lib, and downloads it client-side.
 */
export async function exportDielinePdf(
  svgElement: SVGSVGElement,
  dieline: PdfExportDieline,
  options?: ExportDielinePdfOptions,
): Promise<Uint8Array> {
  const printSvg = preparePrintSvgForPdf(svgElement, dieline);
  const pageWidthPt = dieline.totalWidth * PDF_POINTS_PER_MM;
  const pageHeightPt = dieline.totalHeight * PDF_POINTS_PER_MM;

  const orientation = pageWidthPt >= pageHeightPt ? 'landscape' : 'portrait';
  const jsPdfDoc = new jsPDF({
    orientation,
    unit: 'pt',
    format: [pageWidthPt, pageHeightPt],
    compress: true,
  });

  await svg2pdf(printSvg, jsPdfDoc, {
    x: 0,
    y: 0,
    width: pageWidthPt,
    height: pageHeightPt,
    loadExternalStyleSheets: false,
  });

  const vectorStream = jsPdfDoc.output('arraybuffer');

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('Tanepack Print Dieline');
  pdfDoc.setCreator('Tanepack');
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
  const [embeddedVectorPage] = await pdfDoc.embedPdf(vectorStream, [0]);
  if (embeddedVectorPage) {
    page.drawPage(embeddedVectorPage, {
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt,
    });
  }

  const pdfBytes = await pdfDoc.save();

  if (options?.autoDownload !== false) {
    triggerPdfBytesDownload(pdfBytes, options?.filename ?? buildDielinePdfFilename());
  }

  return pdfBytes;
}
