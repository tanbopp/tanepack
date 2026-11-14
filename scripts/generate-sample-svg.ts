// CLI script generating a visual SVG preview of a 100x50x100mm tuck-end dieline
import fs from 'node:fs';
import path from 'node:path';
import { generateTuckEndBox } from '../src/entities/dieline/generateTuckEndBox.ts';

function computePathCentroid(svgPath: string): { x: number; y: number } {
  const nums = svgPath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x === undefined || y === undefined) {
      continue;
    }
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    x: Math.round((minX + maxX) * 0.5 * 100) / 100,
    y: Math.round((minY + maxY) * 0.5 * 100) / 100,
  };
}

const sampleDimensions = {
  length: 100,
  width: 50,
  height: 100,
  thickness: 0.5,
  bleedSize: 3,
};

const dieline = generateTuckEndBox(sampleDimensions);
const pad = sampleDimensions.bleedSize + 14;
const viewMinX = -pad;
const viewMinY = -pad;
const viewW = dieline.totalWidth + pad * 2;
const viewH = dieline.totalHeight + pad * 2;

const faceElements = dieline.faces
  .map((face) => {
    const center = computePathCentroid(face.path);
    const fill = face.id === 'front' ? '#efe3d2' : '#f7f1e8';
    return [
      `    <path d="${face.path}" fill="${fill}" fill-opacity="0.75" stroke="none" />`,
      `    <text x="${center.x}" y="${center.y}" font-family="sans-serif" font-size="3.6" fill="#4e3d28" text-anchor="middle" dominant-baseline="middle">${face.name}</text>`,
    ].join('\n');
  })
  .join('\n');

const bleedElements = dieline.bleeds
  .map(
    (bleed) =>
      `    <path d="${bleed.path}" fill="none" stroke="#00838f" stroke-width="0.4" stroke-dasharray="2 1.5" />`,
  )
  .join('\n');

const foldElements = dieline.folds
  .map(
    (fold) =>
      `    <line x1="${fold.from.x}" y1="${fold.from.y}" x2="${fold.to.x}" y2="${fold.to.y}" stroke="#2e7d32" stroke-width="0.45" stroke-dasharray="3 1.5" />`,
  )
  .join('\n');

const cutElements = dieline.cuts
  .map((cut) => `    <path d="${cut.path}" fill="none" stroke="#c62828" stroke-width="0.6" />`)
  .join('\n');

const svg = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewMinX} ${viewMinY} ${viewW} ${viewH}" width="${viewW}mm" height="${viewH}mm">`,
  '  <rect x="-1000" y="-1000" width="3000" height="3000" fill="#ffffff" />',
  `  <text x="0" y="${-sampleDimensions.bleedSize - 5}" font-family="sans-serif" font-size="4.2" font-weight="600" fill="#211a13">Tanepack Tuck-End Dieline — 100 × 50 × 100 mm (t=0.5 mm, bleed=3 mm) | Span: ${dieline.totalWidth} × ${dieline.totalHeight} mm</text>`,
  '  <g id="faces">',
  faceElements,
  '  </g>',
  '  <g id="bleeds">',
  bleedElements,
  '  </g>',
  '  <g id="folds">',
  foldElements,
  '  </g>',
  '  <g id="cuts">',
  cutElements,
  '  </g>',
  `  <text x="${dieline.totalWidth}" y="${dieline.totalHeight + sampleDimensions.bleedSize + 8}" font-family="sans-serif" font-size="3.4" fill="#5d4c39" text-anchor="end">Red = Cut | Green dashed = Fold (90 deg) | Teal dashed = Bleed (3 mm)</text>`,
  '</svg>',
  '',
].join('\n');

const outPath = path.resolve(process.cwd(), 'scratch', 'sample-dieline.svg');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, svg, 'utf8');
process.stdout.write(`Generated ${outPath} (${dieline.totalWidth}x${dieline.totalHeight} mm)\n`);
