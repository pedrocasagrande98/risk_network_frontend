/**
 * VFX Fire & Water — Queimada (chamas contínuas + fagulhas + fumaça) e
 * Inundação (gota caindo + splash + onda circular).
 * Porta do triggerFire/updateFireEffect e triggerWater/updateWaterEffect
 * do app.js original.
 */
import { VFX_TARGET, VFX_START, pulseLight } from './shared';

// =====================================================================
// FIRE (Queimada)
// =====================================================================
export function createFireEffect(ctx, particles) {
  const { THREE } = ctx;
  const TARGET = new THREE.Vector3(VFX_TARGET.x, VFX_TARGET.y, VFX_TARGET.z);
  let fireActive = false;
  let fireTimer = 0;

  function update(dt) {
    if (!fireActive) return;
    fireTimer -= dt;

    // Luz laranja tremulando enquanto o fogo está ativo
    ctx.dynamicLight.color.set(0xff6a00);
    ctx.dynamicLight.intensity = 2 + Math.random() * 1.5;
    ctx.dynamicLight._decay = 0;

    if (fireTimer <= 0) {
      fireActive = false;
      ctx.dynamicLight._decay = 4;
      return;
    }

    // Núcleo de chamas: amarelo -> vermelho, sobe rápido, encolhe
    particles.spawn({
      position: TARGET, count: 6, color1: 0xffe066, color2: 0xff3300, size: 0.28,
      sizeVariance: 0.15, speedMin: 1.5, speedMax: 4.5, gravity: -2.0,
      life: 0.6, lifeVariance: 0.3, spread: 0.5, upward: true, shrink: true, drag: 0.3,
    });

    // Fagulhas vermelhas mais rápidas
    if (Math.random() > 0.4) {
      particles.spawn({
        position: TARGET, count: 3, color1: 0xff5500, color2: 0xffaa00, size: 0.09,
        speedMin: 2.5, speedMax: 6.0, gravity: -1.0, life: 0.7, spread: 0.6,
        upward: true, shrink: true,
      });
    }

    // Fumaça cinza subindo lentamente por cima
    if (Math.random() > 0.6) {
      particles.spawn({
        position: TARGET.clone().add(new THREE.Vector3(0, 0.5, 0)), count: 2,
        color1: 0x555555, color2: 0x222222, size: 0.5, sizeVariance: 0.2,
        speedMin: 0.5, speedMax: 1.2, gravity: -0.3, life: 1.8, spread: 0.4,
        upward: true, drag: 0.2,
      });
    }
  }

  function trigger(duration = 1.8) {
    fireActive = true;
    fireTimer = duration;
    ctx.shake.time = 0.2;
    ctx.shake.strength = 4;
  }

  function dispose() {
    fireActive = false;
  }

  return { trigger, update, dispose, isActive: () => fireActive };
}

// =====================================================================
// WATER SPLASH (Inundação)
// =====================================================================
export function createWaterEffect(ctx, particles, impactFx, container, screenFlashFn) {
  const { THREE, scene } = ctx;
  const TARGET = new THREE.Vector3(VFX_TARGET.x, VFX_TARGET.y, VFX_TARGET.z);
  const START = new THREE.Vector3(VFX_START.x, VFX_START.y, VFX_START.z);

  const waveMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0x38bdf8) },
      uRadius: { value: 0.0 }, uWidth: { value: 0.05 }, uAlpha: { value: 1.0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
            varying vec2 vUv; uniform vec3 uColor; uniform float uRadius; uniform float uWidth; uniform float uAlpha;
            void main(){
                vec2 c = vUv - 0.5; float d = length(c) * 2.0;
                float ring = smoothstep(uWidth, 0.0, abs(d - uRadius));
                gl_FragColor = vec4(uColor, ring * uAlpha);
            }`,
  });
  ctx.disposables.push(waveMat);

  const waveGeo = new THREE.PlaneGeometry(10, 10);
  ctx.disposables.push(waveGeo);
  const waveMesh = new THREE.Mesh(waveGeo, waveMat);
  waveMesh.rotation.x = -Math.PI / 2;
  waveMesh.visible = false;
  scene.add(waveMesh);

  let waterActive = false;
  let waterPhase = 0;
  let waveElapsed = 0;
  let waveActive = false;
  const dropPos = new THREE.Vector3(0, 10, 0);

  function update(dt) {
    if (waveActive) {
      waveElapsed += dt;
      const t = waveElapsed / 1.2;
      waveMat.uniforms.uRadius.value = t;
      waveMat.uniforms.uAlpha.value = Math.max(0, 1 - t);
      if (t >= 1) { waveActive = false; waveMesh.visible = false; }
    }

    if (!waterActive) return;

    if (waterPhase === 0) {
      dropPos.y -= 30 * dt;
      particles.spawn({
        position: dropPos, count: 4, color1: 0x38bdf8, color2: 0x0ea5e9, size: 0.15,
        speedMin: 0, speedMax: 0.5, gravity: 0, life: 0.1, spread: 0.2,
      });

      if (dropPos.y <= TARGET.y) {
        waterPhase = 1;
        ctx.shake.time = 0.4; ctx.shake.strength = 5;
        screenFlashFn(container, 0.5, '#0ea5e9');
        pulseLight(ctx, 0x38bdf8, 4, 5);
        impactFx.trigger(TARGET, 0x38bdf8, 0.9, 0.6);

        waveMesh.position.copy(TARGET);
        waveMesh.visible = true; waveElapsed = 0; waveActive = true;

        particles.spawn({
          position: TARGET, count: 220, color1: 0x38bdf8, color2: 0x0369a1, size: 0.1,
          sizeVariance: 0.05, speedMin: 3.0, speedMax: 12.0, gravity: 8.0,
          life: 1.5, lifeVariance: 0.4, spread: 0.5, shrink: true,
        });
        particles.spawn({
          position: TARGET, count: 60, color1: 0xffffff, color2: 0xbae6fd, size: 0.09,
          speedMin: 5.0, speedMax: 10.0, gravity: 6.0, life: 1.2, spread: 0.2, shrink: true,
        });
      }
    } else {
      waterPhase += dt;
      if (waterPhase > 2.0) waterActive = false;
    }
  }

  function trigger() {
    if (waterActive || waveActive) return;
    waterActive = true;
    waterPhase = 0;
    dropPos.copy(START);
    dropPos.y = 15;
  }

  function dispose() {
    scene.remove(waveMesh);
    waterActive = false;
  }

  return { trigger, update, dispose, isActive: () => waterActive || waveActive };
}