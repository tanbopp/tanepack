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

export type DielineArchetype =
  | 'tuck-end'
  | 'fefco-0200'
  | 'fefco-0201'
  | 'fefco-0202'
  | 'fefco-0203'
  | 'fefco-0204'
  | 'fefco-0205'
  | 'fefco-0206'
  | 'fefco-0209'
  | 'fefco-0215';

/** Supported top/bottom flap architectures in the parametric FEFCO engine. */
export type FefcoFlapType = 'none' | 'rsc' | 'full' | 'extended' | 'custom' | 'tuck' | 'crash-lock';

/** Reference box dimension axis used as the multiplier basis for flap heights. */
export type FefcoAxisBasis = 'W' | 'L';

/** Parametric flap height multipliers relative to box Depth (`W`) or Length (`L`). */
export interface FefcoFlapMath {
  topOuter: number;
  bottomOuter: number;
  inner: number;
  topOuterBasis?: FefcoAxisBasis | undefined;
  bottomOuterBasis?: FefcoAxisBasis | undefined;
  innerBasis?: FefcoAxisBasis | undefined;
  topInner?: number | undefined;
  bottomInner?: number | undefined;
}

/** Panel body perforation/slot variation style for FEFCO cartons. */
export type FefcoPanelStyle = 'standard' | 'dz' | 'perforated';

/** Declarative specification driving the parametric FEFCO box factory. */
export interface FefcoConfig {
  id: DielineArchetype;
  name: string;
  topFlapType?: FefcoFlapType | undefined;
  bottomFlapType?: FefcoFlapType | undefined;
  flapConfig?:
    | {
        top: FefcoFlapType;
        bottom: FefcoFlapType;
      }
    | undefined;
  flapMath?: FefcoFlapMath | undefined;
  hasGlueTab?: boolean | undefined;
  panelStyle?: FefcoPanelStyle | undefined;
}

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
  /** Optional local-Y layer offset direction (-1 = outward default, 1 = inward above base floor). */
  layerOffsetDirection?: 1 | -1 | undefined;
  /** Optional continuous physical stacking multiplier overriding `layerOrder` for thickness clearance. */
  layerOffsetTier?: number | undefined;
}

export interface Dieline {
  archetype: DielineArchetype;
  /** ID of the stationary floor/root face resting on Y = 0 in 3D kinematics. */
  baseFaceId: string;
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
