// Procedural on-demand Three.js 3D viewer folding a carton from flat (0°) to closed (90°)
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { generateTuckEndBox } from '@entities/dieline';
import type { Dieline } from '@entities/dieline/types';
import {
  buildBoxGeometry,
  createRadialShadowTexture,
  DIELINE_SCALE_TO_3D,
  type KinematicBoxNode,
} from './buildBoxGeometry';

export const DEFAULT_3D_DIMENSIONS: Dieline['dimensions'] = {
  length: 100,
  width: 50,
  height: 100,
  thickness: 0.5,
  bleedSize: 3,
};

export interface BoxViewerProps {
  dimensions?: Dieline['dimensions'] | undefined;
  foldAngle?: number | undefined;
}

interface KinematicGroupMeshProps {
  node: KinematicBoxNode;
  foldAngle: number;
  outerMaterial: THREE.MeshStandardMaterial;
  innerMaterial: THREE.MeshStandardMaterial;
  edgeMaterial: THREE.LineBasicMaterial;
}

function KinematicGroupMesh({
  node,
  foldAngle,
  outerMaterial,
  innerMaterial,
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
        <group key={face.faceId}>
          <mesh
            name={`face-${face.faceId}`}
            geometry={face.geometry}
            material={face.isInnerLayer ? innerMaterial : outerMaterial}
          />
          <lineSegments geometry={face.edgeGeometry} material={edgeMaterial} />
        </group>
      ))}
      {node.children.map((child) => (
        <KinematicGroupMesh
          key={child.id}
          node={child}
          foldAngle={foldAngle}
          outerMaterial={outerMaterial}
          innerMaterial={innerMaterial}
          edgeMaterial={edgeMaterial}
        />
      ))}
    </group>
  );
}

interface FrameloopInvalidatorProps {
  foldAngle: number;
  dimensions: Dieline['dimensions'];
}

function FrameloopInvalidator({ foldAngle, dimensions }: FrameloopInvalidatorProps) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [foldAngle, dimensions, invalidate]);

  return null;
}

export function BoxViewer({ dimensions = DEFAULT_3D_DIMENSIONS, foldAngle = 0 }: BoxViewerProps) {
  const dieline = useMemo(() => generateTuckEndBox(dimensions), [dimensions]);
  const model = useMemo(() => buildBoxGeometry(dieline), [dieline]);
  const shadowTexture = useMemo(() => createRadialShadowTexture(64), []);

  const materials = useMemo(() => {
    const outerMaterial = new THREE.MeshStandardMaterial({
      color: '#90caf9',
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: '#90caf9',
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: '#2b507d',
      transparent: true,
      opacity: 0.75,
    });
    return { outerMaterial, innerMaterial, edgeMaterial };
  }, []);

  useEffect(() => {
    return () => {
      model.dispose();
    };
  }, [model]);

  useEffect(() => {
    return () => {
      shadowTexture.dispose();
      materials.outerMaterial.dispose();
      materials.innerMaterial.dispose();
      materials.edgeMaterial.dispose();
    };
  }, [materials, shadowTexture]);

  // Smoothly tighten contact shadow footprint as side panels fold from 0° flat to 90° closed
  const foldProgress = Math.min(1, Math.max(0, foldAngle / 90));
  const frontWidth3d = (dimensions.length + dimensions.thickness) * DIELINE_SCALE_TO_3D;
  const frontDepth3d = (dimensions.height + dimensions.thickness) * DIELINE_SCALE_TO_3D;
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
        gl={{ antialias: false, powerPreference: 'default' }}
        camera={{ position: [2.6, 2.8, 4.1], fov: 40, near: 0.05, far: 100 }}
      >
        <color attach="background" args={['#f3ece3']} />
        <FrameloopInvalidator foldAngle={foldAngle} dimensions={dimensions} />

        {/* Strictly 1 ambient light + 1 directional light, no heavy shadows or post-processing */}
        <ambientLight intensity={0.95} />
        <directionalLight position={[3.5, 6, 4.5]} intensity={1.15} />

        {/* Subtle floor grid and radial gradient fake contact shadow */}
        <gridHelper args={[10, 20, '#c3b7a9', '#e2d9ce']} position={[0, -0.004, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
          <planeGeometry args={[shadowWidth, shadowDepth]} />
          <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
        </mesh>

        {/* Carton slightly above floor to prevent z-fighting at 0° */}
        <group position={[0, 0.002, 0]}>
          <KinematicGroupMesh
            node={model.root}
            foldAngle={foldAngle}
            outerMaterial={materials.outerMaterial}
            innerMaterial={materials.innerMaterial}
            edgeMaterial={materials.edgeMaterial}
          />
        </group>

        <OrbitControls
          makeDefault
          target={[0.15, 0.15, 0]}
          enablePan
          enableZoom
          enableRotate
          enableDamping={false}
          minDistance={0.8}
          maxDistance={12}
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
