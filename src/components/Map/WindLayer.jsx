/**
 * WindLayer — camada de vento (leaflet-velocity) por severidade.
 * (Extraído verbatim do GeoRisk.jsx)
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export const levelStyles = {
  Baixa: { maxVelocity: 15, velocityScale: 0.003, particleAge: 200, particleMultiplier: 1 / 1500, lineWidth: 1.5, colorScale: ["#f8fafc", "#e2e8f0", "#cbd5e1", "#94a3b8"] },
  Media: { maxVelocity: 15, velocityScale: 0.008, particleAge: 120, particleMultiplier: 1 / 1000, lineWidth: 2, colorScale: ["#ffffff", "#f1f5f9", "#e2e8f0", "#cbd5e1"] },
  Critica: { maxVelocity: 15, velocityScale: 0.020, particleAge: 40, particleMultiplier: 1 / 400, lineWidth: 3, colorScale: ["#ffffff", "#ffffff", "#f8fafc", "#f1f5f9"] }
};

export default function WindLayer({ data, severity }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (data && data.length > 0) {
      const styleConfig = levelStyles[severity] || levelStyles.Media;
      layerRef.current = L.velocityLayer({
        displayValues: true,
        displayOptions: {
          velocityType: 'Global Wind',
          position: 'bottomleft',
          emptyString: 'Sem dados de vento',
          angleConvention: 'bearingCW',
          displayPosition: 'bottomleft',
          displayEmptyString: 'Sem dados'
        },
        data: data,
        maxVelocity: styleConfig.maxVelocity,
        velocityScale: styleConfig.velocityScale,
        colorScale: styleConfig.colorScale,
        particleAge: styleConfig.particleAge,
        particleMultiplier: styleConfig.particleMultiplier,
        lineWidth: styleConfig.lineWidth,
      });
      layerRef.current.addTo(map);
    }
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [data, severity, map]);

  return null;
}