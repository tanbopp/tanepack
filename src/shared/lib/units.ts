// Physical unit conversion helpers centered on ISO millimeters at 96 DPI
export const PX_PER_MM = 3.7795275591;

export type PhysicalUnit = 'mm' | 'in' | 'dm' | 'cm';

const UNIT_IN_MM: Record<PhysicalUnit, number> = {
  mm: 1,
  cm: 10,
  dm: 100,
  in: 25.4,
};

export function mmToPx(mm: number, scale = 1): number {
  return mm * PX_PER_MM * scale;
}

export function pxToMm(px: number, scale = 1): number {
  return px / (PX_PER_MM * scale);
}

export function mmToUnit(mm: number, unit: PhysicalUnit): number {
  return mm / UNIT_IN_MM[unit];
}

export function unitToMm(value: number, unit: PhysicalUnit): number {
  return value * UNIT_IN_MM[unit];
}

/** Rounds a millimeter value to 2 decimal places max while avoiding -0. */
export function roundMm(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}
