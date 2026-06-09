export type OrthoFrustum = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  distance: number;
};

export function computeOrthoFrustum(maxSize: number, aspect: number): OrthoFrustum {
  const size = Math.max(maxSize, 1);
  const paddedSize = size * 1.3;
  const halfHeight = aspect >= 1 ? paddedSize / 2 : paddedSize / (2 * aspect);
  const halfWidth = aspect >= 1 ? (paddedSize * aspect) / 2 : paddedSize / 2;

  return {
    left: -halfWidth,
    right: halfWidth,
    top: halfHeight,
    bottom: -halfHeight,
    near: 0.1,
    far: size * 4,
    distance: size * 2,
  };
}
