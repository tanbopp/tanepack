// Unit tests verifying predefined local packaging templates, bounds, and vector-only constraints
import { describe, expect, it } from 'vitest';
import { computeSvgPathBoundsMm, generateTuckEndBox } from '@entities/dieline';
import { findTemplateById, TEMPLATES } from './mockTemplates';

describe('mockTemplates', () => {
  it('defines Coffee Box, Matcha Box, and Pastry Box with pure vector text and shapes (zero images)', () => {
    expect(TEMPLATES.map((tpl) => tpl.id)).toEqual(['coffee-box', 'matcha-box', 'pastry-box']);

    for (const template of TEMPLATES) {
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.thumbnailColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(template.elements.length).toBeGreaterThan(0);
      expect(template.elements.every((el) => el.type === 'text' || el.type === 'shape')).toBe(true);
    }
  });

  it('positions every template element strictly within its target face bounds for the template box dimensions', () => {
    for (const template of TEMPLATES) {
      const dieline = generateTuckEndBox({
        ...template.dimensions,
        thickness: 0.5,
        bleedSize: 3,
      });

      for (const element of template.elements) {
        const face = dieline.faces.find((candidate) => candidate.id === element.faceId);
        expect(face).toBeDefined();
        if (!face) {
          continue;
        }
        const bounds = computeSvgPathBoundsMm(face.path);
        expect(element.transform.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(element.transform.x).toBeLessThanOrEqual(bounds.maxX);
        expect(element.transform.y).toBeGreaterThanOrEqual(bounds.minY);
        expect(element.transform.y).toBeLessThanOrEqual(bounds.maxY);
      }
    }
  });

  it('includes expected Coffee Box, Matcha Box, and Pastry Box presets and lookup helper', () => {
    const coffee = findTemplateById('coffee-box');
    expect(coffee?.dimensions).toEqual({ length: 100, width: 50, height: 100 });
    expect(
      coffee?.elements.some((el) => el.type === 'text' && el.content === 'Tanepack Coffee'),
    ).toBe(true);
    expect(coffee?.elements.some((el) => el.type === 'shape' && el.shape === 'circle')).toBe(true);

    const matcha = findTemplateById('MATCHA-BOX');
    expect(matcha?.dimensions).toEqual({ length: 80, width: 80, height: 80 });
    expect(matcha?.elements.some((el) => el.type === 'text' && el.content === 'Matcha')).toBe(true);
    expect(
      matcha?.elements.some(
        (el) => el.type === 'shape' && el.shape === 'rect' && el.faceId === 'front',
      ),
    ).toBe(true);

    const pastry = findTemplateById('pastry-box');
    expect(pastry?.dimensions).toEqual({ length: 150, width: 100, height: 50 });
    expect(findTemplateById('unknown-preset')).toBeUndefined();
  });
});
