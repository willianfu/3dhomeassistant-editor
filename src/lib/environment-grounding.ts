const EDITOR_GRID_GROUND_Y = 0;
const MANUAL_ENVIRONMENT_SKYBOX_HEIGHT = 15;
const MANUAL_ENVIRONMENT_SKYBOX_RADIUS = 180;
const MANUAL_ENVIRONMENT_SKYBOX_RESOLUTION = 96;

export function getEmptySceneOrbitTarget() {
  return {
    x: 0,
    y: EDITOR_GRID_GROUND_Y,
    z: 0,
  };
}

export function getGroundedOrbitTarget(position: { x: number; y: number; z: number }) {
  return {
    x: position.x,
    y: EDITOR_GRID_GROUND_Y,
    z: position.z,
  };
}

export function getManualEnvironmentSkyboxTransform() {
  return {
    groundY: EDITOR_GRID_GROUND_Y,
    height: MANUAL_ENVIRONMENT_SKYBOX_HEIGHT,
    radius: MANUAL_ENVIRONMENT_SKYBOX_RADIUS,
    resolution: MANUAL_ENVIRONMENT_SKYBOX_RESOLUTION,
    positionY: EDITOR_GRID_GROUND_Y + MANUAL_ENVIRONMENT_SKYBOX_HEIGHT,
  };
}
