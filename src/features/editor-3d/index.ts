// Public barrel exports for procedural 3D carton preview viewer feature
export {
  type BakeableArtworkElement,
  bakeFaceTexture,
  type BakeSide,
  buildFaceBakeSignature,
  computeBakedTextureSize,
  DEFAULT_BAKE_SCALE,
  getFaceElementsForFace,
  MAX_TEXTURE_SIZE,
  registerBakedImage,
  type TexturePixelDimensions,
} from './bakeTexture';
export { BoxViewer, DEFAULT_3D_DIMENSIONS, type BoxViewerProps } from './BoxViewer';
export {
  buildBoxGeometry,
  createRadialShadowTexture,
  DIELINE_SCALE_TO_3D,
  type FaceBoundsMm,
  type FoldRotationAxis,
  type KinematicBoxModel,
  type KinematicBoxNode,
  type KinematicFacePart,
  parseSvgPathToShape,
} from './buildBoxGeometry';
