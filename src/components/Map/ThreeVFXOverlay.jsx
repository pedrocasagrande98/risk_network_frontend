/**
 * ThreeVFXOverlay — Componente React de efeitos climáticos 3D (Three.js).
 *
 * SRP: recebe o evento ativo via props e renderiza o canvas 3D de forma
 * independente sobre o mapa Leaflet (pointer-events: none).
 *
 * - Monta cena/camera/renderer uma vez; reage a mudanças de `event`.
 * - Ao trocar de evento ou desmontar, faz dispose completo (sem leak de GPU).
 * - Sem WebGL (jsdom/CI), desabilita silenciosamente.
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  createVFXContext, disposeVFXContext, updateCamera,
  makeSoftCircleTexture, createImpactFx, createParticleSystem,
  createDebrisSystem, pulseLight, screenFlash,
} from './vfx/shared';
import { createBoltEffect } from './vfx/bolt';
import { createFireEffect, createWaterEffect } from './vfx/fire';
import { createEarthEffect, createFrostEffect } from './vfx/earthFrost';

const CONTAINER_STYLE = {
  position: 'absolute',
  inset: 0,
  zIndex: 500,
  pointerEvents: 'none',
};

const FLASH_STYLE = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'transparent',
  opacity: 0,
  pointerEvents: 'none',
};

// Coordenada Y do alvo VFX no chão da cena (fiel ao app.js: TARGET y=-1)
const VFX_Y = -1;

// Delays p/ disparo da camada GEE após o início do VFX (fiel ao app.js)
export const GEE_TRIGGER_DELAY = {
  Tempestade: 400,
  Queimada: 1500,
  Desmoronamento: 800,
  Inundacao: 800,
  Geada: 2000,
};

export default function ThreeVFXOverlay({ event, onGEETileRequest }) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);   // contexto Three + subsistemas
  const timerRef = useRef(null);
  const rafRef = useRef(null);

  // ------------------------------------------------------------------ //
  // Setup/teardown do motor 3D (uma vez por evento; dispose total)
  // ------------------------------------------------------------------ //
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const ctx = createVFXContext(container, THREE, {
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight,
    });
    if (!ctx.ok) {
      // WebGL indisponível (testes/CI): componente permanece inofensivo
      return undefined;
    }

    const softTex = makeSoftCircleTexture(THREE);
    ctx.disposables.push(softTex);

    const particles = createParticleSystem(ctx, softTex);
    const debris = createDebrisSystem(ctx);
    const impactFx = createImpactFx(ctx);
    const bolt = createBoltEffect(ctx, particles);
    const fire = createFireEffect(ctx, particles);
    const water = createWaterEffect(ctx, particles, impactFx, container, screenFlash);
    const earth = createEarthEffect(ctx, particles, debris, impactFx, container);
    const frost = createFrostEffect(ctx, particles, impactFx, container);

    engineRef.current = {
      ctx, particles, debris, impactFx, bolt, fire, water, earth, frost,
    };

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      // THREE.Timer exige .update() a cada frame antes do getDelta
      // (diferente de Clock, que era auto-update no getDelta)
      ctx.clock.update();
      const dt = Math.min(ctx.clock.getDelta(), 0.05);
      updateCamera(ctx, dt);
      bolt.update(dt, container);
      fire.update(dt);
      water.update(dt);
      earth.update(dt);
      frost.update(dt);
      particles.update(dt);
      debris.update(dt);
      impactFx.update(dt);
      ctx.renderer.render(ctx.scene, ctx.camera);
    };
    animate();

    const onResize = () => {
      ctx.camera.aspect = window.innerWidth / window.innerHeight;
      ctx.camera.updateProjectionMatrix();
      ctx.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      rafRef.current = null;
      engineRef.current = null;
      disposeVFXContext(ctx);
    };
  }, []);

  // ------------------------------------------------------------------ //
  // Dispara o efeito correspondente ao evento ativo
  // (roda após o effect de setup; se o motor não estiver pronto — ex:
  //  sem WebGL em jsdom/CI — ainda agenda o fetch GEE pelo delay)
  // ------------------------------------------------------------------ //
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !event) return undefined;

    const engine = engineRef.current;
    if (engine) {
      const { bolt, fire, water, earth, frost } = engine;
      switch (event.type) {
        case 'Tempestade':
          bolt.trigger(false, container);
          break;
        case 'Geada':
          bolt.trigger(true, container);
          break;
        case 'Queimada':
          fire.trigger(1.8);
          screenFlash(container, 0.3, '#ef4444');
          engine.impactFx.trigger(
            new THREE.Vector3(VFX_Y, VFX_Y, VFX_Y), 0xff6a00, 0.6, 0.5
          );
          break;
        case 'Desmoronamento':
          earth.trigger();
          break;
        case 'Inundacao':
          water.trigger();
          break;
        default:
          break;
      }
    }

    // Agenda a busca da camada GEE (independe do WebGL)
    if (onGEETileRequest && GEE_TRIGGER_DELAY[event.type]) {
      timerRef.current = setTimeout(() => {
        onGEETileRequest(event.type);
      }, GEE_TRIGGER_DELAY[event.type]);
    }

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [event, onGEETileRequest]);

  return (
    <div ref={containerRef} style={CONTAINER_STYLE} data-testid="vfx-container">
      <div className="vfx-flash" style={FLASH_STYLE} />
    </div>
  );
}
