/**
 * FlyToMapCenter — anima a câmera do mapa até o centro ativo.
 * Reage também ao evento ativo do EventContext (flyTo ao clicar/marcar evento).
 */
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useActiveEvent } from '../../context/EventContext';

export default function FlyToMapCenter({ center }) {
  const map = useMap();
  const { activeEvent } = useActiveEvent();

  useEffect(() => {
    if (center) map.flyTo(center, 14);
  }, [center, map]);

  useEffect(() => {
    if (activeEvent?.latitude != null && activeEvent?.longitude != null) {
      map.flyTo([activeEvent.latitude, activeEvent.longitude], 12);
    }
  }, [activeEvent, map]);

  return null;
}