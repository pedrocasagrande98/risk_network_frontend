import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-velocity/dist/leaflet-velocity.css';
import 'leaflet-velocity';
import api from '../services/api';
import MapFilterControl from '../components/MapFilterControl';
import { EventProvider, useActiveEvent } from '../context/EventContext';
import {
  MapEventsHandler, FlyToMapCenter, WindLayer,
  ThreeVFXOverlay, useGEELayer, GEETileLayer,
} from '../components/Map';
import UserAvatar from '../components/UserAvatar';
import { GEE_TRIGGER_DELAY } from '../components/Map/ThreeVFXOverlay';

// Tipos de evento que possuem camada GEE no backend:
// - queimada → FIRMS (focos de calor reais)
// - tempestade → GPM IMERG (precipitação de satélite; vento segue no storm :8005)
// - geada    → MODIS LST (temperatura de superfície, paleta de frio)
// - inundacao tem GeoJSON próprio (flood/streets); desmoronamento é só evento
const GEE_EVENTS = ['queimada', 'tempestade', 'geada'];
const TYPE_TO_GEE = {
  Queimada: 'queimada',
  Tempestade: 'tempestade',
  Geada: 'geada',
};

const MAP_TYPE_TO_VFX = {
  Tempestade: 'Tempestade',
  Geada: 'Geada',
  Queimada: 'Queimada',
  Desmoronamento: 'Desmoronamento',
  Inundacao: 'Inundacao',
};

const GeoRiskInner = () => {
  const [events, setEvents] = useState([]);
  const [type, setType] = useState('Inundacao');
  const [severity, setSeverity] = useState('Media');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollingStatus, setPollingStatus] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mapCenter, setMapCenter] = useState([-23.550520, -46.633308]); // SP Default
  const [activeFilter, setActiveFilter] = useState('empty'); // Começa com o mapa limpo
  const [showMyEvents, setShowMyEvents] = useState(true); // Meus eventos por padrão
  const [selectedTypes, setSelectedTypes] = useState(['Inundacao', 'Desmoronamento', 'Queimada', 'Geada', 'Tempestade']);
  const [windData, setWindData] = useState(null); // Dados da tempestade

  // --- Inject GEE Effect: evento ativo orquestra flyTo + VFX + camada GEE ---
  const { activeEvent, triggerEvent, clearEvent } = useActiveEvent();
  // 'Queimada' → /api/georisk/gee/queimada/ ; 'Tempestade' → gets 501 por enquanto
  const [geeReady, setGeeReady] = useState(false); // true após delay do VFX
  const geeType = activeEvent ? (TYPE_TO_GEE[activeEvent.type] || null) : null;
  const geeFetchEnabled = Boolean(activeEvent && geeType && geeReady);
  const { tileUrl, loading: geeLoading, error: geeError } = useGEELayer(geeType, {
    enabled: geeFetchEnabled,
  });

  useEffect(() => {
    setGeeReady(false);
  }, [activeEvent]);

  const pollingIntervalRef = useRef(null);

  const fetchEvents = async (filter = 'empty', includeMine = true) => {
    try {
      const res = await api.get(`/api/georisk/?type=${filter}&include_mine=${includeMine}`);
      setEvents(res.data);
    } catch (err) {
      console.error("Erro ao buscar eventos", err);
    }
  };

  useEffect(() => {
    fetchEvents(activeFilter, showMyEvents);
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [activeFilter, showMyEvents]);

  // Limpa ventos se mudar tipo
  useEffect(() => {
    if (type !== 'Tempestade') {
      setWindData(null);
    }
  }, [type]);

  // --- Vento da Tempestade: cobre submit E clique em marcador antigo ---
  // Antes o fetch vivia só no handleSubmit; clicar num evento já existente
  // não puxava a malha. Agora qualquer "evento ativo" de Tempestade busca
  // /storm/plot/ com a data do evento. O _ts do trigger garante refetch
  // mesmo em eventos idênticos; ref guarda a chave p/ não duplicar em voo.
  const windFetchKeyRef = useRef(null);
  useEffect(() => {
    if (!activeEvent || activeEvent.type !== 'Tempestade') {
      // Evento ativo de outro tipo → malha de vento anterior não persiste
      if (activeEvent) setWindData(null);
      return undefined;
    }
    const { latitude, longitude, event_date: evDate, _ts } = activeEvent;
    const key = String(latitude) + ',' + String(longitude) + ',' + String(evDate) + ',' + String(_ts);

    let cancelled = false;
    const fetchWind = async () => {
      try {
        const res = await api.post('/api/georisk/storm/plot/', {
          latitude,
          longitude,
          date: evDate || new Date().toISOString().slice(0, 10),
        });
        if (!cancelled) {
          setWindData(res.data);
          windFetchKeyRef.current = key;
        }
      } catch (err) {
        console.error('Erro ao buscar dados de vento', err);
      }
    };
    fetchWind();
    return () => {
      cancelled = true;
    };
  }, [activeEvent]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        (err) => {
          setErrorMessage('Erro ao buscar localização: ' + err.message);
          setTimeout(() => setErrorMessage(''), 3000);
        }
      );
    } else {
      setErrorMessage("Geolocalização não é suportada.");
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const startPolling = (eventId) => {
    if (type === 'Inundacao') {
      setPollingStatus('Processando água e vias no Celery...');
    } else {
      setPollingStatus(`Registrando evento de ${type}...`);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/georisk/${eventId}/`);
        const ev = res.data;

        if (ev.status === 'COMPLETED' || ev.status === 'COMPLETED_PARTIAL' || ev.status === 'ERROR') {
          clearInterval(pollingIntervalRef.current);
          setLoading(false);
          setPollingStatus('');

          if (ev.status === 'ERROR') {
            setErrorMessage('Erro no processamento do evento (Timeout ou erro interno).');
            setTimeout(() => setErrorMessage(''), 5000);
          } else if (ev.status === 'COMPLETED' && !ev.flood_geojson) {
            if (ev.type === 'Inundacao') {
              setSuccessMessage('✅ Análise concluída: Área segura (Sem risco de inundação detectado no local).');
            } else {
              setSuccessMessage(`✅ Evento de ${ev.type} registrado com sucesso!`);
            }
            setTimeout(() => setSuccessMessage(''), 7000);
          } else {
            setSuccessMessage('✅ Mapa de risco processado com sucesso!');
            setTimeout(() => setSuccessMessage(''), 5000);
          }

          fetchEvents(activeFilter, showMyEvents); // Recarrega p/ desenhar GeoJSONs
        }
      } catch (err) {
        console.error("Erro no polling", err);
      }
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!latitude || !longitude) {
      setErrorMessage("Por favor, preencha a latitude e longitude ou clique no mapa.");
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (!eventDate) {
      setErrorMessage("Por favor, preencha a data do evento.");
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/api/georisk/', {
        type,
        severity,
        description,
        event_date: eventDate,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });

      // Publicar no feed
      let emoji = '⚪';
      switch (type) {
        case 'Inundacao': emoji = '🔵'; break;
        case 'Desmoronamento': emoji = '🟤'; break;
        case 'Queimada': emoji = '🔴'; break;
        case 'Geada': emoji = '❄️'; break;
        case 'Tempestade': emoji = '🟣'; break;
      }

      const postContent = `${emoji} ${type}\nSeveridade: ${severity}\nData: ${eventDate}\nDescrição: ${description || 'Sem descrição'}\nLat/Long: ${parseFloat(latitude)}, ${parseFloat(longitude)}`;
      api.post('/api/tweets/', { content: postContent, geo_event_id: res.data.id }).catch(e => console.error(e));

      setDescription('');

      // Data volta ao padrão: hoje (usuário ainda pode alterar)
      setEventDate(new Date().toISOString().slice(0, 10));

      // Inicia Polling
      startPolling(res.data.id);

      // --- Inject GEE Effect: orquestra flyTo + VFX + fetch GEE ---
      triggerEvent({
        id: res.data.id,
        type: MAP_TYPE_TO_VFX[type] || type,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        severity,
        event_date: eventDate || new Date().toISOString().slice(0, 10),
        status: 'vfx_dispatched',
      });

      if (type === 'Tempestade') {
        // Vento agora é buscado pelo useEffect do activeEvent (cobre
        // submit E clique em marcador); aqui não há mais fetch duplicado.
      }

    } catch (err) {
      console.error(err);
      setLoading(false);
      setErrorMessage('Erro ao salvar o evento.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const getCustomIcon = (evtType, status) => {
    let color = '#94a3b8'; // default Cinza

    if (status === 'PENDING') {
      color = '#f59e0b'; // Laranja indicando processamento
    } else {
      switch (evtType) {
        case 'Inundacao': color = '#3b82f6'; break;
        case 'Desmoronamento': color = '#854d0e'; break;
        case 'Queimada': color = '#ef4444'; break;
        case 'Geada': color = '#93c5fd'; break;
        case 'Tempestade': color = '#a855f7'; break;
        case 'Clique': color = '#94a3b8'; break;
      }
    }

    const animation = status === 'PENDING' ? 'animation: pulse 1.5s infinite;' : '';
    const htmlString = `
      <div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); ${animation}"></div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    `;

    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: htmlString,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  const createCustomClusterIcon = (cluster) => {
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div style="
        background-color: rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background-color: var(--primary-color);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        ">
          ${count}
        </div>
      </div>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(40, 40, true)
    });
  };

  // Chamado pelo ThreeVFXOverlay após o delay cinematográfico do evento.
  // Só habilita o fetch GEE se o tipo tem camada definida (queimada/geada) —
  // evita request 501 em tipos sem satélite (ex: Tempestade usa /storm/plot/).
  const handleGEETileRequest = useCallback((eventType) => {
    if (TYPE_TO_GEE[eventType]) setGeeReady(true);
  }, []);

  // "✕ Limpar efeito 3D" — também remove a malha de vento (senão ela persiste)
  const handleClearEvent = useCallback(() => {
    clearEvent();
    setWindData(null);
  }, []);

  const showGeeStatus = geeFetchEnabled && (geeLoading || geeError);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-color)' }}>
      {/* Esquerda: Formulário */}
      <div style={{ width: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10, backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderRight: '1px solid var(--glass-border)', overflowY: 'auto' }}>
        <Link to="/feed" className="btn btn-outline" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
          &larr; Voltar
        </Link>

        <h1
          style={{
            fontFamily: "'Harry P', sans-serif",
            fontSize: '5rem',
            color: 'var(--primary-color)',
            textShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
            margin: '0',
            lineHeight: '1'
          }}
        >
          GeoRisk
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Reporte eventos ambientais em tempo real.</p>

        {successMessage && <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '5px', fontWeight: 'bold' }}>{successMessage}</div>}
        {errorMessage && <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '5px', fontWeight: 'bold' }}>{errorMessage}</div>}
        {pollingStatus && <div style={{ padding: '10px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}><div className="spinner"></div>{pollingStatus}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <div>
            <label>Tipo de Evento</label>
            <select className="input-field" value={type} onChange={e => setType(e.target.value)} disabled={loading}>
              <option value="Inundacao">Inundação</option>
              <option value="Desmoronamento">Desmoronamento</option>
              <option value="Queimada">Queimada</option>
              <option value="Geada">Geada</option>
              <option value="Tempestade">Tempestade</option>
            </select>
          </div>

          <div>
            <label>Severidade</label>
            <select className="input-field" value={severity} onChange={e => setSeverity(e.target.value)} disabled={loading}>
              <option value="Baixa">Baixa</option>
              <option value="Media">Média</option>
              <option value="Critica">Crítica</option>
            </select>
          </div>

          <div>
            <label>Descrição</label>
            <textarea
              className="input-field"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes opcionais..."
              style={{ resize: 'none', height: '60px' }}
              disabled={loading}
            />
          </div>

          <div>
            <label>Data do Evento</label>
            <input
              type="date"
              className="input-field"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label>Lat</label>
              <input type="number" step="any" className="input-field" value={latitude} onChange={e => setLatitude(e.target.value)} required disabled={loading} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Lng</label>
              <input type="number" step="any" className="input-field" value={longitude} onChange={e => setLongitude(e.target.value)} required disabled={loading} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={getLocation} disabled={loading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              📍 Localização
            </button>

            <button type="submit" className="btn" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Processando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>

      {/* Direita: Mapa Leaflet + VFX 3D + Camadas GEE */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Controle de Filtros */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
          <MapFilterControl
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            showMyEvents={showMyEvents}
            setShowMyEvents={setShowMyEvents}
            selectedTypes={selectedTypes}
            setSelectedTypes={setSelectedTypes}
          />
        </div>

        {/* Status da camada GEE */}
        {showGeeStatus && (
          <div data-testid="gee-status" style={{
            position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000,
            backgroundColor: 'rgba(30, 41, 59, 0.9)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-border)', borderRadius: '8px',
            padding: '10px 16px', color: geeError ? '#ef4444' : '#3b82f6',
            fontSize: '0.85rem', maxWidth: '320px'
          }}>
            {geeError
              ? `⚠️ GEE: ${geeError}`
              : `🛰️ Carregando camada GEE (${geeType})...`}
          </div>
        )}

        <MapContainer
          center={[-23.550520, -46.633308]}
          zoom={10}
          style={{ width: '100%', height: '100%', zIndex: 1 }}
        >
          <TileLayer
            attribution='Tiles &copy; Esri — Source: Esri, USGS | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
          <MapEventsHandler setLatitude={setLatitude} setLongitude={setLongitude} />
          <FlyToMapCenter center={mapCenter} />

          <WindLayer data={windData} severity={severity} />

          {/* Camada de dados reais do Google Earth Engine */}
          <GEETileLayer tileUrl={tileUrl} eventType={geeType} />

          {/* Marcador de clique temporário */}
          {latitude && longitude && (
            <Marker position={[parseFloat(latitude), parseFloat(longitude)]} icon={getCustomIcon('Clique')} />
          )}

          {/* Clusterização dos Marcadores (Filtrados) */}
          <MarkerClusterGroup chunkedLoading iconCreateFunction={createCustomClusterIcon}>
            {events.filter(evt => selectedTypes.includes(evt.type)).map(evt => (
              <Marker
                key={`marker-${evt.id}`}
                position={[evt.latitude, evt.longitude]}
                icon={getCustomIcon(evt.type, evt.status)}
                eventHandlers={{
                  click: () => triggerEvent({
                    id: evt.id,
                    type: evt.type,
                    latitude: evt.latitude,
                    longitude: evt.longitude,
                    severity: evt.severity,
                    event_date: evt.event_date,
                    source: 'marker',
                  }),
                }}
              >
                <Popup>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <UserAvatar avatar={evt.user_avatar} username={evt.username} size={32} />
                    <span style={{ fontWeight: 'bold' }}>@{evt.username || 'desconhecido'}</span>
                  </div>
                  <strong>{evt.type}</strong><br />
                  Severidade: {evt.severity}<br />
                  Status: {evt.status}<br />
                  Data: {evt.event_date}<br />
                  <small>{evt.description || 'Sem descrição'}</small>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>

          {/* Renderização dos polígonos fora do cluster para não quebrar a lib (Filtrados) */}
          {events.filter(evt => selectedTypes.includes(evt.type)).map(evt => (
            <React.Fragment key={`geojson-${evt.id}`}>
              {evt.flood_geojson && (
                <GeoJSON
                  data={evt.flood_geojson}
                  style={() => ({
                    color: '#3b82f6',
                    weight: 2,
                    fillColor: '#3b82f6',
                    fillOpacity: 0.4
                  })}
                />
              )}
              {evt.streets_geojson && (
                <GeoJSON
                  data={evt.streets_geojson}
                  style={() => ({
                    color: '#ef4444',
                    weight: 3,
                    opacity: 1
                  })}
                />
              )}
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Canvas 3D de efeitos sobre o mapa (pointer-events: none) */}
        {activeEvent && (
          <ThreeVFXOverlay
            event={activeEvent}
            onGEETileRequest={handleGEETileRequest}
          />
        )}

        {activeEvent && (
          <button
            type="button"
            onClick={handleClearEvent}
            style={{
              position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000,
              backgroundColor: 'rgba(30, 41, 59, 0.9)', color: 'var(--text-color)',
              border: '1px solid var(--glass-border)', borderRadius: '8px',
              padding: '8px 14px', cursor: 'pointer'
            }}
          >
            ✕ Limpar efeito 3D
          </button>
        )}
      </div>

      <style>{`
        .spinner {
          border: 3px solid rgba(59, 130, 246, 0.3);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const GeoRisk = () => (
  <EventProvider>
    <GeoRiskInner />
  </EventProvider>
);

export default GeoRisk;