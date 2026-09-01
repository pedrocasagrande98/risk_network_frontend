/**
 * VFX Earth & Frost — Desmoronamento (fenda shader + destroços + poeira) e
 * Geada (nevasca + névoa fria no chão).
 * Porta do triggerEarth/updateEarthEffect e triggerFrost/updateFrostEffect.
 */
import { VFX_TARGET, pulseLight } from './shared';
import { screenFlash } from './shared';

export function createEarthEffect(ctx, particles, debris, impactFx, container) {
  const { THREE, scene } = ctx;
  const TARGET = new THREE.Vector3(VFX_TARGET.x, VFX_TARGET.y, VFX_TARGET.z);

  const crackGeo = new THREE.PlaneGeometry(8, 8);
  const crackMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uProgress: { value: 0 },
      uColor: { value: new THREE.Color(0xd97706) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime; uniform float uProgress; uniform vec3 uColor;
        float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
        float noise(vec2 st) {
            vec2 i = floor(st); vec2 f = fract(st);
            float a = random(i); float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        void main(){
            vec2 pos = vUv * 10.0;
            float n = noise(pos + uTime * 0.5);
            n += noise(pos * 2.0) * 0.5;
            float lines = abs(n - 0.5) * 2.0;
            lines = pow(1.0 - lines, 10.0);
            float dist = length(vUv - 0.5) * 2.0;
            float mask = smoothstep(uProgress, uProgress - 0.2, dist);
            float alpha = lines * mask * (1.0 - smoothstep(0.8, 1.0, uProgress));
            gl_FragColor = vec4(uColor, alpha);
        }
    `,
  });
  ctx.disposables.push(crackGeo, crackMat);

  const crackMesh = new THREE.Mesh(crackGeo, crackMat);
  crackMesh.position.copy(TARGET);
  crackMesh.rotation.x = -Math.PI / 2;
  crackMesh.visible = false;
  scene.add(crackMesh);

  let crackActive = false;
  let crackProgress = 0;

  function update(dt) {
    if (!crackActive) return;
    crackProgress += dt * 0.8;
    crackMat.uniforms.uTime.value += dt;
    crackMat.uniforms.uProgress.value = crackProgress;

    if (crackProgress > 1.2) {
      crackActive = false;
      crackMesh.visible = false;
    }
  }

  function trigger() {
    if (crackActive) return;
    crackActive = true;
    crackProgress = 0;
    crackMesh.visible = true;
    ctx.shake.time = 0.5; ctx.shake.strength = 8;
    pulseLight(ctx, 0xd97706, 3, 4);
    impactFx.trigger(TARGET, 0xd97706, 0.8, 0.6);

    // Destroços 3D reais voando (pedaços de rocha)
    debris.spawn(TARGET, 22);

    // Poeira marrom subindo
    particles.spawn({
      position: TARGET, count: 70, color1: 0x8b5cf6, color2: 0x4b2e0f, size: 0.22,
      sizeVariance: 0.1, speedMin: 1.5, speedMax: 5.0, gravity: 3.0,
      life: 1.4, lifeVariance: 0.5, spread: 1.0, shrink: true,
    });
  }

  function dispose() {
    scene.remove(crackMesh);
    crackActive = false;
  }

  return { trigger, update, dispose, isActive: () => crackActive };
}

// =====================================================================
// FROST (Geada)
// =====================================================================
export function createFrostEffect(ctx, particles, impactFx, container) {
  const { THREE } = ctx;
  const TARGET = new THREE.Vector3(VFX_TARGET.x, VFX_TARGET.y, VFX_TARGET.z);
  let frostActive = false;
  let frostTimer = 0;

  function update(dt) {
    if (!frostActive) return;
    frostTimer -= dt;
    if (frostTimer <= 0) {
      frostActive = false;
      return;
    }

    ctx.dynamicLight.color.set(0xbae6fd);
    ctx.dynamicLight.intensity = 0.8 + Math.random() * 0.4;
    ctx.dynamicLight._decay = 0;

    particles.spawn({
      position: new THREE.Vector3(TARGET.x, TARGET.y + 12, TARGET.z),
      count: 7, color1: 0xffffff, color2: 0xdbeafe, size: 0.14,
      sizeVariance: 0.08, speedMin: 0.5, speedMax: 1.5, gravity: 0.2,
      life: 3.5, lifeVariance: 1.0, spread: 14.0, upward: false,
    });

    if (Math.random() > 0.4) {
      particles.spawn({
        position: new THREE.Vector3(TARGET.x, TARGET.y + 10, TARGET.z),
        count: 3, color1: 0x38bdf8, color2: 0x7dd3fc, size: 0.1,
        speedMin: 0.2, speedMax: 1.0, gravity: 0.1, life: 3.0, spread: 10.0,
      });
    }

    if (frostTimer <= 0.1) ctx.dynamicLight._decay = 3;
  }

  function trigger(duration = 2.6) {
    frostActive = true;
    frostTimer = duration;
    ctx.shake.time = 0;
    screenFlash(container, 0.4, '#bae6fd');
    impactFx.trigger(TARGET, 0x7dd3fc, 0.7, 0.7);

    // Névoa fria no chão
    particles.spawn({
      position: TARGET, count: 45, color1: 0xe0f2fe, color2: 0xffffff, size: 0.24,
      sizeVariance: 0.1, speedMin: 0.1, speedMax: 1.0, gravity: -0.2,
      life: 2.2, lifeVariance: 0.5, spread: 3.0, upward: true, drag: 0.15,
    });
  }

  function dispose() {
    frostActive = false;
  }

  return { trigger, update, dispose, isActive: () => frostActive };
}