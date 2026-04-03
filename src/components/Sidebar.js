import React from 'react';

const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'inventario', label: 'Inventario', icon: '📦' },
  { id: 'historial', label: 'Historial', icon: '📋' },
  { id: 'importar', label: 'Importar Excel', icon: '⬆️' },
];

export default function Sidebar({ pagina, setPagina }) {
  return (
    <div style={s.sidebar}>
      <div style={s.logo}>
        <span style={s.logoText}>PRYSMIAN</span>
        <span style={s.logoSub}>Panel de Control</span>
      </div>
      <nav>
        {MENU.map(item => (
          <button
            key={item.id}
            onClick={() => setPagina(item.id)}
            style={{ ...s.item, ...(pagina === item.id ? s.itemActivo : {}) }}
          >
            <span style={s.icon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

const s = {
  sidebar: {
    width: 220, minHeight: '100vh', background: '#111827',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
    borderRight: '1px solid #1f2937',
  },
  logo: {
    padding: '28px 20px 24px', display: 'flex',
    flexDirection: 'column', borderBottom: '1px solid #1f2937',
  },
  logoText: { fontSize: 20, fontWeight: 800, color: '#F4821F', letterSpacing: 2 },
  logoSub: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  item: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '12px 20px', background: 'none',
    border: 'none', color: '#9ca3af', fontSize: 14, cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.15s',
  },
  itemActivo: { background: '#1f2937', color: '#F4821F', borderLeft: '3px solid #F4821F' },
  icon: { fontSize: 16 },
};
