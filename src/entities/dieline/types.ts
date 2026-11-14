// Core parametric dieline domain types in ISO millimeter coordinates
export interface Point {
  x: number;
  y: number;
}

export type Unit = 'mm' | 'in' | 'dm' | 'cm';

export interface Cut {
  id: string;
  path: string;
}

export interface Fold {
  id: string;
  from: Point;
  to: Point;
  angle: number;
}

export interface Bleed {
  id: string;
  path: string;
}

export interface Face {
  id: string;
  name: string;
  path: string;
  folds: string[];
  adjacentFaces: string[];
}

export interface FoldGroup {
  id: string;
  name: string;
  faceIds: string[];
  pivotFoldId: string;
  animatedAngleRange: [number, number];
}

export interface Dieline {
  archetype: 'tuck-end' | 'mailer' | 'sleeve';
  dimensions: {
    length: number;
    width: number;
    height: number;
    thickness: number;
    bleedSize: number;
  };
  unit: Unit;
  totalWidth: number;
  totalHeight: number;
  faces: Face[];
  cuts: Cut[];
  folds: Fold[];
  bleeds: Bleed[];
  foldGroups: FoldGroup[];
}
