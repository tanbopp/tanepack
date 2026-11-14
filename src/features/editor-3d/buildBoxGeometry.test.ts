// Unit tests for procedural 3D shape conversion and forward-kinematics box folding
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { generateTuckEndBox } from '@entities/dieline';
import {
  buildBoxGeometry,
  createRadialShadowTexture,
  DIELINE_SCALE_TO_3D,
  type KinematicBoxNode,
  parseSvgPathToShape,
} from './buildBoxGeometry';

const SAMPLE_DIMENSIONS = {
  length: 100,
  width: 50,
  height: 100,
  thickness: 0.5,
  bleedSize: 3,
};

function computeFaceWorldBounds(
  root: KinematicBoxNode,
  foldAngleDeg: number,
): Map<string, THREE.Box3> {
  const result = new Map<string, THREE.Box3>();

  const buildSceneGroup = (node: KinematicBoxNode): THREE.Group => {
    const group = new THREE.Group();
    group.name = node.id;
    group.position.set(node.position[0], node.position[1], node.position[2]);

    const [minDeg, maxDeg] = node.animatedAngleRange;
    const clampedDeg = Math.min(maxDeg, Math.max(minDeg, foldAngleDeg));
    const rad = THREE.MathUtils.degToRad(clampedDeg) * node.rotationSign;
    if (node.rotationAxis === 'x') {
      group.rotation.x = rad;
    } else if (node.rotationAxis === 'z') {
      group.rotation.z = rad;
    }

    for (const face of node.faces) {
      const mesh = new THREE.Mesh(face.geometry);
      mesh.name = face.faceId;
      group.add(mesh);
    }

    for (const child of node.children) {
      group.add(buildSceneGroup(child));
    }

    return group;
  };

  const sceneRoot = buildSceneGroup(root);
  sceneRoot.updateMatrixWorld(true);

  sceneRoot.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name) {
      const box = new THREE.Box3().setFromObject(obj);
      result.set(obj.name, box);
    }
  });

  return result;
}

describe('buildBoxGeometry', () => {
  it('parses SVG M/L/Q/Z paths into Three.Shape with millimeter bounds', () => {
    const { shape, boundsMm } = parseSvgPathToShape(
      'M 0,10 Q 0,0 10,0 L 50,0 Q 60,0 60,10 L 60,40 L 0,40 Z',
      { x: 30, y: 20 },
    );

    expect(boundsMm.minX).toBe(0);
    expect(boundsMm.maxX).toBe(60);
    expect(boundsMm.minY).toBe(0);
    expect(boundsMm.maxY).toBe(40);
    expect(boundsMm.center).toEqual({ x: 30, y: 20 });
    expect(shape.getPoints(4).length).toBeGreaterThan(4);
  });

  it('constructs the full 11-face hierarchical kinematic tree scaled by 0.01', () => {
    const dieline = generateTuckEndBox(SAMPLE_DIMENSIONS);
    const model = buildBoxGeometry(dieline);

    expect(model.shadowExtent.width).toBeCloseTo(317 * DIELINE_SCALE_TO_3D, 6);
    expect(model.shadowExtent.depth).toBeCloseTo(231.5 * DIELINE_SCALE_TO_3D, 6);

    const visitedFaces: string[] = [];
    const collect = (node: KinematicBoxNode) => {
      for (const face of node.faces) {
        visitedFaces.push(face.faceId);
        expect(face.geometry.attributes.position?.count).toBeGreaterThan(0);
      }
      for (const child of node.children) {
        collect(child);
      }
    };
    collect(model.root);

    const primaryFaces = visitedFaces.filter((id) => !id.endsWith('-tongue'));
    expect(primaryFaces).toHaveLength(11);
    expect(new Set(primaryFaces)).toHaveLength(11);
    expect(visitedFaces).toContain('top-tuck-tongue');
    expect(visitedFaces).toContain('bottom-tuck-tongue');

    expect(model.root.faces.map((f) => f.faceId)).toEqual(['front']);
    expect(model.root.children.map((c) => c.id)).toEqual([
      'group-left-wall',
      'group-right-wall',
      'group-bottom-tuck',
    ]);

    const rightWall = model.root.children.find((c) => c.id === 'group-right-wall');
    expect(rightWall?.children.map((c) => c.id)).toContain('group-back-wall');
    const backWall = rightWall?.children.find((c) => c.id === 'group-back-wall');
    expect(backWall?.children.map((c) => c.id)).toEqual(['group-top-tuck']);
    const topTuckNode = backWall?.children.find((c) => c.id === 'group-top-tuck');
    expect(topTuckNode?.children.map((c) => c.id)).toEqual(['group-top-tuck-tongue']);

    model.dispose();
  });

  it('lies completely flat on Y=0 at foldAngle=0 and folds cleanly upward into a box at foldAngle=90', () => {
    const dieline = generateTuckEndBox(SAMPLE_DIMENSIONS);
    const model = buildBoxGeometry(dieline);

    // At 0°: entire carton lies flat on horizontal floor plane Y = 0
    const flatBounds = computeFaceWorldBounds(model.root, 0);
    expect(flatBounds.size).toBe(13);
    for (const box of flatBounds.values()) {
      expect(box.min.y).toBeCloseTo(0, 5);
      expect(box.max.y).toBeCloseTo(0, 5);
    }

    // At 90°: Front stays on Y=0, walls rise to +0.505, Back closes overhead at Y=+0.505,
    // and both tuck tongues fold cleanly inward inside the closed carton bounds
    const foldedBounds = computeFaceWorldBounds(model.root, 90);
    const front = foldedBounds.get('front')!;
    const left = foldedBounds.get('left')!;
    const right = foldedBounds.get('right')!;
    const back = foldedBounds.get('back')!;
    const glueTab = foldedBounds.get('glue-tab')!;
    const topTuck = foldedBounds.get('top-tuck')!;
    const bottomTuck = foldedBounds.get('bottom-tuck')!;
    const topTuckTongue = foldedBounds.get('top-tuck-tongue')!;
    const bottomTuckTongue = foldedBounds.get('bottom-tuck-tongue')!;

    // All 13 parts remain strictly within closed carton bounds Y ∈ [0, 0.505]
    for (const box of foldedBounds.values()) {
      expect(box.min.y).toBeGreaterThanOrEqual(-1e-4);
      expect(box.max.y).toBeLessThanOrEqual(0.505 + 1e-4);
    }

    // Top tuck tongue folds inward at Y = 0 (+Z interior), bottom tuck tongue at Y = 0.505 (-Z interior)
    expect(topTuckTongue.min.y).toBeCloseTo(0, 4);
    expect(topTuckTongue.max.y).toBeCloseTo(0, 4);
    expect(topTuckTongue.min.z).toBeCloseTo(-0.5025, 4);
    expect(topTuckTongue.max.z).toBeCloseTo(-0.3525, 4);

    expect(bottomTuckTongue.min.y).toBeCloseTo(0.505, 4);
    expect(bottomTuckTongue.max.y).toBeCloseTo(0.505, 4);
    expect(bottomTuckTongue.min.z).toBeCloseTo(0.3525, 4);
    expect(bottomTuckTongue.max.z).toBeCloseTo(0.5025, 4);

    expect(front.min.y).toBeCloseTo(0, 4);
    expect(front.max.y).toBeCloseTo(0, 4);

    // Left & Right stand vertically at x = ±0.5025 reaching height y = 0.505
    expect(left.min.x).toBeCloseTo(-0.5025, 4);
    expect(left.max.x).toBeCloseTo(-0.5025, 4);
    expect(left.max.y).toBeCloseTo(0.505, 4);

    expect(right.min.x).toBeCloseTo(0.5025, 4);
    expect(right.max.x).toBeCloseTo(0.5025, 4);
    expect(right.max.y).toBeCloseTo(0.505, 4);

    // Back spans overhead across X ∈ [-0.5025, +0.5025] at Y = 0.505
    expect(back.min.y).toBeCloseTo(0.505, 4);
    expect(back.max.y).toBeCloseTo(0.505, 4);
    expect(back.min.x).toBeCloseTo(-0.5025, 4);
    expect(back.max.x).toBeCloseTo(0.5025, 4);

    // Glue tab folds inward across top at Y = 0.505 overlapping left edge of Back
    expect(glueTab.min.y).toBeCloseTo(0.505, 4);
    expect(glueTab.min.x).toBeCloseTo(-0.5025, 4);
    expect(glueTab.max.x).toBeGreaterThan(-0.4);

    // Top Tuck and Bottom Tuck seal Z = -0.5025 and Z = +0.5025 across Y ∈ [0, 0.505]
    expect(topTuck.min.z).toBeCloseTo(-0.5025, 4);
    expect(topTuck.max.z).toBeCloseTo(-0.5025, 4);
    expect(topTuck.min.y).toBeCloseTo(0, 4);
    expect(topTuck.max.y).toBeCloseTo(0.505, 4);

    expect(bottomTuck.min.z).toBeCloseTo(0.5025, 4);
    expect(bottomTuck.max.z).toBeCloseTo(0.5025, 4);
    expect(bottomTuck.min.y).toBeCloseTo(0, 4);
    expect(bottomTuck.max.y).toBeCloseTo(0.505, 4);

    model.dispose();
  });

  it('creates a lightweight 64x64 RGBA DataTexture with soft radial alpha falloff', () => {
    const texture = createRadialShadowTexture(64);
    expect(texture.image.width).toBe(64);
    expect(texture.image.height).toBe(64);
    const bytes = texture.image.data as Uint8Array;
    expect(bytes.length).toBe(64 * 64 * 4);
    // Corner pixel is outside unit disk -> alpha 0; center pixel -> alpha > 0
    expect(bytes[3]).toBe(0);
    const centerOffset = (32 * 64 + 32) * 4;
    expect(bytes[centerOffset + 3]).toBeGreaterThan(40);
    texture.dispose();
  });
});
