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
  | 'fefco-0207'
  | 'fefco-0208'
  | 'fefco-0209'
  | 'fefco-0210'
  | 'fefco-0211'
  | 'fefco-0212'
  | 'fefco-0214'
  | 'fefco-0215'
  | 'fefco-0216'
  | 'fefco-0217'
  | 'fefco-0218'
  | 'fefco-0219'
  | 'fefco-0220'
  | 'fefco-0221'
  | 'fefco-0222'
  | 'fefco-0225'
  | 'fefco-0226'
  | 'fefco-0227'
  | 'fefco-0228'
  | 'fefco-0229'
  | 'fefco-0229-1'
  | 'fefco-0230'
  | 'fefco-0231'
  | 'fefco-0232'
  | 'fefco-0233'
  | 'fefco-0233-1'
  | 'fefco-0240'
  | 'fefco-0241'
  | 'fefco-0242';

/** Supported top/bottom flap architectures in the parametric FEFCO engine. */
export type FefcoFlapType =
  'none' | 'rsc' | 'full' | 'extended' | 'custom' | 'tuck' | 'snap-lock' | 'crash-lock';

/** Panel column arrangement matching FEFCO PDF layouts. */
export type FefcoColumnLayout = 'L-W-L-W' | 'W-L-W-L' | 'offset-L' | 'offset-W' | 'wrap-0228';

/** Parametric end-closure profile presets measured from the FEFCO 0200 catalog. */
export type FefcoFlapEndPreset =
  | 'none'
  | 'rsc'
  | 'extended-55'
  | 'full-overlap'
  | 'center-special'
  | 'all-half-L'
  | 'center-special-full'
  | 'partition-207-bot'
  | 'partition-208'
  | 'reduced-25'
  | 'rett-c0'
  | 'rett-c2'
  | 'rim-flange-214'
  | 'tuck-lid-215-c0'
  | 'snap-lock'
  | 'handle-217-top'
  | 'lock-ear-218-top'
  | 'latch-219-top'
  | 'carrier-222-top'
  | 'lock-222-bot'
  | 'wrap-225-bot'
  | 'bellows-226'
  | 'gusset-227'
  | 'crease-v-229'
  | 'crease-v-229-1'
  | 'step-lock-232-bot'
  | 'rsc-44'
  | 'crash-lock-233'
  | 'crash-lock-233-1'
  | 'euroslot-240-top'
  | 'euroslot-241-top'
  | 'euroslot-242-top';

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
  /** Depth in mm of a Roll End / Tuck Top tongue (defaults to 20mm). */
  tuckDepth?: number | undefined;
  /** Optional custom SVG cut overlay appended directly to the cut list. */
  customFlapPaths?: string | undefined;
  /** Panel column sequence across the flat dieline blank. */
  columnLayout?: FefcoColumnLayout | undefined;
  /** Exact FEFCO profile presets for top and bottom closures. */
  flapPreset?:
    | {
        top: FefcoFlapEndPreset;
        bottom: FefcoFlapEndPreset;
      }
    | undefined;
  /** When true, inner dust flaps use their exact parametric ratio without `< L/2` clamping. */
  allowInnerOverlap?: boolean | undefined;
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
  /** Optional stacking tier override for articulated tuck tongues. */
  tongueLayerOrder?: number | undefined;
  /** Optional local-Y thickness offset (in mm) for articulated tuck tongues inside opposite walls. */
  tongueLayerOffsetMm?: number | undefined;
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
