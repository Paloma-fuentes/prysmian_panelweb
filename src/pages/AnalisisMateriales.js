import { useEffect, useState } from 'react';
import { C } from '../theme';
import { getHistorial } from '../services/historialService';

export default function AnalisisMateriales() {
  const [topMateriales, setTopMateriales] = useState([]);
  const [rawHistorial,  setRawHistorial]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [materialSel,   setMaterialSel]   = useState(null);
  const [histMaterial,  setHistMaterial]  = useState([]);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const historial = (await getHistorial(2000)) ?? [];
      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

      const porMaterial = {};
      historial.forEach(h => {
        if (h.tipo !== 'retiro') return;
        const f = h.fecha?.toDate ? h.fecha.toDate() : null;
        if (!f || f < inicioMes) return;
        const mat = (h.producto || '').trim();
        if (!mat) return;
        porMaterial[mat] = (porMaterial[mat] || 0) + (Number(h.cantidad) || 1);
      });

      const top = Object.entries(porMaterial)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }));

      setTopMateriales(top);
      setRawHistorial(historial);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function abrirDetalle(nombre) {
    setMaterialSel(nombre);
    const movs = rawHistorial
      .filter(h => h.producto?.trim() === nombre)
      .map(h => ({
        id: h.id,
        fecha: h.fecha?.toDate ? h.fecha.toDate().toLocaleDateString('es-CL') : '—',
        hora:  h.fecha?.toDate ? h.fecha.toDate().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '',
        tipo:  h.tipo === 'devolucion' ? 'DEVOLUCIÓN' : 'RETIRO',
        cantidad: h.cantidad,
        usuario: h.usuario || '—',
        maquina: h.maquina || '—',
      }))
      .sort((a, b) => b.fecha?.localeCompare(a.fecha));
    setHistMaterial(movs);
  }

  const maxCantidad = topMateriales[0]?.cantidad || 1;
  const mesActual = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando análisis de materiales...</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.background, paddingBottom: 60 }}>
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Análisis de Materiales</h1>
          <p style={s.sub}>Top 10 materiales más retirados en {mesActual}</p>
        </div>
        <button style={s.refreshBtn} onClick={cargar}>↻ Actualizar</button>
      </header>

      <div style={s.content}>
        {topMateriales.length === 0 ? (
          <div style={s.empty}><div style={{ fontSize: 40 }}>📦</div><div>Sin retiros registrados este mes.</div></div>
        ) : (
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Top 10 del mes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {topMateriales.map((mat, i) => {
                const pct = (mat.cantidad / maxCantidad) * 100;
                const color = i === 0 ? C.primary : i < 3 ? '#6366f1' : C.info;
                return (
                  <button key={mat.nombre} style={s.matRow} onClick={() => abrirDetalle(mat.nombre)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ ...s.rankBadge, background: i < 3 ? color : '#f1f5f9', color: i < 3 ? '#fff' : C.textLight }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.secondary }}>{mat.nombre}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: C.secondary }}>{mat.cantidad}</span>
                        <span style={{ fontSize: 11, color: C.textLight }}>unid.</span>
                        <span style={{ fontSize: 12, color: C.primary }}>Ver detalle →</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal detalle material */}
      {materialSel && (
        <div style={s.overlay} onClick={() => setMaterialSel(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h2 style={s.modalTitulo}>{materialSel}</h2>
                <div style={{ fontSize: 12, color: C.textSecondary }}>{histMaterial.length} movimiento{histMaterial.length !== 1 ? 's' : ''} registrado{histMaterial.length !== 1 ? 's' : ''}</div>
              </div>
              <button style={s.closeBtn} onClick={() => setMaterialSel(null)}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 460 }}>
              {histMaterial.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: C.textSecondary }}>Sin movimientos.</div>
              ) : (
                histMaterial.map((m, i) => (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.secondary }}>{m.usuario}</div>
                      <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>🔧 {m.maquina}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ background: m.tipo === 'RETIRO' ? '#fee2e2' : '#d1fae5', color: m.tipo === 'RETIRO' ? C.error : C.success, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>{m.tipo}</span>
                      <div style={{ fontSize: 16, fontWeight: 900, color: C.secondary, marginTop: 4 }}>{m.cantidad} und.</div>
                      <div style={{ fontSize: 10, color: C.textLight }}>{m.fecha} {m.hora}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header:     { padding: '36px 48px 28px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titulo:     { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:        { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  refreshBtn: { background: C.secondary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  content:    { padding: '28px 48px', maxWidth: 860, margin: '0 auto' },
  empty:      { textAlign: 'center', padding: 80, color: C.textSecondary, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  card:       { background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' },
  cardTitulo: { fontSize: 20, fontWeight: 900, color: C.secondary, margin: '0 0 24px' },
  matRow:     { background: 'none', border: 'none', padding: '0 0 8px', cursor: 'pointer', width: '100%', textAlign: 'left' },
  rankBadge:  { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalBox:   { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: `1px solid ${C.border}` },
  modalTitulo:{ fontSize: 18, fontWeight: 800, color: C.secondary, margin: 0 },
  closeBtn:   { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textLight },
};
