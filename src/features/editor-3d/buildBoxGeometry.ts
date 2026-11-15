// Pure procedural Three.js geometry and kinematic hierarchy builder from Dieline JSON
import * as THREE from 'three';
import type { Dieline, Face, Fold, FoldGroup, Point } from '@entities/dieline/types';

export const DIELINE_SCALE_TO_3D = 0.01;

export type FoldRotationAxis = 'x' | 'z';

export interface FaceBoundsMm {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  center: Point;
}

export interface KinematicFacePart {
  faceId: string;
  sourceFaceId: string;
  name: string;
  geometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
  boundsMm: FaceBoundsMm;
  isInnerLayer: boolean;
  layerOrder: number;
}

export interface KinematicBoxNode {
  id: string;
  name: string;
  position: [number, number, number];
  pivotMm: Point;
  rotationAxis: FoldRotationAxis | null;
  rotationSign: 1 | -1;
  animatedAngleRange: [number, number];
  foldStage: [number, number];
  layerOrder: number | null;
  layerOffsetWorld: number;
  faces: KinematicFacePart[];
  children: KinematicBoxNode[];
}

/** Computes the staged target angle in degrees and normalized stage progress [0, 1] for a kinematic fold node. */
export function computeNodeTargetAngleDeg(
  node: Pick<KinematicBoxNode, 'animatedAngleRange' | 'foldStage'>,
  foldAngle: number,
): { targetDeg: number; progress: number } {
  const [minDeg, maxDeg] = node.animatedAngleRange;
  const [stageStart, stageEnd] = node.foldStage;
  const stageSpan = stageEnd - stageStart;

  if (stageSpan <= 1e-6) {
    const targetDeg = Math.min(maxDeg, Math.max(minDeg, foldAngle));
    const angleSpan = maxDeg - minDeg;
    return {
      targetDeg,
      progress: angleSpan > 1e-6 ? Math.min(1, Math.max(0, (targetDeg - minDeg) / angleSpan)) : 0,
    };
  }

  const progress = Math.min(1, Math.max(0, (foldAngle - stageStart) / stageSpan));
  const targetDeg = minDeg + (maxDeg - minDeg) * progress;
  return { targetDeg, progress };
}

export interface KinematicBoxModel {
  root: KinematicBoxNode;
  shadowExtent: { width: number; depth: number };
  dispose: () => void;
}

type SvgToken = { type: 'cmd'; value: string } | { type: 'num'; value: number };

const TOKEN_REGEX = /([MLQZmlqz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/gi;

function tokenizeSvgPath(path: string): SvgToken[] {
  const tokens: SvgToken[] = [];
  for (const match of path.matchAll(TOKEN_REGEX)) {
    const cmd = match[1];
    const num = match[2];
    if (cmd) {
      tokens.push({ type: 'cmd', value: cmd });
    } else if (num) {
      tokens.push({ type: 'num', value: Number(num) });
    }
  }
  return tokens;
}

/**
 * Parses an SVG path string containing M, L, Q, Z commands in millimeters into
 * a THREE.Shape whose coordinates live relative to `pivotMm` and scaled by 0.01.
 */
export function parseSvgPathToShape(
  path: string,
  pivotMm: Point,
): { shape: THREE.Shape; boundsMm: FaceBoundsMm } {
  const tokens = tokenizeSvgPath(path);
  const shape = new THREE.Shape();

  let index = 0;
  let cmd = '';
  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const trackPoint = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  const toShapeU = (xMm: number) => (xMm - pivotMm.x) * DIELINE_SCALE_TO_3D;
  // Negate Y so ShapeGeometry.rotateX(-PI/2) aligns local Z with 2D SVG downward Y
  const toShapeV = (yMm: number) => -(yMm - pivotMm.y) * DIELINE_SCALE_TO_3D;

  const nextNum = (): number => {
    const token = tokens[index];
    if (!token || token.type !== 'num') {
      throw new Error(`Expected numeric SVG coordinate in path "${path}".`);
    }
    index += 1;
    return token.value;
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (!token) {
      break;
    }

    if (token.type === 'cmd') {
      cmd = token.value;
      index += 1;

      if (cmd === 'Z' || cmd === 'z') {
        shape.closePath();
        curX = startX;
        curY = startY;
      }
      continue;
    }

    switch (cmd) {
      case 'M':
      case 'm': {
        const rawX = nextNum();
        const rawY = nextNum();
        curX = cmd === 'm' ? curX + rawX : rawX;
        curY = cmd === 'm' ? curY + rawY : rawY;
        startX = curX;
        startY = curY;
        trackPoint(curX, curY);
        shape.moveTo(toShapeU(curX), toShapeV(curY));
        // SVG treats subsequent coordinate pairs after M/m as L/l
        cmd = cmd === 'm' ? 'l' : 'L';
        break;
      }
      case 'L':
      case 'l': {
        const rawX = nextNum();
        const rawY = nextNum();
        curX = cmd === 'l' ? curX + rawX : rawX;
        curY = cmd === 'l' ? curY + rawY : rawY;
        trackPoint(curX, curY);
        shape.lineTo(toShapeU(curX), toShapeV(curY));
        break;
      }
      case 'Q':
      case 'q': {
        const rawCx = nextNum();
        const rawCy = nextNum();
        const rawX = nextNum();
        const rawY = nextNum();
        const cx = cmd === 'q' ? curX + rawCx : rawCx;
        const cy = cmd === 'q' ? curY + rawCy : rawCy;
        curX = cmd === 'q' ? curX + rawX : rawX;
        curY = cmd === 'q' ? curY + rawY : rawY;
        trackPoint(cx, cy);
        trackPoint(curX, curY);
        shape.quadraticCurveTo(toShapeU(cx), toShapeV(cy), toShapeU(curX), toShapeV(curY));
        break;
      }
      default: {
        throw new Error(`Unsupported SVG command "${cmd}" in path "${path}".`);
      }
    }
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  return {
    shape,
    boundsMm: {
      minX,
      minY,
      maxX,
      maxY,
      center: {
        x: (minX + maxX) * 0.5,
        y: (minY + maxY) * 0.5,
      },
    },
  };
}

function createShapeFromMmPolygon(
  pointsMm: Point[],
  pivotMm: Point,
): {
  shape: THREE.Shape;
  boundsMm: FaceBoundsMm;
} {
  const shape = new THREE.Shape();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < pointsMm.length; i += 1) {
    const pt = pointsMm[i];
    if (!pt) {
      continue;
    }
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;

    const u = (pt.x - pivotMm.x) * DIELINE_SCALE_TO_3D;
    const v = -(pt.y - pivotMm.y) * DIELINE_SCALE_TO_3D;
    if (i === 0) {
      shape.moveTo(u, v);
    } else {
      shape.lineTo(u, v);
    }
  }
  shape.closePath();

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  return {
    shape,
    boundsMm: {
      minX,
      minY,
      maxX,
      maxY,
      center: {
        x: (minX + maxX) * 0.5,
        y: (minY + maxY) * 0.5,
      },
    },
  };
}

/** Sutherland-Hodgman polygon clip against a horizontal fold line `y = splitY`. */
function clipPolygonByHorizontalLine(
  polygon: Point[],
  splitY: number,
  keepBelow: boolean,
): Point[] {
  if (polygon.length < 3) {
    return [];
  }

  const isInside = (p: Point) => (keepBelow ? p.y >= splitY - 1e-6 : p.y <= splitY + 1e-6);
  const intersect = (a: Point, b: Point): Point => {
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-9) {
      return { x: b.x, y: splitY };
    }
    const t = (splitY - a.y) / dy;
    return {
      x: a.x + (b.x - a.x) * t,
      y: splitY,
    };
  };

  const output: Point[] = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const prev = polygon[(i + polygon.length - 1) % polygon.length];
    if (!current || !prev) {
      continue;
    }
    const currIn = isInside(current);
    const prevIn = isInside(prev);

    if (currIn) {
      if (!prevIn) {
        output.push(intersect(prev, current));
      }
      output.push(current);
    } else if (prevIn) {
      output.push(intersect(prev, current));
    }
  }

  return output;
}

function applyNormalizedFaceUvs(
  geometry: THREE.BufferGeometry,
  pivotMm: Point,
  uvBoundsMm: FaceBoundsMm,
): void {
  const positionAttr = geometry.getAttribute('position');
  if (!(positionAttr instanceof THREE.BufferAttribute)) {
    return;
  }

  const spanX = Math.max(1e-6, uvBoundsMm.maxX - uvBoundsMm.minX);
  const spanY = Math.max(1e-6, uvBoundsMm.maxY - uvBoundsMm.minY);
  const uvArray = new Float32Array(positionAttr.count * 2);

  for (let i = 0; i < positionAttr.count; i += 1) {
    const xMm = pivotMm.x + positionAttr.getX(i) / DIELINE_SCALE_TO_3D;
    const yMm = pivotMm.y + positionAttr.getZ(i) / DIELINE_SCALE_TO_3D;
    const u = Math.min(1, Math.max(0, (xMm - uvBoundsMm.minX) / spanX));
    // CanvasTexture uses flipY = true by default, so SVG minY maps to canvas top (v = 1)
    const v = Math.min(1, Math.max(0, 1 - (yMm - uvBoundsMm.minY) / spanY));
    uvArray[i * 2] = u;
    uvArray[i * 2 + 1] = v;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
}

function buildGeometryPartFromShape(
  faceId: string,
  sourceFaceId: string,
  name: string,
  shape: THREE.Shape,
  boundsMm: FaceBoundsMm,
  pivotMm: Point,
  uvBoundsMm: FaceBoundsMm,
  layerOrder: number,
): KinematicFacePart {
  const geometry = new THREE.ShapeGeometry(shape, 8);
  geometry.rotateX(-Math.PI / 2);
  applyNormalizedFaceUvs(geometry, pivotMm, uvBoundsMm);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const edgeGeometry = new THREE.EdgesGeometry(geometry, 1);

  return {
    faceId,
    sourceFaceId,
    name,
    geometry,
    edgeGeometry,
    boundsMm,
    isInnerLayer: layerOrder === 0,
    layerOrder,
  };
}

function createFaceGeometryPart(
  face: Face,
  pivotMm: Point,
  explicitLayerOrder?: number,
): KinematicFacePart {
  const { shape, boundsMm } = parseSvgPathToShape(face.path, pivotMm);
  const defaultInner =
    face.id === 'glue-tab' || face.id.includes('dust') || face.id.includes('inner');
  const layerOrder = explicitLayerOrder ?? (defaultInner ? 0 : 1);
  return buildGeometryPartFromShape(
    face.id,
    face.id,
    face.name,
    shape,
    boundsMm,
    pivotMm,
    boundsMm,
    layerOrder,
  );
}

/** Sample face SVG path vertices in raw 2D millimeter coordinates (preserving Q curve detail). */
function sampleFacePolygonMm(facePath: string): Point[] {
  const { shape } = parseSvgPathToShape(facePath, { x: 0, y: 0 });
  const rawPoints = shape.getPoints(8);
  return rawPoints.map((vec) => ({
    x: vec.x / DIELINE_SCALE_TO_3D,
    y: -vec.y / DIELINE_SCALE_TO_3D,
  }));
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
  };
}

function computeRotationRule(
  fold: Fold,
  pivotMm: Point,
  faceCenterMm: Point,
): { axis: FoldRotationAxis; sign: 1 | -1 } {
  const edgeDx = Math.abs(fold.to.x - fold.from.x);
  const edgeDy = Math.abs(fold.to.y - fold.from.y);

  // Vertical fold lines run along Z in 3D space (pivot rotates around Z axis)
  if (edgeDy > edgeDx) {
    const relX = faceCenterMm.x - pivotMm.x;
    return {
      axis: 'z',
      sign: relX >= 0 ? 1 : -1,
    };
  }

  // Horizontal fold lines run along X in 3D space (pivot rotates around X axis)
  const relY = faceCenterMm.y - pivotMm.y;
  return {
    axis: 'x',
    sign: relY < 0 ? 1 : -1,
  };
}

function isStrictSubset(candidate: Set<string>, superset: Set<string>): boolean {
  if (candidate.size >= superset.size) {
    return false;
  }
  for (const item of candidate) {
    if (!superset.has(item)) {
      return false;
    }
  }
  return true;
}

/**
 * Builds the procedural Three.js geometry hierarchy and exact fold-line pivots
 * directly from a parametric Dieline object.
 */
export function buildBoxGeometry(dieline: Dieline): KinematicBoxModel {
  const faceMap = new Map<string, Face>(dieline.faces.map((face) => [face.id, face]));
  const foldMap = new Map<string, Fold>(dieline.folds.map((fold) => [fold.id, fold]));
  const faceBoundsMap = new Map<string, FaceBoundsMm>();

  for (const face of dieline.faces) {
    const parsed = parseSvgPathToShape(face.path, { x: 0, y: 0 });
    faceBoundsMap.set(face.id, parsed.boundsMm);
  }

  // Anchor explicitly declared baseFaceId (fallback to first ungrouped face) stationary at Y = 0
  const groupedFaceIds = new Set<string>();
  for (const group of dieline.foldGroups) {
    for (const faceId of group.faceIds) {
      groupedFaceIds.add(faceId);
    }
  }

  const ungroupedFaces = dieline.faces.filter((face) => !groupedFaceIds.has(face.id));
  const explicitBaseFace = dieline.baseFaceId ? faceMap.get(dieline.baseFaceId) : undefined;
  const primaryRootFace = explicitBaseFace ?? ungroupedFaces[0] ?? dieline.faces[0];
  if (!primaryRootFace) {
    throw new Error('Dieline contains no faces to construct 3D geometry.');
  }

  const rootFaces = ungroupedFaces.some((f) => f.id === primaryRootFace.id)
    ? [primaryRootFace, ...ungroupedFaces.filter((f) => f.id !== primaryRootFace.id)]
    : [primaryRootFace];

  const rootBounds = faceBoundsMap.get(primaryRootFace.id);
  const rootPivotMm: Point = rootBounds?.center ?? {
    x: dieline.totalWidth * 0.5,
    y: dieline.totalHeight * 0.5,
  };

  // Build parent pointers by smallest strict superset on FoldGroup.faceIds
  const groupFaceSets = new Map<string, Set<string>>(
    dieline.foldGroups.map((group) => [group.id, new Set(group.faceIds)]),
  );
  const parentGroupIdMap = new Map<string, string | null>();
  const childGroupIdsMap = new Map<string, string[]>();
  const rootChildGroupIds: string[] = [];

  for (const group of dieline.foldGroups) {
    childGroupIdsMap.set(group.id, []);
  }

  for (const group of dieline.foldGroups) {
    const groupSet = groupFaceSets.get(group.id);
    if (!groupSet) {
      continue;
    }

    let bestParent: FoldGroup | null = null;
    for (const candidate of dieline.foldGroups) {
      if (candidate.id === group.id) {
        continue;
      }
      const candidateSet = groupFaceSets.get(candidate.id);
      if (candidateSet && isStrictSubset(groupSet, candidateSet)) {
        if (!bestParent || candidate.faceIds.length < bestParent.faceIds.length) {
          bestParent = candidate;
        }
      }
    }

    const parentId = bestParent?.id ?? null;
    parentGroupIdMap.set(group.id, parentId);
    if (parentId === null) {
      rootChildGroupIds.push(group.id);
    } else {
      childGroupIdsMap.get(parentId)?.push(group.id);
    }
  }

  const groupMap = new Map<string, FoldGroup>(dieline.foldGroups.map((g) => [g.id, g]));
  const createdParts: KinematicFacePart[] = [];
  const thicknessStepWorld = Math.max(0.5, dieline.dimensions.thickness) * DIELINE_SCALE_TO_3D;

  const buildNode = (groupId: string, parentPivotMm: Point): KinematicBoxNode => {
    const group = groupMap.get(groupId);
    if (!group) {
      throw new Error(`Missing FoldGroup "${groupId}".`);
    }

    const fold = foldMap.get(group.pivotFoldId);
    if (!fold) {
      throw new Error(`Missing pivot Fold "${group.pivotFoldId}" for FoldGroup "${group.id}".`);
    }

    const pivotMm = midpoint(fold.from, fold.to);
    const position: [number, number, number] = [
      (pivotMm.x - parentPivotMm.x) * DIELINE_SCALE_TO_3D,
      0,
      (pivotMm.y - parentPivotMm.y) * DIELINE_SCALE_TO_3D,
    ];

    const childIds = childGroupIdsMap.get(group.id) ?? [];
    const childCoveredFaceIds = new Set<string>();
    for (const childId of childIds) {
      const childSet = groupFaceSets.get(childId);
      if (childSet) {
        for (const faceId of childSet) {
          childCoveredFaceIds.add(faceId);
        }
      }
    }

    const directFaceIds = group.faceIds.filter((faceId) => !childCoveredFaceIds.has(faceId));
    const directFaces: KinematicFacePart[] = [];
    const extraChildren: KinematicBoxNode[] = [];

    const foldStage: [number, number] = group.foldStage ?? [0, 90];
    const layerOrder = group.layerOrder ?? null;
    const layerOffsetDirection = group.layerOffsetDirection ?? -1;
    const rawTier =
      group.layerOffsetTier ?? (layerOrder !== null && layerOrder > 0 ? layerOrder : 0);
    // BoxViewer translates child faces along local -Y * progress; invert sign when stepping inward (+1)
    const layerOffsetWorld = rawTier > 0 ? -layerOffsetDirection * rawTier * thicknessStepWorld : 0;

    for (const faceId of directFaceIds) {
      const face = faceMap.get(faceId);
      if (!face) {
        continue;
      }

      // Check for an internal horizontal crease inside tuck closures so tongues tuck 90° inward
      const faceBounds = faceBoundsMap.get(face.id);
      const internalHorizontalFold = face.folds
        .filter((fId) => fId !== group.pivotFoldId)
        .map((fId) => foldMap.get(fId))
        .find((candidate): candidate is Fold =>
          Boolean(
            candidate &&
            Math.abs(candidate.from.y - candidate.to.y) < 0.01 &&
            faceBounds &&
            candidate.from.y > faceBounds.minY + 1 &&
            candidate.from.y < faceBounds.maxY - 1,
          ),
        );

      if (internalHorizontalFold && faceBounds) {
        const splitY = internalHorizontalFold.from.y;
        const polygonMm = sampleFacePolygonMm(face.path);
        const keepLidBelow = pivotMm.y <= splitY;
        const lidPoly = clipPolygonByHorizontalLine(polygonMm, splitY, !keepLidBelow);
        const tonguePoly = clipPolygonByHorizontalLine(polygonMm, splitY, keepLidBelow);

        if (lidPoly.length >= 3 && tonguePoly.length >= 3) {
          const lidShapeData = createShapeFromMmPolygon(lidPoly, pivotMm);
          const lidPart = buildGeometryPartFromShape(
            face.id,
            face.id,
            face.name,
            lidShapeData.shape,
            lidShapeData.boundsMm,
            pivotMm,
            faceBounds,
            layerOrder ?? 1,
          );
          directFaces.push(lidPart);
          createdParts.push(lidPart);

          const tonguePivotMm = midpoint(internalHorizontalFold.from, internalHorizontalFold.to);
          const tongueShapeData = createShapeFromMmPolygon(tonguePoly, tonguePivotMm);
          const tonguePart = buildGeometryPartFromShape(
            `${face.id}-tongue`,
            face.id,
            `${face.name} Tongue`,
            tongueShapeData.shape,
            tongueShapeData.boundsMm,
            tonguePivotMm,
            faceBounds,
            0,
          );
          createdParts.push(tonguePart);

          const tongueRule = computeRotationRule(
            internalHorizontalFold,
            tonguePivotMm,
            tongueShapeData.boundsMm.center,
          );

          extraChildren.push({
            id: `${group.id}-tongue`,
            name: `${group.name} Tongue`,
            position: [
              (tonguePivotMm.x - pivotMm.x) * DIELINE_SCALE_TO_3D,
              0,
              (tonguePivotMm.y - pivotMm.y) * DIELINE_SCALE_TO_3D,
            ],
            pivotMm: tonguePivotMm,
            rotationAxis: tongueRule.axis,
            rotationSign: tongueRule.sign,
            animatedAngleRange: group.animatedAngleRange,
            foldStage,
            layerOrder: 0,
            layerOffsetWorld: 0,
            faces: [tonguePart],
            children: [],
          });
          continue;
        }
      }

      const part = createFaceGeometryPart(face, pivotMm, layerOrder ?? undefined);
      directFaces.push(part);
      createdParts.push(part);
    }

    const referenceCenter =
      directFaces[0]?.boundsMm.center ??
      faceBoundsMap.get(group.faceIds[0] ?? '')?.center ??
      pivotMm;
    const { axis, sign } = computeRotationRule(fold, pivotMm, referenceCenter);

    return {
      id: group.id,
      name: group.name,
      position,
      pivotMm,
      rotationAxis: axis,
      rotationSign: sign,
      animatedAngleRange: group.animatedAngleRange,
      foldStage,
      layerOrder,
      layerOffsetWorld,
      faces: directFaces,
      children: [...childIds.map((childId) => buildNode(childId, pivotMm)), ...extraChildren],
    };
  };

  const rootDirectParts = rootFaces.map((face) => {
    const part = createFaceGeometryPart(face, rootPivotMm);
    createdParts.push(part);
    return part;
  });

  const root: KinematicBoxNode = {
    id: `root-${primaryRootFace.id}`,
    name: primaryRootFace.name,
    position: [0, 0, 0],
    pivotMm: rootPivotMm,
    rotationAxis: null,
    rotationSign: 1,
    animatedAngleRange: [0, 0],
    foldStage: [0, 90],
    layerOrder: null,
    layerOffsetWorld: 0,
    faces: rootDirectParts,
    children: rootChildGroupIds.map((groupId) => buildNode(groupId, rootPivotMm)),
  };

  const shadowExtent = {
    width: dieline.totalWidth * DIELINE_SCALE_TO_3D,
    depth: dieline.totalHeight * DIELINE_SCALE_TO_3D,
  };

  return {
    root,
    shadowExtent,
    dispose: () => {
      for (const part of createdParts) {
        part.geometry.dispose();
        part.edgeGeometry.dispose();
      }
    },
  };
}

/**
 * Builds a compact radial-gradient alpha DataTexture for fake floor contact shadows
 * without touching WebGL shadow maps or DOM 2D canvases.
 */
export function createRadialShadowTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const half = (size - 1) * 0.5;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x - half) / half;
      const ny = (y - half) / half;
      const r2 = nx * nx + ny * ny;
      const alpha = r2 >= 1 ? 0 : Math.round(Math.exp(-r2 * 4.2) * (1 - r2) * 72);

      const offset = (y * size + x) * 4;
      data[offset] = 35;
      data[offset + 1] = 28;
      data[offset + 2] = 20;
      data[offset + 3] = alpha;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}
