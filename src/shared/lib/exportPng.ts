// Browser PNG download trigger and 2D SVG-to-PNG offscreen rasterization helpers
export const DEFAULT_EXPORT_FILENAME = 'untitled-box.png';

/** Triggers an immediate browser file download from an in-memory PNG base64 Data URL. */
export function triggerPngDataUrlDownload(
  dataUrl: string,
  filename = DEFAULT_EXPORT_FILENAME,
): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Serializes the live 2D dieline SVG into a standalone image (stripping UI selection chrome),
 * paints it onto a white offscreen canvas, and exports a PNG Data URL.
 */
export function exportSvgElementToPngDataUrl(
  svgElement: SVGSVGElement,
  maxEdgePx = 2048,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cloned = svgElement.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    for (const selNode of cloned.querySelectorAll('[data-selection-box="true"]')) {
      selNode.remove();
    }

    const viewBox = svgElement.viewBox.baseVal;
    const vw = viewBox && viewBox.width > 0 ? viewBox.width : 317;
    const vh = viewBox && viewBox.height > 0 ? viewBox.height : 231.5;
    const scale = maxEdgePx / Math.max(vw, vh);
    const outWidth = Math.max(1, Math.round(vw * scale));
    const outHeight = Math.max(1, Math.round(vh * scale));

    cloned.setAttribute('width', String(outWidth));
    cloned.setAttribute('height', String(outHeight));

    const serializer = new XMLSerializer();
    let svgMarkup = serializer.serializeToString(cloned);
    svgMarkup = svgMarkup.replace(/var\(--md-sys-color-outline-variant\)/g, '#cac4d0');

    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = outWidth;
        canvas.height = outHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to create 2D export canvas context.');
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outWidth, outHeight);
        ctx.drawImage(img, 0, 0, outWidth, outHeight);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to rasterize SVG dieline for PNG export.'));
    };

    img.src = objectUrl;
  });
}
