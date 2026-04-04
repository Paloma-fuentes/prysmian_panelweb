import React, { useEffect, useState } from 'react';
import { getHistorial } from '../services/historialService';

const TIPOS = { retiro: '#dc2626', ingreso: '#10b981', devolucion: '#6366f1' };

export default function Historial() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');

  useEffect(() => { getHistorial(500).then(d => { setHistorial(d); setLoading(false); }); }, []);

  const filtrado = filtroTipo === 'todos' ? historial : historial.filter(h => h.tipo === filtroTipo);

  return (
    <div style={s.container}>
      <h1 style={s.titulo}>Historial de Movimientos</h1>

      <div style={s.toolbar}>
        {['todos', 'retiro', 'ingreso', 'devolucion'].map(t => (
          <button key={t} style={{ ...s.filtroBtn, ...(filtroTipo === t ? s.filtroBtnActivo : {}) }} onClick={() => setFiltroTipo(t)}>
            {t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
          </button>
        ))}
        <span style={s.total}>{filtrado.length} registros</span>
      </div>

      {loading ? <div style={s.loading}>Cargando historial...</div> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Máquina', 'Usuario', 'Estado'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrado.map((h, i) => {
                const fecha = h.fecha?.toDate ? h.fecha.toDate().toLocaleString('es-CL') : (h.fecha || '—');
                return (
                  <tr key={h.id} style={i % 2 === 0 ? s.trPar : {}}>
                    <td style={s.td}>{fecha}</td>
                    <td style={s.td}><span style={{ ...s.badge, background: TIPOS[h.tipo] || '#6b7280' }}>{h.tipo}</span></td>
                    <td style={{ ...s.td, maxWidth: 280 }}>{h.producto}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{h.cantidad}</td>
                    <td style={s.td}>{h.maquina || '—'}</td>
                    <td style={s.td}>{h.usuario || '—'}</td>
                    <td style={s.td}>{h.estado || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtrado.length === 0 && <div style={s.empty}>Sin registros</div>}
        </div>
      )}
    </div>
  );
}

const s = {
  container: { padding: 28, color: '#f9fafb', background: '#0f172a', minHeight: '100vh' },
  titulo: { fontSize: 24, fontWeight: 800, margin: '0 0 20px' },
  toolbar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  filtroBtn: { padding: '7px 14px', borderRadius: 6, border: '1px solid #374151', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 },
  filtroBtnActivo: { background: '#F4821F', borderColor: '#F4821F', color: '#fff' },
  total: { color: '#6b7280', fontSize: 13, marginLeft: 'auto' },
  loading: { color: '#9ca3af', padding: 40, textAlign: 'center' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', color: '#6b7280', fontSize: 12, fontWeight: 600, padding: '10px 12px', borderBottom: '1px solid #374151', whiteSpace: 'nowrap' },
  td: { padding: '9px 12px', fontSize: 13, color: '#d1d5db', borderBottom: '1px solid #1f2937' },
  trPar: { background: '#111827' },
  badge: { padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 700 },
  empty: { color: '#6b7280', textAlign: 'center', padding: 40 },
};
