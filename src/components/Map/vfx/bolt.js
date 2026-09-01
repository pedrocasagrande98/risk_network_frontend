/**
 * VFX Lightning — Tempestade (raios ramificados) e Geada (nevasca fria).
 * Porta do triggerStorm/updateBoltEffect do app.js original.
 */
import { VFX_TARGET, VFX_START, pulseLight, screenFlash } from './shared';

const WORLD_UP = { x: 0, y: 1, z: 0 };
const WORLD_RIGHT = { x: 1, y: 0, z: 0 };

export const BOLT_SETTINGS = {
  flicker: 24, intensity: 1.7, coreWidth: 0.07, chaos: 1.4, particleCount: 90,
};

export function createBoltEffect(ctx, particles) {
  const { THREE, scene } = ctx;

  const TARGET = new THREE.Vector3(VFX_TARGET.x, VFX_TARGET.y, VFX_TARGET.z);
  const START = new THREE.Vector3(VFX_START.x, VFX_START.y, VFX_START.z);
  const _tangent = new THREE.Vector3(), _viewDir = new THREE.Vector3(), _side = new THREE.Vector3();

  const MAIN_ITER = 6, MAIN_POINTS = 2 ** MAIN_ITER + 1;
  const BRANCH_ITER = 4, BRANCH_POINTS = 2 ** BRANCH_ITER + 1, BRANCH_COUNT = 5;

  const boltSettings = { ...BOLT_SETTINGS };
  let currentBoltTheme = { h: 0, s: 0.0 };

  function currentBoltColor(lightness = 0.5) {
    const c = new THREE.Color();
    c.setHSL(currentBoltTheme.h, currentBoltTheme.s, lightness);
    return c;
  }

  function generateLightningPoints(start, end, iterations, initialDisplace) {
    let points = [start.clone(), end.clone()];
    let displace = initialDisplace;
    for (let iter = 0; iter < iterations; iter++) {
      const next = [points[0]];
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i], p1 = points[i + 1];
        const mid = p0.clone().lerp(p1, 0.5);
        const axis = p1.clone().sub(p0);
        if (axis.lengthSq() > 1e-8) axis.normalize(); else axis.set(0, 0, 1);
        let perpA = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(WORLD_UP.x, WORLD_UP.y, WORLD_UP.z));
        if (perpA.lengthSq() < 1e-6) {
          perpA = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(WORLD_RIGHT.x, WORLD_RIGHT.y, WORLD_RIGHT.z));
        }
        perpA.normalize();
        const perpB = new THREE.Vector3().crossVectors(axis, perpA).normalize();
        mid.addScaledVector(perpA, (Math.random() - 0.5) * 2 * displace);
        mid.addScaledVector(perpB, (Math.random() - 0.5) * 2 * displace * 0.6);
        next.push(mid, p1);
      }
      points = next;
      displace *= 0.55;
    }
    return points;
  }

  function makeRibbonGeo(n) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(n * 2 * 3);
    const uvs = new Float32Array(n * 2 * 2);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      uvs[i * 4] = 0; uvs[i * 4 + 1] = t; uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = t;
    }
    const indices = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  function fillRibbonPositions(points, cameraPos, width, outArray) {
    const n = points.length;
    const half = width / 2;
    for (let i = 0; i < n; i++) {
      const p = points[i], prev = points[Math.max(i - 1, 0)], next = points[Math.min(i + 1, n - 1)];
      _tangent.subVectors(next, prev);
      if (_tangent.lengthSq() < 1e-8) _tangent.set(0, 0, 1); else _tangent.normalize();
      _viewDir.subVectors(cameraPos, p);
      if (_viewDir.lengthSq() < 1e-8) _viewDir.set(0, 0, 1); else _viewDir.normalize();
      _side.crossVectors(_tangent, _viewDir);
      if (_side.lengthSq() < 1e-8) _side.set(1, 0, 0); else _side.normalize();
      const o = i * 6;
      outArray[o] = p.x - _side.x * half; outArray[o + 1] = p.y - _side.y * half; outArray[o + 2] = p.z - _side.z * half;
      outArray[o + 3] = p.x + _side.x * half; outArray[o + 4] = p.y + _side.y * half; outArray[o + 5] = p.z + _side.z * half;
    }
  }

  const makeRibbonMaterial = (colorHex, alphaBase) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(colorHex) }, uAlpha: { value: alphaBase } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
            varying vec2 vUv; uniform vec3 uColor; uniform float uAlpha;
            void main(){
                float edge = abs(vUv.x - 0.5) * 2.0;
                float fall = pow(1.0 - edge, 1.6);
                float endFade = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
                gl_FragColor = vec4(uColor, fall * uAlpha * endFade);
            }
        `,
  });

  const mainHaloGeo = makeRibbonGeo(MAIN_POINTS);
  const mainHaloMat = makeRibbonMaterial(0x3b0764, 0.6);
  const mainHaloMesh = new THREE.Mesh(mainHaloGeo, mainHaloMat);
  mainHaloMesh.visible = false; scene.add(mainHaloMesh);

  const mainCoreGeo = makeRibbonGeo(MAIN_POINTS);
  const mainCoreMat = makeRibbonMaterial(0xffffff, 1.0);
  const mainCoreMesh = new THREE.Mesh(mainCoreGeo, mainCoreMat);
  mainCoreMesh.visible = false; scene.add(mainCoreMesh);

  const branchGeos = [], branchMeshes = [];
  for (let b = 0; b < BRANCH_COUNT; b++) {
    const geo = makeRibbonGeo(BRANCH_POINTS);
    const mat = makeRibbonMaterial(0xc084fc, 0.55);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false; scene.add(mesh);
    branchGeos.push(geo); branchMeshes.push(mesh);
  }
  ctx.disposables.push(mainHaloGeo, mainHaloMat, mainCoreGeo, mainCoreMat, ...branchGeos, ...branchMeshes);

  let mainPoints = null;
  let branchPointsArr = [];
  let activeCast = null;

  function regenerateBolt() {
    const chaos = boltSettings.chaos;
    mainPoints = generateLightningPoints(START, TARGET, MAIN_ITER, 0.9 * chaos);
    branchPointsArr = [];
    const fractions = [0.15, 0.35, 0.55, 0.7, 0.85].slice(0, BRANCH_COUNT);
    for (const frac of fractions) {
      const idx = Math.round(frac * (mainPoints.length - 1));
      const anchor = mainPoints[idx];
      const prevIdx = Math.max(idx - 1, 0), nextIdx = Math.min(idx + 1, mainPoints.length - 1);
      const tangent = mainPoints[nextIdx].clone().sub(mainPoints[prevIdx]).normalize();
      let perp = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0));
      if (perp.lengthSq() < 1e-6) perp = new THREE.Vector3(1, 0, 0);
      perp.normalize();
      const sign = Math.random() < 0.5 ? -1 : 1;
      const branchLen = 0.8 + Math.random() * 1.6;
      const end = anchor.clone().addScaledVector(tangent, branchLen * 0.3).addScaledVector(perp, branchLen * sign);
      branchPointsArr.push(generateLightningPoints(anchor, end, BRANCH_ITER, 0.4 * chaos));
    }
  }

  function refreshRibbons() {
    if (!mainPoints) return;
    const core = boltSettings.coreWidth;
    const halo = core * 6;
    const branchW = core * 1.4;
    fillRibbonPositions(mainPoints, ctx.camera.position, halo, mainHaloGeo.attributes.position.array);
    mainHaloGeo.attributes.position.needsUpdate = true;
    fillRibbonPositions(mainPoints, ctx.camera.position, core, mainCoreGeo.attributes.position.array);
    mainCoreGeo.attributes.position.needsUpdate = true;
    for (let b = 0; b < BRANCH_COUNT; b++) {
      fillRibbonPositions(branchPointsArr[b], ctx.camera.position, branchW, branchGeos[b].attributes.position.array);
      branchGeos[b].attributes.position.needsUpdate = true;
    }
  }

  function update(dt, container) {
    if (!activeCast || activeCast.type !== 'bolt') return;
    const cast = activeCast;

    if (cast.phase === 'strike') {
      cast.elapsed += dt;
      if (cast.elapsed >= cast.nextRestrike) {
        regenerateBolt();
        cast.nextRestrike = cast.elapsed + THREE.MathUtils.clamp(1 / boltSettings.flicker, 0.015, 0.16);
        const p = mainPoints[Math.floor(Math.random() * mainPoints.length)];
        particles.spawn({
          position: p, count: 4,
          color1: currentBoltColor(0.85).getHex(), color2: currentBoltColor(0.5).getHex(),
          size: 0.1, speedMin: 0.5, speedMax: 2.2, gravity: 0.2, life: 0.3,
          spread: 0, shrink: true,
        });
        pulseLight(ctx, currentBoltColor(0.6).getHex(), 3.5, 8);
      }
      refreshRibbons();
      const envelope =
        Math.min(cast.elapsed / 0.03, 1) *
        (1 - THREE.MathUtils.clamp((cast.elapsed - cast.holdTime * 0.65) / (cast.holdTime * 0.35), 0, 1)) *
        boltSettings.intensity;
      const flicker = 0.7 + Math.random() * 0.3;

      mainHaloMat.uniforms.uColor.value = currentBoltColor(0.26);
      mainHaloMat.uniforms.uAlpha.value = envelope * flicker * 0.75;
      mainCoreMat.uniforms.uColor.value = currentBoltColor(0.9);
      mainCoreMat.uniforms.uAlpha.value = envelope * flicker;
      for (const mesh of branchMeshes) {
        mesh.material.uniforms.uColor.value = currentBoltColor(0.5);
        mesh.material.uniforms.uAlpha.value = envelope * flicker * 0.55;
      }

      if (cast.elapsed >= cast.holdTime) {
        cast.phase = 'impact';
        cast.elapsed = 0;
        mainHaloMesh.visible = false;
        mainCoreMesh.visible = false;
        branchMeshes.forEach((m) => { m.visible = false; });
        ctx.shake.time = 0.32;
        ctx.shake.strength = 7;
        screenFlash(container, 0.5, '#ffffff');
        pulseLight(ctx, currentBoltColor(0.7).getHex(), 6, 5);
      }
    } else if (cast.phase === 'impact') {
      cast.elapsed += dt / 0.5;
      if (cast.elapsed >= 1) activeCast = null;
    }
  }

  /** isIce=false → Tempestade (roxo); isIce=true → Geada (azul). */
  function trigger(isIce, container, onImpact, impact) {
    if (activeCast) return;
    currentBoltTheme = isIce ? { h: 195 / 360, s: 1.0 } : { h: 265 / 360, s: 0.7 };
    screenFlash(container, 0.6, isIce ? '#38bdf8' : '#a855f7');
    activeCast = { type: 'bolt', phase: 'strike', elapsed: 0, holdTime: 0.4, nextRestrike: 0, isIce };
    activeCast.onImpact = onImpact || null;
    activeCast.impact = impact || null;
    regenerateBolt();
    mainHaloMesh.visible = true;
    mainCoreMesh.visible = true;
    branchMeshes.forEach((m) => { m.visible = true; });
  }

  function dispose() {
    scene.remove(mainHaloMesh, mainCoreMesh, ...branchMeshes);
    activeCast = null;
  }

  return { trigger, update, dispose, isCasting: () => !!activeCast };
}