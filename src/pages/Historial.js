import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C, G } from '../theme';

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
    const q = query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(500));
    const unsub = onSnapshot(q, snap => {
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const TIPOS_FILTRO = ['todos', 'retiro', 'devolucion', 'ingreso'];

  const filtrado = historial
    .filter(h => filtroTipo === 'todos' || h.tipo === filtroTipo)
    .filter(h => !busqueda || h.producto?.toLowerCase().includes(busqueda.toLowerCase()) || h.usuario?.toLowerCase().includes(busqueda.toLowerCase()) || h.maquina?.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: C.background }}>
      {/* ── Header Premium ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}`, width: '100%', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0, letterSpacing: -0.5 }}>Trazabilidad de Movimientos</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Historial completo de retiros e ingresos al pañol</p>
        </div>
        <div style={{ background: 'rgba(244,130,31,0.1)', color: C.primary, padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
          {historial.length} Registros Totales
        </div>
      </header>

      {/* ── Barra de Filtros ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '24px 40px', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', background: '#fff', padding: '6px', borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          {TIPOS_FILTRO.map(t => (
            <button
              key={t}
              style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: filtroTipo === t ? C.secondary : 'none', color: filtroTipo === t ? '#fff' : C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }}
              onClick={() => setFiltroTipo(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        
        <div style={{ flex: 1, minWidth: 300, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            style={{ flex: 1, border: 'none', padding: '12px 0', color: C.text, fontSize: 14, outline: 'none' }}
            placeholder="Buscar por producto, usuario o máquina..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div style={{ color: C.textLight, fontSize: 12, fontWeight: 600 }}>Mostrando {filtrado.length} resultados</div>
      </div>

      {/* ── Tabla Principal ── */}
      <main style={{ padding: '0 40px 40px', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textSecondary, fontWeight: 600 }}>Cargando trazabilidad...</div>
        ) : (
          <div style={{ ...G.glass, borderRadius: 24, boxShadow: G.cardShadow, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.02)' }}>
                  {['FECHA', 'TIPO', 'PRODUCTO', 'CANT.', 'MÁQUINA', 'TRABAJADOR', 'ESTADO'].map(h => (
                    <th key={h} style={{ textAlign: 'left', color: C.textLight, fontSize: 10, fontWeight: 800, padding: '16px 20px', borderBottom: `1px solid ${C.border}`, letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: C.textLight, fontStyle: 'italic' }}>No se encontraron registros coincidentes</td></tr>
                ) : filtrado.map((h, i) => {
                  const cfg   = TIPO_CFG[h.tipo] || { color: C.textSecondary, bg: '#F1F5F9', label: h.tipo };
                  const fecha = h.fecha?.toDate ? h.fecha.toDate().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                  return (
                    <tr key={h.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 20px', color: C.textSecondary, fontSize: 12, fontWeight: 600 }}>{fecha}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: C.secondary }}>{h.producto}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: C.primary, fontSize: 15 }}>{h.cantidad}</td>
                      <td style={{ padding: '16px 20px', color: C.textSecondary, fontSize: 13 }}>{h.maquina || '—'}</td>
                      <td style={{ padding: '16px 20px', color: C.textSecondary, fontWeight: 600 }}>{h.usuario || '—'}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, background: h.estado === 'entregado' ? '#DCFCE7' : '#F1F5F9', color: h.estado === 'entregado' ? C.success : C.textSecondary, fontWeight: 800 }}>
                          {h.estado?.toUpperCase() || 'PROCESADO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
