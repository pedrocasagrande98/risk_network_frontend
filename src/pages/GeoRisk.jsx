import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

// Componente auxiliar para lidar com cliques no mapa
const MapEventsHandler = ({ setLatitude, setLongitude }) => {
  useMapEvents({
    click(e) {
      setLatitude(e.latlng.lat.toFixed(6));
      setLongitude(e.latlng.lng.toFixed(6));
    },
  });
  return null;
};

// Componente para animar a câmera do mapa
const FlyToMapCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14);
  }, [center, map]);
  return null;
};

const GeoRisk = () => {
  const [events, setEvents] = useState([]);
  const [type, setType] = useState('Inundacao');
  const [severity, setSeverity] = useState('Media');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mapCenter, setMapCenter] = useState([-23.550520, -46.633308]); // SP Default

  // Fetch events
  const fetchEvents = async () => {
    try {
      const res = await api.get('/georisk/');
      setEvents(res.data);
    } catch (err) {
      console.error("Erro ao buscar eventos", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    
    if (!latitude || !longitude) {
      setErrorMessage("Por favor, preencha a latitude e longitude ou clique no mapa/botão.");
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    setLoading(true);
    
    // Fallback de segurança para garantir que o botão sempre seja liberado após 10 segundos no máximo
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    try {
      await api.post('/georisk/', {
        type,
        severity,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });

      // Publicar o evento no feed
      let emoji = '⚪';
      switch (type) {
        case 'Inundacao': emoji = '🔵'; break;
        case 'Desmoronamento': emoji = '🟤'; break;
        case 'Queimada': emoji = '🔴'; break;
        case 'Geada': emoji = '❄️'; break;
        case 'Tempestade': emoji = '🟣'; break;
      }
      
      const postContent = `${emoji} ${type}\nSeveridade: ${severity}\nDescrição: ${description || 'Sem descrição'}\nLat/Long: ${parseFloat(latitude)}, ${parseFloat(longitude)}`;
      
      try {
        await api.post('/tweets/', { content: postContent });
      } catch (postErr) {
        console.error("Não foi possível criar o post no feed", postErr);
      }

      setDescription('');
      setLatitude('');
      setLongitude('');
      
      // Liberar o botão antes de fazer o fetch
      setLoading(false);
      clearTimeout(safetyTimeout);
      
      fetchEvents();
      
      // Exibir mensagem verde
      setSuccessMessage('✅ Evento registrado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setLoading(false);
      clearTimeout(safetyTimeout);
      setErrorMessage('Erro ao salvar o evento.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Função para criar o ícone colorido customizado
  const getCustomIcon = (evtType) => {
    let color = '#94a3b8'; // default Cinza
    switch (evtType) {
      case 'Inundacao': color = '#3b82f6'; break;
      case 'Desmoronamento': color = '#854d0e'; break;
      case 'Queimada': color = '#ef4444'; break;
      case 'Geada': color = '#93c5fd'; break;
      case 'Tempestade': color = '#a855f7'; break;
      case 'Clique': color = '#94a3b8'; break; // Pino temporário
    }

    const htmlString = `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`;

    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: htmlString,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

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

        {/* Mensagens de feedback */}
        {successMessage && <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '5px', fontWeight: 'bold' }}>{successMessage}</div>}
        {errorMessage && <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '5px', fontWeight: 'bold' }}>{errorMessage}</div>}

        {/* Legenda de cores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', marginTop: '5px' }}>
          <small style={{ color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Legenda de Cores</small>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: '0.75rem', color: 'var(--text-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
              <span>Inundação</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#854d0e' }}></span>
              <span>Desmoronamento</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
              <span>Queimada</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#93c5fd' }}></span>
              <span>Geada</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#a855f7' }}></span>
              <span>Tempestade</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <div>
            <label>Tipo de Evento</label>
            <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
              <option value="Inundacao">Inundação</option>
              <option value="Desmoronamento">Desmoronamento</option>
              <option value="Queimada">Queimada</option>
              <option value="Geada">Geada</option>
              <option value="Tempestade">Tempestade</option>
            </select>
          </div>

          <div>
            <label>Severidade</label>
            <select className="input-field" value={severity} onChange={e => setSeverity(e.target.value)}>
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
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label>Lat</label>
              <input type="number" step="any" className="input-field" value={latitude} onChange={e => setLatitude(e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Lng</label>
              <input type="number" step="any" className="input-field" value={longitude} onChange={e => setLongitude(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={getLocation} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              📍 Localização
            </button>

            <button type="submit" className="btn" style={{ flex: 1 }}>
              Registrar
            </button>
          </div>
        </form>
      </div>

      {/* Direita: Mapa Leaflet */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer 
          center={[-23.550520, -46.633308]} 
          zoom={10} 
          style={{ width: '100%', height: '100%', zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapEventsHandler setLatitude={setLatitude} setLongitude={setLongitude} />
          <FlyToMapCenter center={mapCenter} />

          {/* Marcador de clique temporário */}
          {latitude && longitude && (
            <Marker position={[parseFloat(latitude), parseFloat(longitude)]} icon={getCustomIcon('Clique')} />
          )}

          {/* Marcadores dos eventos cadastrados */}
          {events.map(evt => (
            <Marker 
              key={evt.id} 
              position={[evt.latitude, evt.longitude]} 
              icon={getCustomIcon(evt.type)}
            >
              <Popup>
                <strong>{evt.type}</strong><br/>
                Severidade: {evt.severity}<br/>
                <small>{evt.description || 'Sem descrição'}</small>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default GeoRisk;
