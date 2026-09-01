/**
 * VFX Shared — recursos compartilhados entre efeitos Three.js.
 * Porta fiel do laboratório `risk-network-effect-gee/app.js` (partículas,
 * destroços, glow/ring shaders, camera shake, luz dinâmica, flash de tela).
 *
 * Todos os objetos criados ficam registrados no `ctx.disposables` para
 * limpeza completa (dispose) ao desmontar o overlay — evita memory leak.
 */

export const VFX_TARGET = { x: 0, y: -1, z: 0 }; // centro da cena (chão)
export const VFX_START = { x: 0, y: 8, z: -5 };

/**
 * Cria o "contexto" compartilhado: cena, camera, renderer, luzes e clock.
 * Retorna null se WebGL não estiver disponível (ex: jsdom/CI).
 */
export function createVFXContext(container, THREE, {
  width = window.innerWidth,
  height = window.innerHeight,
} = {}) {
  const scene = new THREE.Scene();
  scene.background = null;

  let camera;
  try {
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    return { ok: false, error: err };
  }

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x222233, 0.6);
  scene.add(ambientLight);

  const dynamicLight = new THREE.PointLight(0xffffff, 0, 30, 2);
  dynamicLight.position.set(VFX_TARGET.x, VFX_TARGET.y + 2, VFX_TARGET.z + 2);
  scene.add(dynamicLight);

  return {
    ok: true,
    THREE,
    scene,
    camera,
    renderer,
    dynamicLight,
    clock: new THREE.Timer(),  // THREE.Clock foi deprecado (aviso no console)
    disposables: [],          // objetos com .dispose()
    shake: { time: 0, strength: 6 },
    camTarget: new THREE.Vector3(0, 0.5, 0),
  };
}

/**
 * Registrar algo para limpeza posterior.
 */
export function track(ctx, ...objects) {
  for (const obj of objects) {
    if (obj && typeof obj.dispose === 'function') ctx.disposables.push(obj);
  }
}

/** Limpa toda a cena e libera GPU. Idempotente. */
export function disposeVFXContext(ctx) {
  if (!ctx) return;
  for (const obj of ctx.disposables) {
    try { obj.dispose(); } catch { /* já liberado */ }
  }
  ctx.disposables = [];
  ctx.clock?.dispose?.();  // THREE.Timer precisa de dispose (Clock não tinha)
  ctx.scene?.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose?.();
    if (obj.material) {
      (Array.isArray(obj.material) ? obj.material : [obj.material])
        .forEach((m) => m.dispose?.());
    }
  });
  if (ctx.renderer) {
    ctx.renderer.dispose();
    ctx.renderer.domElement?.remove();
  }
}

/** Luz dinâmica "pulsada" pelos efeitos (raio, impacto, fogo). */
export function pulseLight(ctx, color, intensity, decay) {
  ctx.dynamicLight.color.set(color);
  ctx.dynamicLight.intensity = intensity;
  ctx.dynamicLight._decay = decay || 0; // consumido no updateCamera
}

export function updateCamera(ctx, dt) {
  const { camera, shake, camTarget, dynamicLight } = ctx;
  let x = 0, y = 3, z = 10;
  if (shake.time > 0) {
    shake.time -= dt;
    const s = shake.time * shake.strength;
    x += (Math.random() - 0.5) * s;
    y += (Math.random() - 0.5) * s;
  }
  camera.position.set(x, y, z);
  camera.lookAt(camTarget);

  if (dynamicLight._decay) {
    dynamicLight.intensity = Math.max(0, dynamicLight.intensity - dynamicLight._decay * dt);
  }
}

/** Flash 2D sobreposto (elemento #flash criado pelo overlay). */
export function screenFlash(container, strength, color) {
  const el = container.querySelector('.vfx-flash');
  if (!el) return;
  el.style.backgroundColor = color;
  el.style.transition = 'none';
  el.style.opacity = strength;
  requestAnimationFrame(() => {
    el.style.transition = 'opacity .5s ease-out';
    el.style.opacity = 0;
  });
}

// =====================================================================
// Texturas e materiais compartilhados
// =====================================================================
export function makeSoftCircleTexture(THREE) {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

export function makeGlowMaterial(THREE, colorHex) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uCore: { value: new THREE.Color(0xffffff) },
      uCoreSize: { value: 0.18 },
      uAlpha: { value: 1.0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
            varying vec2 vUv;
            uniform vec3 uColor; uniform vec3 uCore; uniform float uCoreSize; uniform float uAlpha;
            void main(){
                vec2 c = vUv - 0.5;
                float d = length(c) * 2.0;
                float glow = pow(smoothstep(1.0, 0.0, d), 1.8);
                float core = smoothstep(uCoreSize, 0.0, d);
                gl_FragColor = vec4(mix(uColor, uCore, core), glow * uAlpha);
            }
        `,
  });
}

export function makeRingMaterial(THREE, colorHex) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uRadius: { value: 0.0 }, uWidth: { value: 0.05 }, uAlpha: { value: 1.0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
            varying vec2 vUv;
            uniform vec3 uColor; uniform float uRadius; uniform float uWidth; uniform float uAlpha;
            void main(){
                vec2 c = vUv - 0.5;
                float d = length(c) * 2.0;
                float ring = smoothstep(uWidth, 0.0, abs(d - uRadius));
                gl_FragColor = vec4(uColor, ring * uAlpha);
            }
        `,
  });
}

// =====================================================================
// Impact flash (glow radial + anel expansivo)
// =====================================================================
export function createImpactFx(ctx) {
  const { THREE, scene } = ctx;
  const impactGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), makeGlowMaterial(THREE, 0xffffff));
  impactGlow.visible = false; scene.add(impactGlow);

  const impactRing = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), makeRingMaterial(THREE, 0xffffff));
  impactRing.visible = false; scene.add(impactRing);

  let impactFx = null;
  const TARGET = new THREE.Vector3(VFX_TARGET.x, VFX_TARGET.y, VFX_TARGET.z);

  function billboard(mesh) { mesh.quaternion.copy(ctx.camera.quaternion); }

  function trigger(position, colorHex, scale = 1, duration = 0.7) {
    impactGlow.position.copy(position);
    impactGlow.visible = true;
    impactGlow.material.uniforms.uColor.value.set(colorHex);
    impactRing.position.copy(position);
    impactRing.visible = true;
    impactRing.material.uniforms.uColor.value.set(colorHex);
    impactFx = { elapsed: 0, duration, scale };
  }

  function update(dt) {
    if (!impactFx) return;
    impactFx.elapsed += dt;
    const t = impactFx.elapsed / impactFx.duration;

    billboard(impactGlow);
    impactGlow.scale.setScalar((0.6 + t * 6) * impactFx.scale);
    impactGlow.material.uniforms.uAlpha.value = Math.max(0, 1 - t);

    billboard(impactRing);
    impactRing.material.uniforms.uRadius.value = t;
    impactRing.material.uniforms.uAlpha.value = Math.max(0, 1 - t) * 0.9;

    if (t >= 1) {
      impactGlow.visible = false;
      impactRing.visible = false;
      impactFx = null;
    }
  }

  function dispose() {
    scene.remove(impactGlow, impactRing);
  }

  return { trigger, update, dispose, impactGlow, impactRing };
}

// =====================================================================
// Sistema de partículas (textura suave + vertex colors + fade/shrink)
// =====================================================================
export function createParticleSystem(ctx, softTex) {
  const { THREE, scene } = ctx;
  const TARGET = new THREE.Vector3(VFX_TARGET.x, VFX_TARGET.y, VFX_TARGET.z);
  let active = [];

  function spawn(config) {
    const {
      position, count, color1, color2 = null, size, sizeVariance = 0,
      speedMin, speedMax, gravity, life, lifeVariance = 0, spread,
      upward = false, drag = 0, shrink = false,
    } = config;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = [];
    const lives = [];

    const c1 = new THREE.Color(color1);
    const c2 = color2 !== null ? new THREE.Color(color2) : c1;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * spread;

      const mixed = c1.clone().lerp(c2, Math.random());
      colors[i * 3] = mixed.r; colors[i * 3 + 1] = mixed.g; colors[i * 3 + 2] = mixed.b;
      sizes[i] = size + (Math.random() - 0.5) * sizeVariance;

      let dir;
      if (upward) {
        dir = new THREE.Vector3((Math.random() - 0.5) * 0.6, 1, (Math.random() - 0.5) * 0.6).normalize();
      } else {
        dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        if (gravity > 0 && dir.y < 0) dir.y *= -1;
      }
      velocities.push(dir.multiplyScalar(speedMin + Math.random() * (speedMax - speedMin)));
      lives.push(life + (Math.random() - 0.5) * lifeVariance);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size, map: softTex, vertexColors: true, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);
    active.push({
      points, velocities, lives, maxLives: [...lives], sizes,
      baseSize: size, gravity, drag, shrink, life: 0,
    });
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const b = active[i];
      const pos = b.points.geometry.attributes.position.array;
      let allDead = true;

      for (let j = 0; j < b.velocities.length; j++) {
        b.lives[j] -= dt;
        if (b.lives[j] > 0) allDead = false;

        b.velocities[j].y -= b.gravity * dt;
        if (b.drag) b.velocities[j].multiplyScalar(1 - b.drag * dt);

        pos[j * 3] += b.velocities[j].x * dt;
        pos[j * 3 + 1] += b.velocities[j].y * dt;
        pos[j * 3 + 2] += b.velocities[j].z * dt;
      }
      b.points.geometry.attributes.position.needsUpdate = true;

      const avgLifeFrac = b.lives.reduce(
        (s, l, idx) => s + Math.max(0, l / b.maxLives[idx]), 0
      ) / b.lives.length;
      b.points.material.opacity = Math.max(0, avgLifeFrac);
      if (b.shrink) b.points.material.size = b.baseSize * (0.3 + 0.7 * avgLifeFrac);

      if (allDead) {
        scene.remove(b.points);
        b.points.geometry.dispose();
        b.points.material.dispose();
        active.splice(i, 1);
      }
    }
  }

  function dispose() {
    for (const b of active) {
      scene.remove(b.points);
      b.points.geometry.dispose();
      b.points.material.dispose();
    }
    active = [];
  }

  return { spawn, update, dispose, count: () => active.length };
}

// =====================================================================
// Destroços 3D (rochas reais para o terremoto)
// =====================================================================
export function createDebrisSystem(ctx) {
  const { THREE, scene } = ctx;
  const TARGET = new THREE.Vector3(VFX_TARGET.x, VFX_TARGET.y, VFX_TARGET.z);
  let active = [];
  const debrisGeo = new THREE.IcosahedronGeometry(0.18, 0);
  const debrisMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9, metalness: 0.05 });
  ctx.disposables.push(debrisGeo, debrisMat);

  function spawn(position, count) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(debrisGeo, debrisMat);
      mesh.position.copy(position);
      mesh.scale.setScalar(0.6 + Math.random() * 0.8);
      scene.add(mesh);
      const dir = new THREE.Vector3((Math.random() - 0.5), Math.random() * 1.2 + 0.4, (Math.random() - 0.5)).normalize();
      const vel = dir.multiplyScalar(2 + Math.random() * 4);
      const angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8
      );
      active.push({ mesh, vel, angVel, life: 0, maxLife: 1.6 + Math.random() * 0.6 });
    }
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const d = active[i];
      d.life += dt;
      d.vel.y -= 9 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.angVel.x * dt;
      d.mesh.rotation.y += d.angVel.y * dt;
      d.mesh.rotation.z += d.angVel.z * dt;

      if (d.mesh.position.y <= TARGET.y - 0.1) {
        d.mesh.position.y = TARGET.y - 0.1;
        d.vel.y *= -0.3; d.vel.x *= 0.7; d.vel.z *= 0.7;
      }
      const fade = Math.max(0, 1 - d.life / d.maxLife);
      d.mesh.material.opacity = fade;
      d.mesh.material.transparent = true;

      if (d.life >= d.maxLife) {
        scene.remove(d.mesh);
        active.splice(i, 1);
      }
    }
  }

  function dispose() {
    for (const d of active) scene.remove(d.mesh);
    active = [];
  }

  return { spawn, update, dispose, count: () => active.length };
}