// Unit tests for parametric reverse tuck-end box generator
import { describe, expect, it } from 'vitest';
import { generateTuckEndBox } from '@entities/dieline';

const VALID_SVG_PATH_REGEX = /^[MLCQZ\d.,\s-]+$/;
const DECIMAL_OVER_TWO_REGEX = /\.\d{3,}/;

const BASE_DIMENSIONS = {
  length: 100,
  width: 50,
  height: 100,
  thickness: 0.5,
  bleedSize: 3,
};

describe('generateTuckEndBox', () => {
  it('computes exact totalWidth and totalHeight in millimeters for known dimensions', () => {
    const dieline = generateTuckEndBox(BASE_DIMENSIONS);

    // glueWidth(15) + 2*(100+0.5) + 2*(50+0.5) = 317 mm
    expect(dieline.totalWidth).toBe(317);
    // closureTop(50.5+15) + body(100+0.5) + closureBot(50.5+15) = 231.5 mm
    expect(dieline.totalHeight).toBe(231.5);
    expect(dieline.unit).toBe('mm');
    expect(dieline.archetype).toBe('tuck-end');
  });

  it('produces exactly 11 faces (4 walls + 1 glue tab + 6 flaps)', () => {
    const dieline = generateTuckEndBox(BASE_DIMENSIONS);

    expect(dieline.faces).toHaveLength(11);

    const ids = new Set(dieline.faces.map((face) => face.id));
    expect(ids).toEqual(
      new Set([
        'front',
        'right',
        'back',
        'left',
        'glue-tab',
        'top-dust-left',
        'top-dust-right',
        'top-tuck',
        'bottom-dust-left',
        'bottom-dust-right',
        'bottom-tuck',
      ]),
    );
  });

  it('produces non-empty cuts, folds, bleeds, and foldGroups', () => {
    const dieline = generateTuckEndBox(BASE_DIMENSIONS);

    expect(dieline.cuts.length).toBeGreaterThan(0);
    expect(dieline.folds.length).toBeGreaterThan(0);
    expect(dieline.bleeds.length).toBeGreaterThan(0);
    expect(dieline.foldGroups.length).toBeGreaterThan(0);
  });

  it('generates valid SVG path characters with at most 2 decimal places', () => {
    const dieline = generateTuckEndBox({
      length: 73.333,
      width: 41.666,
      height: 111.111,
      thickness: 0.45,
      bleedSize: 2.5,
    });

    const allPaths = [
      ...dieline.faces.map((face) => face.path),
      ...dieline.cuts.map((cut) => cut.path),
      ...dieline.bleeds.map((bleed) => bleed.path),
    ];

    for (const path of allPaths) {
      expect(path).toMatch(VALID_SVG_PATH_REGEX);
      expect(path).not.toMatch(DECIMAL_OVER_TWO_REGEX);
      expect(path.startsWith('M ')).toBe(true);
      expect(path.endsWith(' Z')).toBe(true);
    }
  });

  it('ensures every Face.folds, Face.adjacentFaces, and FoldGroup reference exists', () => {
    const dieline = generateTuckEndBox(BASE_DIMENSIONS);

    const foldIds = new Set(dieline.folds.map((fold) => fold.id));
    const faceIds = new Set(dieline.faces.map((face) => face.id));

    for (const face of dieline.faces) {
      expect(face.folds.length).toBeGreaterThan(0);
      for (const foldId of face.folds) {
        expect(foldIds.has(foldId)).toBe(true);
      }
      for (const adjId of face.adjacentFaces) {
        expect(faceIds.has(adjId)).toBe(true);
      }
    }

    for (const group of dieline.foldGroups) {
      expect(foldIds.has(group.pivotFoldId)).toBe(true);
      expect(group.faceIds.length).toBeGreaterThan(0);
      for (const faceId of group.faceIds) {
        expect(faceIds.has(faceId)).toBe(true);
      }
    }
  });

  it('scales cleanly for compact sizes and rejects non-positive or non-finite dimensions', () => {
    const compact = generateTuckEndBox({
      length: 24,
      width: 18,
      height: 30,
      thickness: 0.3,
      bleedSize: 0,
    });

    expect(compact.totalWidth).toBeGreaterThan(0);
    expect(compact.totalHeight).toBeGreaterThan(0);
    expect(compact.faces).toHaveLength(11);
    expect(compact.bleeds).toHaveLength(1);

    expect(() => generateTuckEndBox({ ...BASE_DIMENSIONS, length: 0 })).toThrow(RangeError);
    expect(() => generateTuckEndBox({ ...BASE_DIMENSIONS, thickness: -0.5 })).toThrow(RangeError);
    expect(() => generateTuckEndBox({ ...BASE_DIMENSIONS, bleedSize: Number.NaN })).toThrow(
      RangeError,
    );
  });
});
