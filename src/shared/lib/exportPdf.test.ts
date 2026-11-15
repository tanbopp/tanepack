// Unit tests for print-ready vector PDF preparation and pdf-lib page sizing
import { PDFDocument } from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDielinePdfFilename,
  exportDielinePdf,
  PDF_POINTS_PER_MM,
  preparePrintSvgForPdf,
} from './exportPdf';

const { mockSvg2Pdf } = vi.hoisted(() => ({
  mockSvg2Pdf: vi.fn(
    async (
      _element: SVGElement,
      pdf: {
        setDrawColor: (r: number, g: number, b: number) => void;
        line: (x1: number, y1: number, x2: number, y2: number) => void;
      },
      _options?: { x?: number; y?: number; width?: number; height?: number },
    ) => {
      pdf.setDrawColor(255, 0, 0);
      pdf.line(10, 10, 120, 10);
    },
  ),
}));

vi.mock('svg2pdf.js', () => ({
  svg2pdf: mockSvg2Pdf,
}));

function buildSampleDielineSvg(): SVGSVGElement {
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('data-testid', 'dieline-svg');
  svg.setAttribute('viewBox', '0 0 317 231.5');
  svg.setAttribute('width', '1198.11');
  svg.setAttribute('height', '874.96');
  svg.style.filter = 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08))';

  const paper = document.createElementNS(svgNs, 'rect');
  paper.setAttribute('data-layer', 'paper');
  paper.setAttribute('x', '-9');
  paper.setAttribute('y', '-9');
  paper.setAttribute('width', '335');
  paper.setAttribute('height', '249.5');
  paper.setAttribute('rx', '1.5');
  paper.setAttribute('fill', '#ffffff');
  paper.setAttribute('stroke', 'var(--md-sys-color-outline-variant)');
  paper.setAttribute('stroke-width', '0.35');
  svg.appendChild(paper);

  const bleeds = document.createElementNS(svgNs, 'g');
  bleeds.setAttribute('data-layer', 'bleeds');
  const bleedPath = document.createElementNS(svgNs, 'path');
  bleedPath.setAttribute('d', 'M 0 0 L 317 0 L 317 231.5 L 0 231.5 Z');
  bleedPath.setAttribute('stroke', '#b3261e');
  bleeds.appendChild(bleedPath);
  svg.appendChild(bleeds);

  const artwork = document.createElementNS(svgNs, 'g');
  artwork.setAttribute('data-layer', 'artwork');

  const textEl = document.createElementNS(svgNs, 'text');
  textEl.setAttribute('x', '100');
  textEl.setAttribute('y', '120');
  textEl.setAttribute('fill', '#c62828');
  textEl.setAttribute('font-size', '14');
  textEl.setAttribute('dominant-baseline', 'central');
  textEl.textContent = 'Mint Tea';
  artwork.appendChild(textEl);

  const imageEl = document.createElementNS(svgNs, 'image');
  imageEl.setAttribute('href', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
  imageEl.setAttribute('x', '80');
  imageEl.setAttribute('y', '90');
  imageEl.setAttribute('width', '30');
  imageEl.setAttribute('height', '20');
  artwork.appendChild(imageEl);

  const selectionOverlay = document.createElementNS(svgNs, 'g');
  selectionOverlay.setAttribute('data-selection-overlay', 'true');
  const selectionBox = document.createElementNS(svgNs, 'rect');
  selectionBox.setAttribute('data-selection-box', 'true');
  const rotateHandle = document.createElementNS(svgNs, 'circle');
  rotateHandle.setAttribute('data-testid', 'handle-rotate');
  const resizeHandle = document.createElementNS(svgNs, 'circle');
  resizeHandle.setAttribute('data-testid', 'handle-resize-se');
  selectionOverlay.append(selectionBox, rotateHandle, resizeHandle);
  artwork.appendChild(selectionOverlay);

  svg.appendChild(artwork);

  const folds = document.createElementNS(svgNs, 'g');
  folds.setAttribute('data-layer', 'folds');
  const foldLine = document.createElementNS(svgNs, 'line');
  foldLine.setAttribute('x1', '12');
  foldLine.setAttribute('y1', '65');
  foldLine.setAttribute('x2', '12');
  foldLine.setAttribute('y2', '165');
  foldLine.setAttribute('stroke', '#79747e');
  foldLine.setAttribute('stroke-width', '0.2');
  foldLine.setAttribute('stroke-dasharray', '1, 1');
  folds.appendChild(foldLine);
  svg.appendChild(folds);

  const cuts = document.createElementNS(svgNs, 'g');
  cuts.setAttribute('data-layer', 'cuts');
  const cutPath = document.createElementNS(svgNs, 'path');
  cutPath.setAttribute('d', 'M 12 65 L 112 65 L 112 165 L 12 165 Z');
  cutPath.setAttribute('stroke', '#000000');
  cutPath.setAttribute('stroke-width', '0.2');
  cuts.appendChild(cutPath);
  svg.appendChild(cuts);

  return svg;
}

describe('exportPdf', () => {
  beforeEach(() => {
    mockSvg2Pdf.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats YYYY-MM-DD filename with exact PDF point constant', () => {
    expect(PDF_POINTS_PER_MM).toBe(2.83465);
    expect(buildDielinePdfFilename(new Date(2026, 10, 5))).toBe('tanepack-dieline-2026-11-05.pdf');
  });

  it('prepares a print-ready clone without mutating live editor SVG or leaking UI overlays', () => {
    const liveSvg = buildSampleDielineSvg();
    const dieline = { totalWidth: 317, totalHeight: 231.5 };

    const printSvg = preparePrintSvgForPdf(liveSvg, dieline);

    // Dimensions locked to mm viewBox and PDF pt physical size
    expect(printSvg.getAttribute('viewBox')).toBe('0 0 317 231.5');
    expect(Number(printSvg.getAttribute('width'))).toBeCloseTo(317 * 2.83465, 2);
    expect(Number(printSvg.getAttribute('height'))).toBeCloseTo(231.5 * 2.83465, 2);
    expect(printSvg.style.filter).toBe('');

    // White sheet background without UI border, bleeds removed
    const printPaper = printSvg.querySelector('[data-layer="paper"]');
    expect(printPaper?.getAttribute('fill')).toBe('#ffffff');
    expect(printPaper?.getAttribute('stroke')).toBe('none');
    expect(printPaper?.getAttribute('x')).toBe('0');
    expect(printSvg.querySelector('[data-layer="bleeds"]')).toBeNull();

    // Solid red cut lines (#ff0000, 0.25mm) and dashed blue fold lines (#0000ff, 0.25mm)
    const printCut = printSvg.querySelector('[data-layer="cuts"] path');
    expect(printCut?.getAttribute('stroke')).toBe('#ff0000');
    expect(printCut?.getAttribute('stroke-width')).toBe('0.25');
    expect(printCut?.getAttribute('stroke-dasharray')).toBeNull();

    const printFold = printSvg.querySelector('[data-layer="folds"] line');
    expect(printFold?.getAttribute('stroke')).toBe('#0000ff');
    expect(printFold?.getAttribute('stroke-width')).toBe('0.25');
    expect(printFold?.getAttribute('stroke-dasharray')).toBe('1, 1');

    // Selection overlay & handles completely stripped; artwork preserved cleanly
    expect(printSvg.querySelector('[data-selection-overlay]')).toBeNull();
    expect(printSvg.querySelector('[data-selection-box]')).toBeNull();
    expect(printSvg.querySelector('[data-testid="handle-rotate"]')).toBeNull();
    expect(printSvg.querySelector('[data-testid^="handle-resize-"]')).toBeNull();

    const printText = printSvg.querySelector('[data-layer="artwork"] text');
    expect(printText?.getAttribute('fill')).toBe('#c62828');
    expect(printText?.getAttribute('alignment-baseline')).toBe('central');
    expect(printSvg.querySelector('[data-layer="artwork"] image')?.getAttribute('href')).toContain(
      'data:image/png;base64,',
    );

    // Original live SVG remains untouched for on-screen editing
    expect(liveSvg.querySelector('[data-selection-overlay]')).not.toBeNull();
    expect(liveSvg.querySelector('[data-layer="cuts"] path')?.getAttribute('stroke')).toBe(
      '#000000',
    );
    expect(liveSvg.querySelector('[data-layer="folds"] line')?.getAttribute('stroke')).toBe(
      '#79747e',
    );
  });

  it('generates valid vector PDF bytes with exact millimeter page size and triggers .pdf download', async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost:5173/mock-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    let downloadedFilename = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {
          downloadedFilename = (el as HTMLAnchorElement).download;
        });
      }
      return el;
    }) as typeof document.createElement);

    const liveSvg = buildSampleDielineSvg();
    const dieline = { totalWidth: 317, totalHeight: 231.5 };

    const pdfBytes = await exportDielinePdf(liveSvg, dieline, {
      filename: 'tanepack-dieline-2026-11-15.pdf',
    });

    expect(mockSvg2Pdf).toHaveBeenCalledTimes(1);
    const callOptions = mockSvg2Pdf.mock.calls[0]?.[2] as
      { x: number; y: number; width: number; height: number } | undefined;
    expect(callOptions?.x).toBe(0);
    expect(callOptions?.y).toBe(0);
    expect(callOptions?.width).toBeCloseTo(317 * 2.83465, 2);
    expect(callOptions?.height).toBeCloseTo(231.5 * 2.83465, 2);

    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');

    const loadedDoc = await PDFDocument.load(pdfBytes);
    expect(loadedDoc.getPageCount()).toBe(1);
    const { width, height } = loadedDoc.getPage(0).getSize();
    expect(width).toBeCloseTo(317 * 2.83465, 2);
    expect(height).toBeCloseTo(231.5 * 2.83465, 2);

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(downloadedFilename).toBe('tanepack-dieline-2026-11-15.pdf');
  });
});
