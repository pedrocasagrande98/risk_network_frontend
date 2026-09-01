/**
 * MapEventsHandler — cliques no mapa alimentam lat/lng do formulário.
 * (Extraído verbatim do GeoRisk.jsx)
 */
import { useMapEvents } from 'react-leaflet';

export default function MapEventsHandler({ setLatitude, setLongitude }) {
  useMapEvents({
    click(e) {
      setLatitude(e.latlng.lat.toFixed(6));
      setLongitude(e.latlng.lng.toFixed(6));
    },
  });
  return null;
}