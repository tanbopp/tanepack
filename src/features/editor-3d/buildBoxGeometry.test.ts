// Unit tests for procedural 3D shape conversion and forward-kinematics box folding
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  generateDieline,
  generateFefco0200,
  generateFefco0202,
  generateFefco0203,
  generateFefco0204,
  generateFefco0205,
  generateFefco0215,
  generateRsc,
  generateTuckEndBox,
} from '@entities/dieline';
import {
  buildBoxGeometry,
  computeNodeTargetAngleDeg,
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

    const { targetDeg, progress } = computeNodeTargetAngleDeg(node, foldAngleDeg);
    const rad = THREE.MathUtils.degToRad(targetDeg) * node.rotationSign;
    if (node.rotationAxis === 'x') {
      group.rotation.x = rad;
    } else if (node.rotationAxis === 'z') {
      group.rotation.z = rad;
    }

    const layerGroup = new THREE.Group();
    layerGroup.position.set(0, -node.layerOffsetWorld * progress, 0);
    for (const face of node.faces) {
      const mesh = new THREE.Mesh(face.geometry);
      mesh.name = face.faceId;
      layerGroup.add(mesh);
    }
    group.add(layerGroup);

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

  it('assigns normalized [0, 1] UVs matching millimeter face bounds and preserves sourceFaceId', () => {
    const dieline = generateTuckEndBox(SAMPLE_DIMENSIONS);
    const model = buildBoxGeometry(dieline);

    const partsById = new Map<string, (typeof model.root.faces)[number]>();
    const visit = (node: KinematicBoxNode) => {
      for (const part of node.faces) {
        partsById.set(part.faceId, part);
      }
      for (const child of node.children) {
        visit(child);
      }
    };
    visit(model.root);

    expect(partsById.get('front')?.sourceFaceId).toBe('front');
    expect(partsById.get('top-tuck')?.sourceFaceId).toBe('top-tuck');
    expect(partsById.get('top-tuck-tongue')?.sourceFaceId).toBe('top-tuck');
    expect(partsById.get('bottom-tuck-tongue')?.sourceFaceId).toBe('bottom-tuck');

    for (const part of partsById.values()) {
      const posAttr = part.geometry.getAttribute('position');
      const uvAttr = part.geometry.getAttribute('uv');
      expect(posAttr).toBeDefined();
      expect(uvAttr).toBeDefined();
      expect(uvAttr?.itemSize).toBe(2);
      expect(uvAttr?.count).toBe(posAttr?.count);

      for (let i = 0; i < (uvAttr?.count ?? 0); i += 1) {
        const u = uvAttr!.getX(i);
        const v = uvAttr!.getY(i);
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(1);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }

    // Front face UVs span full [0, 1] horizontally & vertically (v=1 is canvas top / minY)
    const frontUv = partsById.get('front')!.geometry.getAttribute('uv')!;
    const us: number[] = [];
    const vs: number[] = [];
    for (let i = 0; i < frontUv.count; i += 1) {
      us.push(frontUv.getX(i));
      vs.push(frontUv.getY(i));
    }
    expect(Math.min(...us)).toBeCloseTo(0, 5);
    expect(Math.max(...us)).toBeCloseTo(1, 5);
    expect(Math.min(...vs)).toBeCloseTo(0, 5);
    expect(Math.max(...vs)).toBeCloseTo(1, 5);

    // Split lid & tongue share top-tuck's UV range cleanly without exceeding [0, 1]
    const lidUv = partsById.get('top-tuck')!.geometry.getAttribute('uv')!;
    const tongueUv = partsById.get('top-tuck-tongue')!.geometry.getAttribute('uv')!;
    const lidVs = Array.from({ length: lidUv.count }, (_, i) => lidUv.getY(i));
    const tongueVs = Array.from({ length: tongueUv.count }, (_, i) => tongueUv.getY(i));
    expect(Math.max(...tongueVs)).toBeCloseTo(1, 5);
    expect(Math.min(...lidVs)).toBeCloseTo(0, 5);
    expect(Math.max(...lidVs)).toBeLessThan(1);

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

  it('rebuilds scaled 3D geometry and valid closed 90° bounds when dimensions change (150x50x100 & 200x150x100)', () => {
    const elongatedDieline = generateTuckEndBox({
      length: 150,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    const elongatedModel = buildBoxGeometry(elongatedDieline);
    expect(elongatedModel.shadowExtent.width).toBeCloseTo(417 * DIELINE_SCALE_TO_3D, 6);

    const foldedElongated = computeFaceWorldBounds(elongatedModel.root, 90);
    const frontSize = new THREE.Vector3();
    foldedElongated.get('front')!.getSize(frontSize);
    expect(frontSize.x).toBeCloseTo(150.5 * DIELINE_SCALE_TO_3D, 3);
    expect(frontSize.z).toBeCloseTo(100.5 * DIELINE_SCALE_TO_3D, 3);

    const leftWall = foldedElongated.get('left')!;
    const rightWall = foldedElongated.get('right')!;
    const frontWall = foldedElongated.get('front')!;
    expect(leftWall.min.x).toBeCloseTo(frontWall.min.x, 3);
    expect(rightWall.max.x).toBeCloseTo(frontWall.max.x, 3);
    elongatedModel.dispose();

    const largeDieline = generateTuckEndBox({
      length: 200,
      width: 150,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    const largeModel = buildBoxGeometry(largeDieline);
    const foldedLarge = computeFaceWorldBounds(largeModel.root, 90);
    const largeRightSize = new THREE.Vector3();
    foldedLarge.get('right')!.getSize(largeRightSize);
    expect(largeRightSize.y).toBeCloseTo(150.5 * DIELINE_SCALE_TO_3D, 3);
    largeModel.dispose();
  });

  it('anchors FEFCO 0201 on bottom-flap-front at Y=0, folds walls upward, and closes top flaps overhead', () => {
    const rsc = generateRsc({
      length: 300,
      width: 200,
      height: 150,
      thickness: 0.5,
      bleedSize: 3,
    });
    const model = buildBoxGeometry(rsc);

    expect(model.root.id).toBe('root-bottom-flap-front');

    // At 0°, every panel lies completely flat on the Y = 0 floor plane
    const flatBounds = computeFaceWorldBounds(model.root, 0);
    for (const bounds of flatBounds.values()) {
      expect(bounds.min.y).toBeCloseTo(0, 4);
      expect(bounds.max.y).toBeCloseTo(0, 4);
    }

    // Across every folding angle 0°..90°, bottom-flap-front stays grounded at Y=0 and NO face dips below Y=0
    for (const angle of [15, 30, 45, 60, 75, 90]) {
      const boundsAtAngle = computeFaceWorldBounds(model.root, angle);
      const baseBounds = boundsAtAngle.get('bottom-flap-front')!;
      expect(baseBounds.min.y).toBeCloseTo(0, 4);
      expect(baseBounds.max.y).toBeCloseTo(0, 4);
      for (const bounds of boundsAtAngle.values()) {
        expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-4);
      }
    }

    // At 78°, top inner flaps finish closing to 90° (Y = 1.505) before outer flaps finish closing ([72, 90])
    const midBounds = computeFaceWorldBounds(model.root, 78);
    expect(midBounds.get('front')!.max.y).toBeCloseTo(1.505, 3);
    expect(midBounds.get('top-flap-left')!.min.y).toBeCloseTo(1.505, 3);
    expect(midBounds.get('top-flap-left')!.max.y).toBeCloseTo(1.505, 3);
    expect(midBounds.get('top-flap-front')!.max.y).toBeGreaterThan(1.51);

    // At 90°, Front & Back top outer flaps meet seamlessly over inner flaps (+Y), and bottom inner flaps stack above Y=0
    const closedBounds = computeFaceWorldBounds(model.root, 90);
    const frontTop = closedBounds.get('top-flap-front')!;
    const backTop = closedBounds.get('top-flap-back')!;
    const leftTopInner = closedBounds.get('top-flap-left')!;
    const leftBotInner = closedBounds.get('bottom-flap-left')!;
    const botFront = closedBounds.get('bottom-flap-front')!;

    expect(frontTop.max.z).toBeCloseTo(backTop.min.z, 4);
    expect(backTop.max.z - frontTop.min.z).toBeCloseTo(2.005, 4);
    expect(frontTop.min.y).toBeGreaterThan(leftTopInner.max.y);
    expect(leftBotInner.min.y).toBeGreaterThan(botFront.max.y);

    model.dispose();
  });

  it('folds FEFCO 0203 top and bottom overlapping flaps with clean vertical Y separation on floor', () => {
    const fosc = generateFefco0203({
      length: 300,
      width: 200,
      height: 150,
      thickness: 0.5,
      bleedSize: 3,
    });
    const model = buildBoxGeometry(fosc);

    // Every panel stays on or above Y = 0 throughout the full fold range
    for (const angle of [0, 30, 60, 90]) {
      const boundsAtAngle = computeFaceWorldBounds(model.root, angle);
      for (const bounds of boundsAtAngle.values()) {
        expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-4);
      }
    }

    const closedBounds = computeFaceWorldBounds(model.root, 90);
    const topLeftInner = closedBounds.get('top-flap-left')!;
    const topBackOuter = closedBounds.get('top-flap-back')!;
    const topFrontOuter = closedBounds.get('top-flap-front')!;

    // Both Front and Back top outer flaps span full 200.5mm Z depth and stack upward (+Y)
    expect(topBackOuter.max.z - topBackOuter.min.z).toBeCloseTo(2.005, 3);
    expect(topFrontOuter.max.z - topFrontOuter.min.z).toBeCloseTo(2.005, 3);
    expect(topFrontOuter.min.y).toBeGreaterThan(topBackOuter.min.y);
    expect(topBackOuter.min.y).toBeGreaterThan(topLeftInner.min.y);

    // Bottom flaps stack monotonically upward inside box above floor (Y = 0)
    const botLeftInner = closedBounds.get('bottom-flap-left')!;
    const botBackOuter = closedBounds.get('bottom-flap-back')!;
    const botFrontOuter = closedBounds.get('bottom-flap-front')!;
    expect(botFrontOuter.min.y).toBeCloseTo(0, 4);
    expect(botBackOuter.min.y).toBeGreaterThan(botFrontOuter.max.y);
    expect(botLeftInner.min.y).toBeGreaterThan(botBackOuter.max.y);

    model.dispose();
  });

  it('folds FEFCO 0200 (open top) and FEFCO 0215 (Full Overlap top + RSC bottom) cleanly on Y=0', () => {
    const hsc = generateFefco0200({
      length: 300,
      width: 200,
      height: 150,
      thickness: 0.5,
      bleedSize: 3,
    });
    const hscModel = buildBoxGeometry(hsc);
    const hscClosed = computeFaceWorldBounds(hscModel.root, 90);
    expect(hscClosed.size).toBe(9);
    expect(hscClosed.get('bottom-flap-front')!.min.y).toBeCloseTo(0, 4);
    expect(hscClosed.get('front')!.max.y).toBeCloseTo(1.505, 3);
    hscModel.dispose();

    const mix = generateFefco0215({
      length: 300,
      width: 200,
      height: 150,
      thickness: 0.5,
      bleedSize: 3,
    });
    const mixModel = buildBoxGeometry(mix);
    const mixClosed = computeFaceWorldBounds(mixModel.root, 90);
    // 12 primary faces + 1 articulated top-flap-back-tongue node = 13 world meshes
    expect(mixClosed.size).toBe(13);

    // 0215: Top tuck lid (1.0*W) + 20mm articulated tongue on top-flap-back + 1-2-3 snap-lock base on Y=0
    const topLid = mixClosed.get('top-flap-back')!;
    const topTongue = mixClosed.get('top-flap-back-tongue')!;
    const botFront = mixClosed.get('bottom-flap-front')!;
    const botLeft = mixClosed.get('bottom-flap-left')!;
    const botBack = mixClosed.get('bottom-flap-back')!;
    const frontWall = mixClosed.get('front')!;
    expect(topLid.max.z - topLid.min.z).toBeCloseTo(2.005, 3);
    expect(topTongue.max.y - topTongue.min.y).toBeCloseTo(0.2, 2);
    expect(topTongue.min.y).toBeLessThan(frontWall.max.y);
    // Tucked strictly inside the front wall cavity (interior spans [frontWall.min.z, topLid.max.z]) with ~1.25mm clearance
    expect(topTongue.min.z).toBeGreaterThan(frontWall.min.z);
    expect(topTongue.max.z).toBeLessThan(topLid.max.z);
    expect(botFront.min.y).toBeCloseTo(0, 4);
    expect(botLeft.min.y).toBeGreaterThan(botFront.min.y);
    expect(botBack.min.y).toBeGreaterThan(botFront.min.y);

    mixModel.dispose();

    // Verify FEFCO 0210 (Double RETT anchored on bottom-flap-back) and FEFCO 0240 (upright Euroslot hang header)
    const f0210 = generateDieline('fefco-0210', {
      length: 160,
      width: 100,
      height: 110,
      thickness: 0.5,
      bleedSize: 3,
    });
    const f0210Model = buildBoxGeometry(f0210);
    const rootCoverFace = f0210Model.root.faces.find((f) => f.faceId === 'bottom-flap-back')!;
    rootCoverFace.geometry.computeBoundingBox();
    expect(rootCoverFace.geometry.boundingBox!.min.y).toBeCloseTo(0, 4);
    const botTongueNode = f0210Model.root.children.find((c) =>
      c.faces.some((f) => f.faceId === 'bottom-flap-back-tongue'),
    )!;
    expect(botTongueNode).toBeTruthy();
    expect(computeNodeTargetAngleDeg(botTongueNode, 90).targetDeg).toBe(90);

    const f0210Closed = computeFaceWorldBounds(f0210Model.root, 90);
    expect(f0210Closed.get('front')!.max.y).toBeCloseTo(1.105, 3);
    expect(f0210Closed.get('bottom-flap-back-tongue')!.max.y).toBeGreaterThan(0.18);
    expect(f0210Closed.get('top-flap-back-tongue')!.min.y).toBeLessThan(
      f0210Closed.get('front')!.max.y,
    );
    f0210Model.dispose();

    const f0240 = generateDieline('fefco-0240', {
      length: 130,
      width: 85,
      height: 170,
      thickness: 0.5,
      bleedSize: 3,
    });
    const f0240Model = buildBoxGeometry(f0240);
    const f0240Closed = computeFaceWorldBounds(f0240Model.root, 90);
    // Upright twin-Euroslot header extends straight upward above box height (1.705 + 1.07*0.855)
    expect(f0240Closed.get('top-flap-back')!.max.y).toBeGreaterThan(
      f0240Closed.get('front')!.max.y + 0.5,
    );
    f0240Model.dispose();
  });

  it('builds outsideGeometry with horizontally mirrored UVs (1 - u) for BackSide exterior readability', () => {
    const tuck = generateTuckEndBox(SAMPLE_DIMENSIONS);
    const model = buildBoxGeometry(tuck);
    const frontPart = model.root.faces.find((face) => face.faceId === 'front')!;
    const insideUv = frontPart.geometry.getAttribute('uv');
    const outsideUv = frontPart.outsideGeometry.getAttribute('uv');

    expect(insideUv.count).toBeGreaterThan(0);
    expect(outsideUv.count).toBe(insideUv.count);
    for (let i = 0; i < insideUv.count; i += 1) {
      expect(outsideUv.getX(i)).toBeCloseTo(1 - insideUv.getX(i), 5);
      expect(outsideUv.getY(i)).toBeCloseTo(insideUv.getY(i), 5);
    }

    model.dispose();
  });

  it('folds FEFCO 0202, 0204, and 0205 flat on Y = 0 in strict wall -> inner -> outer order without Z-fighting', () => {
    const shipping = { length: 300, width: 200, height: 150, thickness: 0.5, bleedSize: 3 };

    const f0202Model = buildBoxGeometry(generateFefco0202(shipping));
    const f0202Closed = computeFaceWorldBounds(f0202Model.root, 90);
    // Seated flat on Y = 0 with bottom-flap-back & inner flaps stepped strictly inward (+Y)
    expect(f0202Closed.get('bottom-flap-front')!.min.y).toBeCloseTo(0, 4);
    expect(f0202Closed.get('bottom-flap-back')!.min.y).toBeGreaterThan(
      f0202Closed.get('bottom-flap-front')!.min.y,
    );
    expect(f0202Closed.get('top-flap-front')!.min.y).toBeGreaterThan(
      f0202Closed.get('top-flap-back')!.min.y,
    );
    f0202Model.dispose();

    const f0204Model = buildBoxGeometry(generateFefco0204(shipping));
    const f0204Closed = computeFaceWorldBounds(f0204Model.root, 90);
    expect(f0204Closed.get('bottom-flap-front')!.min.y).toBeCloseTo(0, 4);
    f0204Model.dispose();

    const f0205Model = buildBoxGeometry(generateFefco0205(shipping));
    // Verify strict stage sequence on 0205: at 60° walls upright while top flaps open; at 75° inner closed, outer open
    const findNode = (node: KinematicBoxNode, id: string): KinematicBoxNode | null => {
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
      return null;
    };
    const leftWallNode = findNode(f0205Model.root, 'group-left-wall')!;
    const topLeftNode = findNode(f0205Model.root, 'group-top-flap-left')!;
    const topFrontNode = findNode(f0205Model.root, 'group-top-flap-front')!;
    expect(computeNodeTargetAngleDeg(leftWallNode, 60).targetDeg).toBe(90);
    expect(computeNodeTargetAngleDeg(topLeftNode, 60).targetDeg).toBe(0);
    expect(computeNodeTargetAngleDeg(topLeftNode, 75).targetDeg).toBe(90);
    expect(computeNodeTargetAngleDeg(topFrontNode, 75).targetDeg).toBe(0);

    const f0205Closed = computeFaceWorldBounds(f0205Model.root, 90);
    expect(f0205Closed.get('bottom-flap-front')!.min.y).toBeCloseTo(0, 4);
    expect(f0205Closed.get('bottom-flap-back')!.min.y).toBeGreaterThan(
      f0205Closed.get('bottom-flap-front')!.min.y,
    );
    expect(f0205Closed.get('top-flap-front')!.min.y).toBeGreaterThan(
      f0205Closed.get('top-flap-back')!.min.y,
    );
    f0205Model.dispose();
  });
});
