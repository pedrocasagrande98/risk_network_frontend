/**
 * Matriz de despacho do overlay — para CADA tipo de evento, o subsistema VFX
 * correto deve ser acionado e o fetch GEE agendado com o delay do elemento.
 * Subsistemas mockados; criação do contexto Three.js simulada (ok:true).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

const h = vi.hoisted(() => {
  const makeSub = () => ({
    trigger: vi.fn(), update: vi.fn(), dispose: vi.fn(),
    isActive: () => false, isCasting: () => false,
    spawn: vi.fn(), count: () => 0,
  });
  return {
    subs: {
      impactFx: makeSub(), particles: makeSub(), debris: makeSub(),
      bolt: makeSub(), fire: makeSub(), water: makeSub(),
      earth: makeSub(), frost: makeSub(),
    },
    screenFlash: vi.fn(),
    pulseLight: vi.fn(),
    updateCamera: vi.fn(),
    disposeCtx: vi.fn(),
  };
});

vi.mock('./vfx/shared', () => ({
  createVFXContext: () => ({
    ok: true,
    scene: {},
    camera: {},
    renderer: {
      setSize: vi.fn(), setPixelRatio: vi.fn(), render: vi.fn(),
      dispose: vi.fn(), domElement: document.createElement('div'),
    },
    dynamicLight: { color: { set: () => {}, getHex: () => 0 }, intensity: 0, position: { set: () => {} } },
    clock: { update: () => {}, getDelta: () => 0.016 },
    disposables: [],
    shake: { time: 0, strength: 0 },
    camTarget: {},
  }),
  disposeVFXContext: h.disposeCtx,
  updateCamera: h.updateCamera,
  makeSoftCircleTexture: () => ({}),
  createImpactFx: () => h.subs.impactFx,
  createParticleSystem: () => h.subs.particles,
  createDebrisSystem: () => h.subs.debris,
  pulseLight: h.pulseLight,
  screenFlash: h.screenFlash,
}));
vi.mock('./vfx/bolt', () => ({ createBoltEffect: () => h.subs.bolt }));
vi.mock('./vfx/fire', () => ({
  createFireEffect: () => h.subs.fire,
  createWaterEffect: () => h.subs.water,
}));
vi.mock('./vfx/earthFrost', () => ({
  createEarthEffect: () => h.subs.earth,
  createFrostEffect: () => h.subs.frost,
}));

import ThreeVFXOverlay, { GEE_TRIGGER_DELAY } from './ThreeVFXOverlay';

const { subs } = h;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const CASES = [
  { type: 'Tempestade', delay: 400 },
  { type: 'Geada', delay: 2000 },
  { type: 'Queimada', delay: 1500 },
  { type: 'Desmoronamento', delay: 800 },
  { type: 'Inundacao', delay: 800 },
];

describe('ThreeVFXOverlay — matriz de despacho por elemento', () => {
  for (const { type, delay } of CASES) {
    it(`"${type}" aciona o subsistema correto e agenda GEE em ${delay}ms`, () => {
      const onGEETileRequest = vi.fn();
      const { unmount } = render(
        <ThreeVFXOverlay
          event={{ type, latitude: -23.55, longitude: -46.63 }}
          onGEETileRequest={onGEETileRequest}
        />
      );

      // Subsistema acionado (exatamente o do elemento)
      expect(subs.bolt.trigger).toHaveBeenCalledTimes(type === 'Tempestade' || type === 'Geada' ? 1 : 0);
      if (['Tempestade', 'Geada'].includes(type)) {
        expect(subs.bolt.trigger.mock.calls[0][0]).toBe(type === 'Geada'); // isIce
      }
      expect(subs.fire.trigger).toHaveBeenCalledTimes(type === 'Queimada' ? 1 : 0);
      expect(subs.earth.trigger).toHaveBeenCalledTimes(type === 'Desmoronamento' ? 1 : 0);
      expect(subs.water.trigger).toHaveBeenCalledTimes(type === 'Inundacao' ? 1 : 0);
      if (type === 'Queimada') {
        expect(h.screenFlash).toHaveBeenCalledWith(expect.anything(), 0.3, '#ef4444');
        expect(subs.impactFx.trigger).toHaveBeenCalled();
      }

      // Delay GEE por elemento (não dispara antes; dispara no tempo exato)
      expect(onGEETileRequest).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(delay - 1); });
      expect(onGEETileRequest).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(1); });
      expect(onGEETileRequest).toHaveBeenCalledWith(type);
      unmount();
    });
  }

  it('Queimada: fire.trigger(1.8) fiel ao app.js', () => {
    render(<ThreeVFXOverlay event={{ type: 'Queimada' }} onGEETileRequest={vi.fn()} />);
    expect(subs.fire.trigger).toHaveBeenCalledWith(1.8);
  });
});