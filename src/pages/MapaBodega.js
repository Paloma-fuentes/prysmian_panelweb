import { useEffect, useMemo, useState } from 'react';
import { C } from '../theme';
import { getMateriales } from '../services/inventarioService';

function normUbic(u) {
  if (!u || !u.trim() || u.trim().toUpperCase() === 'N/A') return 'Sin ubicación';
  return u.trim().toUpperCase();
}

function getZonaColor(mats) {
  const agotados = mats.filter(m => (m.stock ?? 0) === 0).length;
  const bajo     = mats.filter(m => m.bajoStock).length;
  if (agotados > 0) return { bg: '#fef2f2', border: '#ef4444', texto: '#dc2626' };
  if (bajo     > 0) return { bg: '#fff7ed', border: '#f97316', texto: '#ea580c' };
  return { bg: '#f0fdf4', border: '#22c55e', texto: '#16a34a' };
}

export default function MapaBodega() {
  const [materiales, setMateriales] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [busqueda,   setBusqueda]   = useState('');
  const [zonaSelec,  setZonaSelec]  = useState(null);

  useEffect(() => {
    getMateriales({}).then(d => { setMateriales(d ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const zonas = useMemo(() => {
    const mapa = {};
    materiales.forEach(m => {
      const z = normUbic(m.ubicacion);
      if (!mapa[z]) mapa[z] = [];
      mapa[z].push(m);
    });
    return Object.entries(mapa)
      .map(([zona, mats]) => ({
        zona,
        materiales: mats.sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || '')),
        total:    mats.length,
        agotados: mats.filter(m => (m.stock ?? 0) === 0).length,
        bajoStock:mats.filter(m => m.bajoStock).length,
        colores:  getZonaColor(mats),
      }))
      .sort((a, b) => {
        if (a.zona === 'Sin ubicación') return 1;
        if (b.zona === 'Sin ubicación') return -1;
        return a.zona.localeCompare(b.zona);
      });
  }, [materiales]);

  const zonasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return zonas;
    const q = busqueda.toLowerCase();
    return zonas.filter(z =>
      z.zona.toLowerCase().includes(q) ||
      z.materiales.some(m =>
        m.descripcion.toLowerCase().includes(q) ||
        (m.codigoSAP || '').toLowerCase().includes(q)
      )
    );
  }, [zonas, busqueda]);

  const totalAgotados  = zonas.reduce((s, z) => s + z.agotados, 0);
  const totalBajoStock = zonas.reduce((s, z) => s + z.bajoStock, 0);

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando mapa de bodega...</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.background }}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Mapa de Bodega</h1>
          <p style={s.sub}>{zonas.length} zonas · {materiales.length} materiales</p>
        </div>
        <div style={s.kpiRow}>
          {[
            { val: zonas.length,      lbl: 'Zonas',      color: '#22c55e' },
            { val: materiales.length, lbl: 'Materiales', color: '#6366f1' },
            { val: totalBajoStock,    lbl: 'Bajo stock',  color: '#f97316' },
            { val: totalAgotados,     lbl: 'Agotados',   color: '#ef4444' },
          ].map(k => (
            <div key={k.lbl} style={{ ...s.kpi, borderColor: k.color }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.val}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.textSecondary, marginTop: 2 }}>{k.lbl}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Leyenda + búsqueda */}
      <div style={s.toolbar}>
        <div style={s.leyenda}>
          {[
            { color: '#22c55e', label: 'Stock OK' },
            { color: '#f97316', label: 'Bajo stock' },
            { color: '#ef4444', label: 'Agotado' },
            { color: '#94a3b8', label: 'Sin ubic.' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: l.color }} />
              <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <input
            style={s.search}
            placeholder="Buscar zona o material..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && <button style={s.clearBtn} onClick={() => setBusqueda('')}>✕</button>}
        </div>
      </div>

      {/* Grid de zonas */}
      <div style={s.grid}>
        {zonasFiltradas.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40 }}>🗺️</div>
            <div>{busqueda ? `Sin resultados para "${busqueda}"` : 'No hay materiales con ubicación registrada.'}</div>
          </div>
        ) : (
          zonasFiltradas.map(zona => (
            <button
              key={zona.zona}
              style={{ ...s.zonaCard, background: zona.colores.bg, borderColor: zona.colores.border }}
              onClick={() => setZonaSelec(zona)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: zona.colores.texto, fontWeight: 700 }}>
                  {zona.agotados > 0 ? '✗' : zona.bajoStock > 0 ? '⚠' : '✓'}
                </span>
                <span style={{ fontSize: 11, color: zona.colores.texto, opacity: 0.8 }}>{zona.total} ítem{zona.total !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: zona.colores.texto, textAlign: 'left', marginBottom: 6 }}>{zona.zona}</div>
              {(zona.agotados > 0 || zona.bajoStock > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {zona.agotados  > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>{zona.agotados} agotado{zona.agotados !== 1 ? 's' : ''}</span>}
                  {zona.bajoStock > 0 && <span style={{ background: '#f97316', color: '#fff', borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>{zona.bajoStock} bajo stock</span>}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Modal detalle zona */}
      {zonaSelec && (
        <div style={s.overlay} onClick={() => setZonaSelec(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h2 style={s.modalTitulo}>{zonaSelec.zona}</h2>
                <div style={{ fontSize: 12, color: C.textSecondary }}>{zonaSelec.total} material{zonaSelec.total !== 1 ? 'es' : ''}</div>
              </div>
              <button style={s.closeBtn} onClick={() => setZonaSelec(null)}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 460 }}>
              {zonaSelec.materiales.map((m, i) => {
                const stock   = m.stock ?? 0;
                const agotado = stock === 0;
                const bajo    = m.bajoStock && !agotado;
                return (
                  <div key={m.id || i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 20px', borderBottom: `1px solid ${C.border}`,
                    background: agotado ? '#fef2f2' : bajo ? '#fff7ed' : 'transparent',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{m.descripcion}</div>
                      {m.codigoSAP && <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>SAP: {m.codigoSAP}</div>}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: agotado ? '#ef4444' : bajo ? '#f97316' : '#16a34a' }}>
                        {agotado ? '✗' : stock}
                      </div>
                      <div style={{ fontSize: 9, color: C.textSecondary, fontWeight: 600 }}>
                        {agotado ? 'agotado' : (m.unidad || 'und')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header:  { padding: '36px 48px 24px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  titulo:  { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:     { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  kpiRow:  { display: 'flex', gap: 12 },
  kpi:     { padding: '10px 16px', borderRadius: 12, border: '2px solid', background: '#fff', textAlign: 'center', minWidth: 70, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  toolbar: { padding: '14px 48px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  leyenda: { display: 'flex', gap: 16 },
  search:  { width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 36px 9px 14px', fontSize: 13, outline: 'none', background: C.background, boxSizing: 'border-box' },
  clearBtn:{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, fontSize: 14 },
  grid:    { padding: '28px 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 },
  zonaCard:{ border: '2px solid', borderRadius: 14, padding: 16, minHeight: 90, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  empty:   { gridColumn: '1/-1', textAlign: 'center', padding: 80, color: C.textSecondary, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalBox:{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: `1px solid ${C.border}` },
  modalTitulo: { fontSize: 20, fontWeight: 900, color: C.secondary, margin: 0 },
  closeBtn:    { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textLight },
};
