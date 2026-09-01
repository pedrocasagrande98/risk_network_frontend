/**
 * Testes do EventContext — o estado do evento ativo que orquestra
 * flyTo (mapa) + VFX (overlay) + fetch GEE (hook).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { EventProvider, useActiveEvent } from './EventContext';

const wrapper = ({ children }) => <EventProvider>{children}</EventProvider>;

describe('EventContext', () => {
  it('começa sem evento ativo', () => {
    const { result } = renderHook(() => useActiveEvent(), { wrapper });
    expect(result.current.activeEvent).toBeNull();
  });

  it('triggerEvent publica o evento (orquestra flyTo/VFX/GEE)', () => {
    const { result } = renderHook(() => useActiveEvent(), { wrapper });

    act(() => {
      result.current.triggerEvent({
        type: 'Queimada', latitude: -23.55, longitude: -46.63, severity: 'Critica',
      });
    });

    expect(result.current.activeEvent).toMatchObject({
      type: 'Queimada', latitude: -23.55, longitude: -46.63,
    });
  });

  it('eventos idênticos consecutivos geram re-render (timestamp interno)', () => {
    const { result } = renderHook(() => useActiveEvent(), { wrapper });

    const ev = { type: 'Geada', latitude: 1, longitude: 2 };
    act(() => { result.current.triggerEvent(ev); });
    const first = result.current.activeEvent;
    act(() => { result.current.triggerEvent(ev); });
    const second = result.current.activeEvent;

    expect(second._ts).toBeGreaterThanOrEqual(first._ts);
  });

  it('clearEvent limpa o estado (remove VFX do DOM via consumidor)', () => {
    const { result } = renderHook(() => useActiveEvent(), { wrapper });

    act(() => { result.current.triggerEvent({ type: 'Inundacao', latitude: 0, longitude: 0 }); });
    expect(result.current.activeEvent).not.toBeNull();

    act(() => { result.current.clearEvent(); });
    expect(result.current.activeEvent).toBeNull();
  });

  it('fora do provider lança erro explícito', () => {
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    expect(() => renderHook(() => useActiveEvent())).toThrow(/EventProvider/);
    spy.mockRestore();
  });
});