import { useEffect, useState } from 'react';
import { getHistorial } from '../services/historialService';
import { C, card } from '../theme';

const TIPO_CFG = {
  retiro:     { color: C.error,   bg: C.errorLight,  label: 'RETIRO'    },
  devolucion: { color: C.success, bg: C.successLight, label: 'DEVOLUCIÓN'},
  ingreso:    { color: '#8b5cf6', bg: '#f3e8ff',      label: 'INGRESO'   },
};

export default function Historial() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda]   = useState('');

  useEffect(() => {
    getHistorial(500).then(d => { setHistorial(d); setLoading(false); });
  }, []);

  const TIPOS_FILTRO = ['todos', 'retiro', 'devolucion', 'ingreso'];

  const filtrado = historial
    .filter(h => filtroTipo === 'todos' || h.tipo === filtroTipo)
    .filter(h => !busqueda || h.producto?.toLowerCase().includes(busqueda.toLowerCase()) || h.usuario?.toLowerCase().includes(busqueda.toLowerCase()) || h.maquina?.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ color: C.text }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', background: C.secondary }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Historial de Movimientos</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{historial.length} registros cargados</div>
      </div>

      <div style={{ padding: '16px 28px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {TIPOS_FILTRO.map(t => {
            const cfg = TIPO_CFG[t];
            return (
              <button
                key={t}
                style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${C.border}`, background: filtroTipo === t ? C.primary : C.surface, color: filtroTipo === t ? '#fff' : C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                onClick={() => setFiltroTipo(t)}
              >
                {t === 'todos' ? 'Todos' : cfg?.label || t}
              </button>
            );
          })}
          <input
            style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 20, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, outline: 'none', minWidth: 220 }}
            placeholder="Buscar producto, usuario, máquina..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <span style={{ color: C.textLight, fontSize: 12 }}>{filtrado.length} registros</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.textLight }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div>Cargando historial...</div>
          </div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.secondary }}>
                    {['Fecha', 'Tipo', 'Producto', 'Cant.', 'Máquina', 'Parte', 'Usuario', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrado.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.textLight }}>Sin registros que coincidan</td></tr>
                  ) : filtrado.map((h, i) => {
                    const cfg   = TIPO_CFG[h.tipo] || { color: C.textSecondary, bg: C.border, label: h.tipo };
                    const fecha = h.fecha?.toDate ? h.fecha.toDate().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                    return (
                      <tr key={h.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.background }}>
                        <td style={{ padding: '10px 14px', color: C.textLight, fontSize: 12, whiteSpace: 'nowrap' }}>{fecha}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.producto}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: C.primary }}>{h.cantidad}</td>
                        <td style={{ padding: '10px 14px', color: C.textSecondary, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.maquina || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textSecondary }}>{h.parteMaquina || '—'}</td>
                        <td style={{ padding: '10px 14px', color: C.textSecondary }}>{h.usuario || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: h.estado === 'entregado' ? C.successLight : C.background, color: h.estado === 'entregado' ? C.success : C.textSecondary }}>
                            {h.estado || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
