// Browser FileReader image-to-DataURL loader, dimension detector, and decoded image cache
import { roundMm } from '@shared/lib/units';

export const DEFAULT_UPLOADED_IMAGE_MAX_MM = 30;

export interface LoadedImageData {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  widthMm: number;
  heightMm: number;
}

const decodedImageCache = new Map<string, HTMLImageElement>();

/** Retrieves a cached pre-decoded HTMLImageElement for immediate offscreen canvas drawing. */
export function getCachedDecodedImage(src: string): HTMLImageElement | undefined {
  return decodedImageCache.get(src);
}

/** Stores a loaded HTMLImageElement in memory keyed by its base64 Data URL or source string. */
export function setCachedDecodedImage(src: string, image: HTMLImageElement): void {
  if (image.complete && image.naturalWidth > 0) {
    decodedImageCache.set(src, image);
  }
}

/** Computes aspect-preserving millimeter size inside a square maxMm bounding box. */
export function computeAspectFitMm(
  naturalWidth: number,
  naturalHeight: number,
  maxMm = DEFAULT_UPLOADED_IMAGE_MAX_MM,
): { widthMm: number; heightMm: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { widthMm: maxMm, heightMm: maxMm };
  }
  const scale = maxMm / Math.max(naturalWidth, naturalHeight);
  return {
    widthMm: roundMm(naturalWidth * scale),
    heightMm: roundMm(naturalHeight * scale),
  };
}

/** Converts an uploaded File to a base64 Data URL via FileReader cleanly. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Expected base64 string Data URL from FileReader.'));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read selected image file.'));
    };
    reader.readAsDataURL(file);
  });
}

/** Probes intrinsic pixel dimensions for a Data URL and caches the decoded HTMLImageElement. */
export function measureImageDataUrl(
  dataUrl: string,
  maxMm = DEFAULT_UPLOADED_IMAGE_MAX_MM,
): Promise<LoadedImageData> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const finish = (natW: number, natH: number) => {
      if (settled) {
        return;
      }
      settled = true;
      setCachedDecodedImage(dataUrl, img);
      const safeW = natW > 0 ? natW : maxMm;
      const safeH = natH > 0 ? natH : maxMm;
      const { widthMm, heightMm } = computeAspectFitMm(safeW, safeH, maxMm);
      resolve({
        src: dataUrl,
        naturalWidth: safeW,
        naturalHeight: safeH,
        widthMm,
        heightMm,
      });
    };

    img.onload = () => finish(img.naturalWidth, img.naturalHeight);
    img.onerror = () => finish(maxMm, maxMm);
    img.src = dataUrl;

    if (img.complete && img.naturalWidth > 0) {
      finish(img.naturalWidth, img.naturalHeight);
      return;
    }

    // Safety fallback for headless test environments that do not fire Image.onload on Data URLs
    setTimeout(() => finish(img.naturalWidth || maxMm, img.naturalHeight || maxMm), 150);
  });
}

/** Reads an uploaded image File into a base64 Data URL and resolves aspect-ratio mm bounds. */
export async function loadUploadedImageFile(
  file: File,
  maxMm = DEFAULT_UPLOADED_IMAGE_MAX_MM,
): Promise<LoadedImageData> {
  const dataUrl = await readFileAsDataUrl(file);
  return measureImageDataUrl(dataUrl, maxMm);
}
