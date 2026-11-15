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

export type DielineArchetype = 'tuck-end' | 'fefco-0201' | 'fefco-0203';

export interface FoldGroup {
  id: string;
  name: string;
  faceIds: string[];
  pivotFoldId: string;
  animatedAngleRange: [number, number];
  /** Optional slider [startDeg, endDeg] window (defaults to [0, 90]) for sequential flap folding. */
  foldStage?: [number, number] | undefined;
  /** Optional stacking tier (0 = inner, 1+ = outer) used to separate overlapping flaps in 3D. */
  layerOrder?: number | undefined;
}

export interface Dieline {
  archetype: DielineArchetype;
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
