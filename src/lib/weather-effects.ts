import * as THREE from "three";

export type WeatherEffectBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type RainParticle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  delay: number;
};

export type RainLineEffect = {
  kind: "rain";
  object: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  particles: RainParticle[];
  bounds: WeatherEffectBounds;
  length: number;
  speed: number;
  drift: number;
  color: THREE.Color;
  dispose: () => void;
};

export type WindLine = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
  progress: number;
  speed: number;
  delay: number;
};

export type WindLineEffect = {
  kind: "wind";
  object: THREE.Group;
  lines: WindLine[];
  bounds: WeatherEffectBounds;
  length: number;
  speed: number;
  dispose: () => void;
};

type RainOptions = {
  bounds: WeatherEffectBounds;
  count: number;
  speed: number;
  drift: number;
  opacity: number;
  length: number;
  color: number;
};

type WindOptions = {
  bounds: WeatherEffectBounds;
  count: number;
  speed: number;
  opacity: number;
  color: number;
  length: number;
};

function randomBetween(min: number, max: number) {
  return THREE.MathUtils.lerp(min, max, Math.random());
}

function wrap(value: number, min: number, max: number) {
  const range = Math.max(max - min, 0.0001);
  return min + ((((value - min) % range) + range) % range);
}

function resetRainParticle(particle: RainParticle, effect: RainLineEffect, topOnly = true) {
  const { bounds } = effect;
  particle.position.set(
    randomBetween(bounds.minX, bounds.maxX),
    topOnly ? bounds.maxY + randomBetween(0, 4) : randomBetween(bounds.minY, bounds.maxY),
    randomBetween(bounds.minZ, bounds.maxZ),
  );
  particle.velocity.set(
    randomBetween(-0.08, 0.08) + effect.drift * 4,
    -Math.max(effect.speed * randomBetween(70, 110), 0.1),
    randomBetween(-0.05, 0.05),
  );
  particle.delay = Math.random() * 0.08;
}

export function createRainLineEffect(options: RainOptions): RainLineEffect {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(options.count * 6);
  const colors = new Float32Array(options.count * 6);
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: options.opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const object = new THREE.LineSegments(geometry, material);
  object.name = "weather rain";
  object.frustumCulled = false;

  const effect: RainLineEffect = {
    kind: "rain",
    object,
    geometry,
    material,
    particles: [],
    bounds: options.bounds,
    length: options.length,
    speed: options.speed,
    drift: options.drift,
    color: new THREE.Color(options.color),
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };

  for (let index = 0; index < options.count; index += 1) {
    const particle = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      delay: 0,
    };
    resetRainParticle(particle, effect, false);
    particle.delay = 0;
    effect.particles.push(particle);
  }
  updateRainGeometry(effect);
  return effect;
}

function updateRainGeometry(effect: RainLineEffect) {
  const positions = effect.geometry.attributes.position.array as Float32Array;
  const colors = effect.geometry.attributes.color.array as Float32Array;
  const direction = new THREE.Vector3();
  const headAlpha = 0.86;
  const tailAlpha = 0.24;

  for (let index = 0; index < effect.particles.length; index += 1) {
    const particle = effect.particles[index];
    const offset = index * 6;
    if (particle.delay > 0) {
      positions.set([0, -100, 0, 0, -100, 0], offset);
      colors.set([0, 0, 0, 0, 0, 0], offset);
      continue;
    }
    direction.copy(particle.velocity).normalize();
    const length = Math.min(effect.length, particle.velocity.length() * 0.06);
    positions[offset] = particle.position.x;
    positions[offset + 1] = particle.position.y;
    positions[offset + 2] = particle.position.z;
    positions[offset + 3] = particle.position.x - direction.x * length;
    positions[offset + 4] = particle.position.y - direction.y * length;
    positions[offset + 5] = particle.position.z - direction.z * length;
    colors[offset] = effect.color.r * headAlpha;
    colors[offset + 1] = effect.color.g * headAlpha;
    colors[offset + 2] = effect.color.b * headAlpha;
    colors[offset + 3] = effect.color.r * tailAlpha;
    colors[offset + 4] = effect.color.g * tailAlpha;
    colors[offset + 5] = effect.color.b * tailAlpha;
  }
  effect.geometry.attributes.position.needsUpdate = true;
  effect.geometry.attributes.color.needsUpdate = true;
}

export function updateRainLineEffect(effect: RainLineEffect, deltaFrames: number, elapsedTime: number) {
  const delta = Math.min(deltaFrames / 60, 0.08);
  for (const particle of effect.particles) {
    if (particle.delay > 0) {
      particle.delay -= delta;
      continue;
    }
    particle.position.addScaledVector(particle.velocity, delta);
    particle.position.x += Math.sin(elapsedTime * 1.4 + particle.position.z * 0.04) * effect.drift * delta;
    particle.position.z += Math.cos(elapsedTime * 1.1 + particle.position.x * 0.03) * effect.drift * 0.35 * delta;
    particle.position.x = wrap(particle.position.x, effect.bounds.minX, effect.bounds.maxX);
    particle.position.z = wrap(particle.position.z, effect.bounds.minZ, effect.bounds.maxZ);
    if (particle.position.y < effect.bounds.minY - effect.length) {
      resetRainParticle(particle, effect);
    }
  }
  updateRainGeometry(effect);
}

const WIND_VERTEX_SHADER = `
attribute float ratio;
uniform float uThickness;
uniform float uProgress;
uniform vec3 uTangent;
varying float vAlpha;

void main() {
  float baseThickness = smoothstep(0.0, 1.0, 1.0 - abs(ratio - 0.5) * 2.0);
  float remappedProgress = uProgress * 3.0 - 1.0;
  float progressThickness = smoothstep(0.0, 1.0, 1.0 - abs(ratio - remappedProgress));
  float finalThickness = uThickness * baseThickness * progressThickness;
  float side = mod(float(gl_VertexID), 2.0) - 0.5;
  vec3 offset = uTangent * side * finalThickness;
  vAlpha = baseThickness * progressThickness;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + offset, 1.0);
}
`;

const WIND_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;

void main() {
  gl_FragColor = vec4(uColor, vAlpha * uOpacity);
}
`;

function createWindGeometry(length: number, amplitude: number) {
  const handles: THREE.Vector3[] = [];
  const halfLength = length / 2;
  for (let index = 0; index < 4; index += 1) {
    const ratio = index / 3;
    handles.push(
      new THREE.Vector3(
        0,
        ((index % 2) - 0.5) * amplitude,
        -halfLength + length * ratio,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(handles);
  const points = curve.getPoints(30);
  const vertices: number[] = [];
  const ratios: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const ratio = index / (points.length - 1);
    vertices.push(point.x, point.y, point.z, point.x, point.y, point.z);
    ratios.push(ratio, ratio);
    if (index < points.length - 1) {
      const base = index * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("ratio", new THREE.Float32BufferAttribute(ratios, 1));
  geometry.setIndex(indices);
  return geometry;
}

function resetWindLine(line: WindLine, effect: WindLineEffect) {
  const { bounds } = effect;
  line.progress = 0;
  line.delay = Math.random() * 0.6;
  line.material.uniforms.uProgress.value = 0;
  line.mesh.visible = false;
  line.mesh.position.set(
    randomBetween(bounds.minX, bounds.maxX),
    randomBetween(bounds.minY + 1.5, bounds.maxY),
    randomBetween(bounds.minZ, bounds.maxZ),
  );
  line.mesh.rotation.y = Math.PI / 2 + randomBetween(-0.18, 0.18);
}

export function createWindLineEffect(options: WindOptions): WindLineEffect {
  const object = new THREE.Group();
  object.name = "weather wind";
  const effect: WindLineEffect = {
    kind: "wind",
    object,
    lines: [],
    bounds: options.bounds,
    length: options.length,
    speed: options.speed,
    dispose: () => {
      for (const line of effect.lines) {
        object.remove(line.mesh);
        line.mesh.geometry.dispose();
        line.material.dispose();
      }
      effect.lines = [];
    },
  };

  const count = Math.max(Math.min(options.count, 24), 3);
  for (let index = 0; index < count; index += 1) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uThickness: { value: Math.max(options.length * 0.035, 0.08) },
        uProgress: { value: 1 },
        uColor: { value: new THREE.Color(options.color) },
        uOpacity: { value: options.opacity },
        uTangent: { value: new THREE.Vector3(0, 1, -0.45).normalize() },
      },
      vertexShader: WIND_VERTEX_SHADER,
      fragmentShader: WIND_FRAGMENT_SHADER,
    });
    const mesh = new THREE.Mesh(
      createWindGeometry(options.length, Math.max(options.length * 0.12, 0.3)),
      material,
    );
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    object.add(mesh);
    effect.lines.push({
      mesh,
      material,
      progress: 1,
      speed: options.speed * randomBetween(0.75, 1.35),
      delay: index * 0.18,
    });
  }
  return effect;
}

export function updateWindLineEffect(effect: WindLineEffect, deltaFrames: number) {
  const delta = Math.min(deltaFrames / 60, 0.08);
  for (const line of effect.lines) {
    if (line.delay > 0) {
      line.delay -= delta;
      continue;
    }
    if (line.progress >= 1) {
      resetWindLine(line, effect);
      continue;
    }
    line.mesh.visible = true;
    line.progress = Math.min(line.progress + line.speed * delta * 5, 1);
    line.mesh.position.x += line.speed * delta * effect.length * 2.2;
    line.mesh.position.z += line.speed * delta * effect.length * 0.35;
    line.material.uniforms.uProgress.value = line.progress;
  }
}
