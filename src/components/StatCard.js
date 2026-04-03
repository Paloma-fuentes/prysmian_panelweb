import React from 'react';

export default function StatCard({ titulo, valor, sub, color = '#F4821F', icono, alerta }) {
  return (
    <div style={{ ...s.card, borderTop: `3px solid ${color}` }}>
      <div style={s.row}>
        <span style={s.icono}>{icono}</span>
        {alerta && <span style={s.badge}>⚠️</span>}
      </div>
      <div style={{ ...s.valor, color }}>{valor ?? '—'}</div>
      <div style={s.titulo}>{titulo}</div>
      {sub && <div style={s.sub}>{sub}</div>}
    </div>
  );
}

const s = {
  card: {
    background: '#1f2937', borderRadius: 10, padding: '20px 18px',
    minWidth: 160, flex: 1,
  },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  icono: { fontSize: 22 },
  badge: { fontSize: 16 },
  valor: { fontSize: 32, fontWeight: 800, lineHeight: 1 },
  titulo: { fontSize: 13, color: '#9ca3af', marginTop: 6 },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
};
