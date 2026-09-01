/**
 * GEETileLayer — adiciona ao mapa a camada raster do Google Earth Engine.
 * Recebe a URL do tile_fetcher (via useGEELayer) e monta um TileLayer Leaflet.
 */
import { TileLayer } from 'react-leaflet';

export default function GEETileLayer({ tileUrl, eventType }) {
  if (!tileUrl) return null;
  return (
    <TileLayer
      key={tileUrl}
      url={tileUrl}
      attribution={`Map Data &copy; Google Earth Engine — camada ${eventType || 'GEE'}`}
      opacity={0.85}
    />
  );
}