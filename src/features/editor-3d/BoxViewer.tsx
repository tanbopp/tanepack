// Procedural on-demand Three.js 3D viewer folding a carton from flat (0°) to closed (90°)
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { DesignElement } from '@entities/design-document';
import { generateTuckEndBox } from '@entities/dieline';
import type { Dieline } from '@entities/dieline/types';
import {
  bakeFaceTexture,
  buildFaceBakeSignature,
  DEFAULT_BAKE_SCALE,
  getFaceElementsForFace,
} from './bakeTexture';
import {
  buildBoxGeometry,
  createRadialShadowTexture,
  DIELINE_SCALE_TO_3D,
  type KinematicBoxModel,
  type KinematicBoxNode,
  type KinematicFacePart,
} from './buildBoxGeometry';

export const DEFAULT_3D_DIMENSIONS: Dieline['dimensions'] = {
  length: 100,
  width: 50,
  height: 100,
  thickness: 0.5,
  bleedSize: 3,
};

const EMPTY_ELEMENTS: readonly DesignElement[] = [];

export interface BoxViewerProps {
  dieline?: Dieline | undefined;
  dimensions?: Dieline['dimensions'] | undefined;
  elements?: readonly DesignElement[] | undefined;
  foldAngle?: number | undefined;
  onRegisterCapture?: ((captureFn: (() => string | null) | null) => void) | undefined;
}

interface FaceMaterialEntry {
  signature: string | null;
  texture: THREE.CanvasTexture | null;
  outerMaterial: THREE.MeshStandardMaterial;
  innerMaterial: THREE.MeshStandardMaterial;
}

function createFaceMaterialEntry(): FaceMaterialEntry {
  const outerMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  return {
    signature: null,
    texture: null,
    outerMaterial,
    innerMaterial,
  };
}

interface BakedFaceMeshProps {
  part: KinematicFacePart;
  entry: FaceMaterialEntry;
  edgeMaterial: THREE.LineBasicMaterial;
}

const BakedFaceMesh = memo(function BakedFaceMesh({
  part,
  entry,
  edgeMaterial,
}: BakedFaceMeshProps) {
  return (
    <group>
      <mesh
        name={`face-${part.faceId}`}
        geometry={part.geometry}
        material={part.isInnerLayer ? entry.innerMaterial : entry.outerMaterial}
      />
      <lineSegments geometry={part.edgeGeometry} material={edgeMaterial} />
    </group>
  );
});

interface KinematicGroupMeshProps {
  node: KinematicBoxNode;
  foldAngle: number;
  faceMaterials: ReadonlyMap<string, FaceMaterialEntry>;
  fallbackEntry: FaceMaterialEntry;
  edgeMaterial: THREE.LineBasicMaterial;
}

function KinematicGroupMesh({
  node,
  foldAngle,
  faceMaterials,
  fallbackEntry,
  edgeMaterial,
}: KinematicGroupMeshProps) {
  const [minDeg, maxDeg] = node.animatedAngleRange;
  const clampedDeg = Math.min(maxDeg, Math.max(minDeg, foldAngle));
  const angleRad = THREE.MathUtils.degToRad(clampedDeg) * node.rotationSign;

  const rotation: [number, number, number] = [
    node.rotationAxis === 'x' ? angleRad : 0,
    0,
    node.rotationAxis === 'z' ? angleRad : 0,
  ];

  return (
    <group name={node.id} position={node.position} rotation={rotation}>
      {node.faces.map((face) => (
        <BakedFaceMesh
          key={face.faceId}
          part={face}
          entry={faceMaterials.get(face.sourceFaceId) ?? fallbackEntry}
          edgeMaterial={edgeMaterial}
        />
      ))}
      {node.children.map((child) => (
        <KinematicGroupMesh
          key={child.id}
          node={child}
          foldAngle={foldAngle}
          faceMaterials={faceMaterials}
          fallbackEntry={fallbackEntry}
          edgeMaterial={edgeMaterial}
        />
      ))}
    </group>
  );
}

interface CartonAssemblyProps {
  dieline: Dieline;
  model: KinematicBoxModel;
  elements: readonly DesignElement[];
  foldAngle: number;
  edgeMaterial: THREE.LineBasicMaterial;
  onRegisterCapture?: ((captureFn: (() => string | null) | null) => void) | undefined;
}

function CartonAssembly({
  dieline,
  model,
  elements,
  foldAngle,
  edgeMaterial,
  onRegisterCapture,
}: CartonAssemblyProps) {
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const { faceMaterials, fallbackEntry } = useMemo(() => {
    const map = new Map<string, FaceMaterialEntry>();
    for (const face of dieline.faces) {
      map.set(face.id, createFaceMaterialEntry());
    }
    return {
      faceMaterials: map,
      fallbackEntry: createFaceMaterialEntry(),
    };
  }, [dieline]);

  useEffect(() => {
    if (!onRegisterCapture) {
      return undefined;
    }
    const capturePngDataUrl = (): string | null => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    };
    onRegisterCapture(capturePngDataUrl);
    return () => {
      onRegisterCapture(null);
    };
  }, [camera, gl, onRegisterCapture, scene]);

  // Dispose per-face textures and materials cleanly when dieline changes or viewer unmounts
  useEffect(() => {
    return () => {
      for (const entry of faceMaterials.values()) {
        entry.texture?.dispose();
        entry.texture = null;
        entry.signature = null;
        entry.outerMaterial.map = null;
        entry.innerMaterial.map = null;
        entry.outerMaterial.dispose();
        entry.innerMaterial.dispose();
      }
      fallbackEntry.outerMaterial.dispose();
      fallbackEntry.innerMaterial.dispose();
    };
  }, [faceMaterials, fallbackEntry]);

  // Re-bake only faces whose committed outside artwork signature changed, then demand a frame
  useEffect(() => {
    let dirty = false;

    for (const face of dieline.faces) {
      const entry = faceMaterials.get(face.id);
      if (!entry) {
        continue;
      }

      const faceElements = getFaceElementsForFace(face.id, elements);
      const nextSignature =
        faceElements.length > 0
          ? buildFaceBakeSignature(face, faceElements, DEFAULT_BAKE_SCALE)
          : null;

      if (entry.signature === nextSignature) {
        continue;
      }

      entry.texture?.dispose();
      let createdTexture: THREE.CanvasTexture | null = null;
      if (nextSignature !== null) {
        createdTexture = bakeFaceTexture(face, faceElements, DEFAULT_BAKE_SCALE, () => {
          if (entry.texture === createdTexture) {
            invalidate();
          }
        });
      }
      entry.texture = createdTexture;
      entry.signature = nextSignature;
      entry.outerMaterial.map = createdTexture;
      entry.outerMaterial.needsUpdate = true;
      entry.innerMaterial.map = createdTexture;
      entry.innerMaterial.needsUpdate = true;
      dirty = true;
    }

    if (dirty) {
      invalidate();
    }
  }, [dieline, elements, faceMaterials, invalidate]);

  useEffect(() => {
    invalidate();
  }, [foldAngle, dieline, invalidate]);

  return (
    <group position={[0, 0.002, 0]}>
      <KinematicGroupMesh
        node={model.root}
        foldAngle={foldAngle}
        faceMaterials={faceMaterials}
        fallbackEntry={fallbackEntry}
        edgeMaterial={edgeMaterial}
      />
    </group>
  );
}

export function BoxViewer({
  dieline: dielineProp,
  dimensions = DEFAULT_3D_DIMENSIONS,
  elements = EMPTY_ELEMENTS,
  foldAngle = 0,
  onRegisterCapture,
}: BoxViewerProps) {
  const dieline = useMemo(
    () =>
      dielineProp ??
      generateTuckEndBox({
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        thickness: dimensions.thickness,
        bleedSize: dimensions.bleedSize,
      }),
    [
      dielineProp,
      dimensions.bleedSize,
      dimensions.height,
      dimensions.length,
      dimensions.thickness,
      dimensions.width,
    ],
  );
  const model = useMemo(() => buildBoxGeometry(dieline), [dieline]);
  const shadowTexture = useMemo(() => createRadialShadowTexture(64), []);
  const edgeMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#2b507d',
        transparent: true,
        opacity: 0.65,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      model.dispose();
    };
  }, [model]);

  useEffect(() => {
    return () => {
      shadowTexture.dispose();
      edgeMaterial.dispose();
    };
  }, [edgeMaterial, shadowTexture]);

  // Smoothly tighten contact shadow footprint as side panels fold from 0° flat to 90° closed
  const foldProgress = Math.min(1, Math.max(0, foldAngle / 90));
  const activeDimensions = dieline.dimensions;
  const frontWidth3d = (activeDimensions.length + activeDimensions.thickness) * DIELINE_SCALE_TO_3D;
  const frontDepth3d = (activeDimensions.height + activeDimensions.thickness) * DIELINE_SCALE_TO_3D;
  const shadowWidth =
    THREE.MathUtils.lerp(model.shadowExtent.width, frontWidth3d * 1.35, foldProgress) * 1.15;
  const shadowDepth =
    THREE.MathUtils.lerp(model.shadowExtent.depth, frontDepth3d * 1.35, foldProgress) * 1.15;

  return (
    <Box
      data-testid="box-viewer-3d"
      aria-label="3D Packaging Preview"
      sx={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--md-sys-color-surface-container)',
      }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        shadows={false}
        gl={{ antialias: false, powerPreference: 'default', preserveDrawingBuffer: true }}
        camera={{ position: [2.6, 2.8, 4.1], fov: 40, near: 0.05, far: 150 }}
      >
        <color attach="background" args={['#f3ece3']} />

        {/* Strictly 1 ambient light + 1 directional light, no heavy shadows or post-processing */}
        <ambientLight intensity={0.95} />
        <directionalLight position={[3.5, 6, 4.5]} intensity={1.15} />

        {/* Subtle floor grid and radial gradient fake contact shadow */}
        <gridHelper args={[16, 32, '#c3b7a9', '#e2d9ce']} position={[0, -0.004, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
          <planeGeometry args={[shadowWidth, shadowDepth]} />
          <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
        </mesh>

        {/* Carton slightly above floor to prevent z-fighting at 0° */}
        <CartonAssembly
          dieline={dieline}
          model={model}
          elements={elements}
          foldAngle={foldAngle}
          edgeMaterial={edgeMaterial}
          onRegisterCapture={onRegisterCapture}
        />

        <OrbitControls
          makeDefault
          target={[0.15, 0.15, 0]}
          enablePan
          enableZoom
          enableRotate
          enableDamping={false}
          minDistance={0.8}
          maxDistance={24}
          maxPolarAngle={Math.PI * 0.49}
        />
      </Canvas>

      {/* Subtle 3D interaction & frameloop indicator pill */}
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          zIndex: 10,
          px: 1.5,
          py: 0.75,
          borderRadius: '9999px',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          pointerEvents: 'none',
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="labelSmall" color="text.secondary">
          Drag to rotate • Right-drag to pan • Scroll to zoom • Fold: {Math.round(foldAngle)}°
        </Typography>
      </Box>
    </Box>
  );
}
