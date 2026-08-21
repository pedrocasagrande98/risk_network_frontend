import { Filter, Layers, Users, Globe } from 'lucide-react';

function MapFilterControl({ activeFilter, setActiveFilter, showMyEvents, setShowMyEvents }) {
  return (
    <div className="glass-panel" style={{ 
      padding: '15px', 
      marginBottom: '20px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '15px',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color)', fontWeight: 'bold' }}>
        <Filter size={20} />
        <span>Camadas do Mapa:</span>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          className={`btn ${activeFilter === 'empty' ? '' : 'btn-outline'}`}
          style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setActiveFilter('empty')}
        >
          <Layers size={16} /> Mapa Limpo
        </button>

        <button 
          className={`btn ${activeFilter === 'following' ? '' : 'btn-outline'}`}
          style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setActiveFilter('following')}
        >
          <Users size={16} /> Minha Rede
        </button>

        <button 
          className={`btn ${activeFilter === 'global' ? '' : 'btn-outline'}`}
          style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setActiveFilter('global')}
        >
          <Globe size={16} /> Global
        </button>

        {/* Linha separadora */}
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--glass-border)', margin: '0 5px' }}></div>

        {/* Checkbox para Meus Eventos */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-color)' }}>
          <input 
            type="checkbox" 
            checked={showMyEvents}
            onChange={(e) => setShowMyEvents(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Mostrar meus eventos
        </label>
      </div>
    </div>
  );
}

export default MapFilterControl;
