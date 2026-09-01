/**
 * Testes do ThreeVFXOverlay — integração React/Three.js.
 *
 * No jsdom não há WebGL: o overlay deve montar sem crash, permanecer inofensivo
 * e desmontar limpando timers (dispose path). Validamos também o agendamento
 * do callback onGEETileRequest com os delays cinematográficos corretos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ThreeVFXOverlay, { GEE_TRIGGER_DELAY } from './ThreeVFXOverlay';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ThreeVFXOverlay', () => {
  it('renderiza o container vfx mesmo sem WebGL (jsdom)', () => {
    const { unmount } = render(
      <ThreeVFXOverlay event={null} onGEETileRequest={vi.fn()} />
    );
    expect(screen.getByTestId('vfx-container')).toBeInTheDocument();
    unmount();
  });

  it('agenda onGEETileRequest com o delay correto para Queimada (1500ms)', () => {
    const onGEETileRequest = vi.fn();
    const { unmount } = render(
      <ThreeVFXOverlay
        event={{ type: 'Queimada', latitude: -23.5, longitude: -46.6 }}
        onGEETileRequest={onGEETileRequest}
      />
    );

    expect(onGEETileRequest).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1400); });
    expect(onGEETileRequest).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onGEETileRequest).toHaveBeenCalledWith('Queimada');
    unmount();
  });

  it('não dispara o callback para eventos sem delay definido', () => {
    const onGEETileRequest = vi.fn();
    const { unmount } = render(
      <ThreeVFXOverlay
        event={{ type: 'TerremotoMagico', latitude: 0, longitude: 0 }}
        onGEETileRequest={onGEETileRequest}
      />
    );

    act(() => { vi.advanceTimersByTime(10000); });
    expect(onGEETileRequest).not.toHaveBeenCalled();
    unmount();
  });

  it('cancela o agendamento ao desmontar (sem callback órfão — dispose path)', () => {
    const onGEETileRequest = vi.fn();
    const { unmount } = render(
      <ThreeVFXOverlay
        event={{ type: 'Queimada', latitude: -23.5, longitude: -46.6 }}
        onGEETileRequest={onGEETileRequest}
      />
    );

    unmount();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onGEETileRequest).not.toHaveBeenCalled();
  });

  it('GEE_TRIGGER_DELAY cobre os 5 tipos de evento do domínio', () => {
    expect(Object.keys(GEE_TRIGGER_DELAY).sort()).toEqual(
      ['Desmoronamento', 'Geada', 'Inundacao', 'Queimada', 'Tempestade'].sort()
    );
    expect(GEE_TRIGGER_DELAY.Queimada).toBe(1500);
    expect(GEE_TRIGGER_DELAY.Tempestade).toBe(400);
  });
});