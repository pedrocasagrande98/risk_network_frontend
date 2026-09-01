/**
 * Testes por ELEMENTO (tipo de evento) — cada efeito VFX do domínio com
 * Three.js REAL (CPU-side, sem WebGL): Queimada, Inundação, Desmoronamento,
 * Tempestade e Geada.
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createBoltEffect } from './bolt';
import { createFireEffect, createWaterEffect } from './fire';
import { createEarthEffect, createFrostEffect } from './earthFrost';

function makeCtx() {
  return {
    THREE,
    scene: new THREE.Scene(),
    camera: { position: new THREE.Vector3(0, 3, 10) },
    dynamicLight: new THREE.PointLight(0xffffff, 0, 30, 2),
    clock: new THREE.Timer(),
    disposables: [],
    shake: { time: 0, strength: 0 },
    camTarget: new THREE.Vector3(),
  };
}

const particlesMock = () => ({ spawn: vi.fn(), update: vi.fn(), dispose: vi.fn() });
const impactMock = () => ({ trigger: vi.fn(), update: vi.fn(), dispose: vi.fn() });
const debrisMock = () => ({ spawn: vi.fn(), update: vi.fn(), dispose: vi.fn() });

function makeContainer() {
  const container = document.createElement('div');
  const flash = document.createElement('div');
  flash.className = 'vfx-flash';
  container.appendChild(flash);
  return container;
}

describe('VFX por elemento — Queimada (fire)', () => {
  it('trigger ativa fogo com shake e update gera chamas + luz laranja', () => {
    const ctx = makeCtx();
    const particles = particlesMock();
    const fire = createFireEffect(ctx, particles);

    expect(fire.isActive()).toBe(false);
    fire.trigger(1.8);
    expect(fire.isActive()).toBe(true);
    expect(ctx.shake.time).toBeCloseTo(0.2);
    expect(ctx.shake.strength).toBe(4);

    fire.update(0.016); // um tick
    expect(particles.spawn).toHaveBeenCalled();
    const core = particles.spawn.mock.calls[0][0];
    expect(core.count).toBe(6);           // núcleo de chamas
    expect(core.gravity).toBe(-2.0);       // sobe (gravidade invertida)
    expect(core.color1).toBe(0xffe066);   // amarelo
    expect(core.color2).toBe(0xff3300);   // vermelho
    expect(ctx.dynamicLight.color.getHex()).toBe(0xff6a00);
    expect(ctx.dynamicLight.intensity).toBeGreaterThanOrEqual(2);

    fire.update(2.0); // expira o timer (1.8s)
    expect(fire.isActive()).toBe(false);
    expect(ctx.dynamicLight._decay).toBe(4); // luz apaga suavemente
  });
});

describe('VFX por elemento — Inundacao (water)', () => {
  it('gota cai, impacto dispara onda + splash (220/60 partículas) e Colorado', () => {
    const ctx = makeCtx();
    const particles = particlesMock();
    const impactFx = impactMock();
    const screenFlashFn = vi.fn();
    const water = createWaterEffect(ctx, particles, impactFx, makeContainer(), screenFlashFn);

    expect(water.isActive()).toBe(false);
    water.trigger();
    expect(water.isActive()).toBe(true);

    water.update(0.6); // drop cai 15→-3 e atinge o chão
    expect(impactFx.trigger).toHaveBeenCalledTimes(1);
    const [, waveColor, waveScale, waveDur] = impactFx.trigger.mock.calls[0];
    expect(waveColor).toBe(0x38bdf8);
    expect(waveScale).toBe(0.9);
    expect(waveDur).toBe(0.6);
    expect(screenFlashFn).toHaveBeenCalledWith(expect.anything(), 0.5, '#0ea5e9');
    expect(ctx.shake.time).toBeCloseTo(0.4);
    expect(ctx.shake.strength).toBe(5);

    const counts = particles.spawn.mock.calls.map((c) => c[0].count);
    expect(counts).toContain(220); // onda de água
    expect(counts).toContain(60);  // espuma branca

    water.update(1.4); // onda (1.2s) conclui
    water.update(3.0); // fase pós-impacto conclui
    expect(water.isActive()).toBe(false);
  });

  it('não reinicia enquanto há splash/onda ativa', () => {
    const ctx = makeCtx();
    const water = createWaterEffect(ctx, particlesMock(), impactMock(), makeContainer(), vi.fn());
    water.trigger();
    water.trigger(); // ignorado
    water.update(0.6);
    water.update(3.0);
    water.trigger(); // agora pode
    expect(water.isActive()).toBe(true);
  });
});

describe('VFX por elemento — Desmoronamento (earth)', () => {
  it('rachadura + destroços 3D (22) + poeira (70), depois fecha', () => {
    const ctx = makeCtx();
    const particles = particlesMock();
    const debris = debrisMock();
    const impactFx = impactMock();
    const earth = createEarthEffect(ctx, particles, debris, impactFx, makeContainer());

    expect(earth.isActive()).toBe(false);
    earth.trigger();
    expect(earth.isActive()).toBe(true);
    expect(debris.spawn).toHaveBeenCalledTimes(1);
    expect(debris.spawn.mock.calls[0][1]).toBe(22);
    const dust = particles.spawn.mock.calls[0][0];
    expect(dust.count).toBe(70);
    expect(dust.gravity).toBe(3.0); // poeira cai
    expect(ctx.shake.time).toBeCloseTo(0.5);
    expect(ctx.shake.strength).toBe(8);
    const [, color, scale] = impactFx.trigger.mock.calls[0];
    expect(color).toBe(0xd97706);
    expect(scale).toBe(0.8);

    earth.update(1.0);
    earth.update(1.0); // progress 1.6 > 1.2
    expect(earth.isActive()).toBe(false);
  });
});

describe('VFX por elemento — Tempestade (bolt roxo)', () => {
  it('raio reposiciona, impacta com shake/flash e finaliza', () => {
    const ctx = makeCtx();
    const particles = particlesMock();
    const container = makeContainer();
    const bolt = createBoltEffect(ctx, particles);

    expect(bolt.isCasting()).toBe(false);
    bolt.trigger(false, container);
    expect(bolt.isCasting()).toBe(true);

    // fase strike: 1º frame regenera raio + partículas + pulso de luz
    bolt.update(0.1, container);
    expect(particles.spawn).toHaveBeenCalled();
    const restrike = particles.spawn.mock.calls.find((c) => c[0].count === 4);
    expect(restrike).toBeTruthy();
    expect(ctx.dynamicLight.intensity).toBeGreaterThan(0);

    bolt.update(0.2, container);
    bolt.update(0.15, container); // elapsed 0.45 ≥ holdTime 0.4 → impacto
    expect(ctx.shake.time).toBeCloseTo(0.32);
    expect(ctx.shake.strength).toBe(7);

    bolt.update(0.5, container); // fase impact encerra
    expect(bolt.isCasting()).toBe(false);
  });
});

describe('VFX por elemento — Geada (bolt azul + fog)', () => {
  it('trigger gelado (#38bdf8) com névoa no chão (45) e neve caindo', () => {
    const ctx = makeCtx();
    const particles = particlesMock();
    const impactFx = impactMock();
    const container = makeContainer();
    const frost = createFrostEffect(ctx, particles, impactFx, container);

    expect(frost.isActive()).toBe(false);
    frost.trigger(2.6);
    expect(frost.isActive()).toBe(true);
    expect(ctx.shake.time).toBe(0); // nevasca não chacoalha
    expect(container.querySelector('.vfx-flash').style.opacity).toBe('0.4');
    const [, color, scale] = impactFx.trigger.mock.calls[0];
    expect(color).toBe(0x7dd3fc);
    expect(scale).toBe(0.7);
    const mist = particles.spawn.mock.calls[0][0];
    expect(mist.count).toBe(45);      // névoa fria
    expect(mist.upward).toBe(true);

    frost.update(0.5);
    expect(ctx.dynamicLight.color.getHex()).toBe(0xbae6fd);
    const snow = particles.spawn.mock.calls.find((c) => c[0].count === 7);
    expect(snow).toBeTruthy();        // neve alta
    expect(snow[0].spread).toBe(14.0);

    frost.update(3.0); // expira
    expect(frost.isActive()).toBe(false);
  });
});