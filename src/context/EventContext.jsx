/**
 * EventContext — estado global do "Evento de Risco Ativo".
 *
 * Centraliza o evento para que (conforme o plano):
 *  - o Mapa dê o flyTo;
 *  - o ThreeVFXOverlay inicie o VFX 3D;
 *  - o useGEELayer dispare o fetch para o backend.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const EventContext = createContext(null);

export function EventProvider({ children }) {
  // activeEvent: { id?, type, latitude, longitude, severity?, source: 'form'|'marker' }
  const [activeEvent, setActiveEvent] = useState(null);

  const triggerEvent = useCallback((event) => {
    setActiveEvent({
      ...event,
      _ts: Date.now(), // força re-render mesmo p/ eventos idênticos
    });
  }, []);

  const clearEvent = useCallback(() => setActiveEvent(null), []);

  const value = useMemo(
    () => ({ activeEvent, triggerEvent, clearEvent }),
    [activeEvent, triggerEvent, clearEvent]
  );

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useActiveEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error('useActiveEvent deve ser usado dentro de <EventProvider>.');
  }
  return ctx;
}

export default EventContext;