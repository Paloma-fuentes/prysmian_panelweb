import { useEffect, useState, useMemo } from 'react';
import { getSolicitudesCompra, escucharSolicitudesCompra, actualizarEstado, eliminarSolicitudCompra } from '../services/solicitudesCompraService';
import { C, card } from '../theme';

const ESTADOS = ['en espera', 'en revision', 'pr realizada', 'solicitud completada'];

const ESTADO_CFG = {
  'en espera':            { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
  'en revision':          { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' },
  'pr realizada':         { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
  'solicitud completada': { bg: '#dcfce7', color: '#166534', border: '#22c55e' },
};

const URGENCIA_CFG = {
  urgencia: { bg: C.errorLight,   color: C.error,   label: '🔴 URGENTE' },
  alta:     { bg: '#fef3c7',      color: '#92400e', label: '🟡 Alta'     },
  normal:   { bg: C.successLight, color: C.success, label: '🟢 Normal'   },
};

function tiempoAtras(ts) {
  if (!ts) return '—';
  const ms  = ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 60)   return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)}h`;
  return `hace ${Math.floor(min / 1440)}d`;
}

function fechaCorta(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SolicitudesCompra() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState(0);
  const [filtroHoras, setFiltroHoras] = useState(24);
  const [expandidas, setExpandidas]   = useState({});
  const [detalle, setDetalle]         = useState(null);
  const [cambiando, setCambiando]     = useState(null);

  // Tiempo real — se actualiza cuando la app móvil hace cambios
  useEffect(() => {
    setLoading(true);
    const unsub = escucharSolicitudesCompra(data => {
      setSolicitudes(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function cargar() {
    // Usado solo al cambiar estado/eliminar para forzar re-render inmediato
    setSolicitudes(await getSolicitudesCompra());
  }

  const solicitudesNuevas = useMemo(() => {
    const corte = Date.now() - filtroHoras * 3_600_000;
    return [...solicitudes]
      .filter(s => (s.creadoEn?.toDate ? s.creadoEn.toDate().getTime() : 0) >= corte)
      .sort((a, b) => (b.creadoEn?.toDate ? b.creadoEn.toDate().getTime() : 0) - (a.creadoEn?.toDate ? a.creadoEn.toDate().getTime() : 0));
  }, [solicitudes, filtroHoras]);

  const porMaquina = useMemo(() => {
    const mapa = {};
    solicitudes.forEach(s => {
      const maq = s.maquina || 'Sin Máquina';
      if (!mapa[maq]) mapa[maq] = [];
      mapa[maq].push(s);
    });
    return Object.entries(mapa)
      .map(([maq, items]) => ({ maq, items, pendientes: items.filter(i => i.estado === 'en espera' || i.estado === 'en revision').length }))
      .sort((a, b) => b.pendientes - a.pendientes || a.maq.localeCompare(b.maq));
  }, [solicitudes]);

  const resumen = useMemo(() => ({
    enEspera:   solicitudes.filter(s => s.estado === 'en espera').length,
    enRevision: solicitudes.filter(s => s.estado === 'en revision').length,
    urgentes:   solicitudes.filter(s => s.urgencia === 'urgencia' && s.estado === 'en espera').length,
  }), [solicitudes]);

  async function cambiarEstado(id, nuevoEstado) {
    setCambiando(id);
    await actualizarEstado(id, nuevoEstado);
    await cargar();
    if (detalle?.id === id) setDetalle(p => ({ ...p, estado: nuevoEstado }));
    setCambiando(null);
  }

  async function confirmarEliminar(id, nombre) {
    if (!window.confirm(`¿Eliminar la solicitud de "${nombre}"?`)) return;
    await eliminarSolicitudCompra(id);
    if (detalle?.id === id) setDetalle(null);
    cargar();
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12, color: C.textLight }}>
      <div style={{ fontSize: 40 }}>🛒</div>
      <div>Cargando solicitudes de compra...</div>
    </div>
  );

  return (
    <div style={{ color: C.text }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', background: C.secondary }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Solicitudes de Compra</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{solicitudes.length} solicitudes registradas</div>
      </div>

      <div style={{ padding: '16px 28px' }}>
        {/* Banner resumen */}
        {(resumen.urgentes > 0 || resumen.enEspera > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#fffbeb', border: '1px solid #f59e0b', borderLeft: `4px solid #f59e0b`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>⚠️ Requieren atención:</span>
            {resumen.urgentes > 0 && <span style={{ padding: '2px 10px', borderRadius: 10, background: C.errorLight, color: C.error, fontSize: 12, fontWeight: 700 }}>🔴 {resumen.urgentes} urgentes</span>}
            {resumen.enEspera > 0 && <span style={{ padding: '2px 10px', borderRadius: 10, background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700 }}>⏳ {resumen.enEspera} en espera</span>}
            {resumen.enRevision > 0 && <span style={{ padding: '2px 10px', borderRadius: 10, background: '#dbeafe', color: '#1e40af', fontSize: 12, fontWeight: 700 }}>🔍 {resumen.enRevision} en revisión</span>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${C.border}`, marginBottom: 16 }}>
          {[{ label: '🆕 Nuevas', cnt: solicitudesNuevas.length }, { label: '⚙️ Por Máquina', cnt: null }].map((t, i) => (
            <button key={i} style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === i ? C.primary : C.textSecondary, borderBottom: tab === i ? `3px solid ${C.primary}` : '3px solid transparent', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setTab(i)}>
              {t.label}
              {t.cnt !== null && t.cnt > 0 && <span style={{ background: tab === i ? C.primary : C.border, color: tab === i ? '#fff' : C.textSecondary, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{t.cnt}</span>}
            </button>
          ))}
        </div>

        {/* ── TAB NUEVAS ── */}
        {tab === 0 && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[{ h: 24, l: 'Hoy (24h)' }, { h: 48, l: '48 horas' }, { h: 168, l: '7 días' }].map(({ h, l }) => (
                <button key={h} style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${C.border}`, background: filtroHoras === h ? C.primary : C.surface, color: filtroHoras === h ? '#fff' : C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }} onClick={() => setFiltroHoras(h)}>{l}</button>
              ))}
            </div>
            {solicitudesNuevas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.textLight, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 40 }}>✅</div>
                <div>Sin solicitudes nuevas en las últimas {filtroHoras}h</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {solicitudesNuevas.map(sol => (
                  <Tarjeta key={sol.id} sol={sol} onDetalle={() => setDetalle(sol)} onEstado={cambiarEstado} cambiando={cambiando} showMaquina />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB POR MÁQUINA ── */}
        {tab === 1 && porMaquina.map(({ maq, items, pendientes }) => {
          const abierto = expandidas[maq] !== false;
          return (
            <div key={maq} style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: abierto ? `1px solid ${C.border}` : 'none' }} onClick={() => setExpandidas(p => ({ ...p, [maq]: !p[maq] }))}>
                <span style={{ fontSize: 18, marginRight: 10 }}>⚙️</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{maq}</div>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{items.length} solicitud{items.length !== 1 ? 'es' : ''}</div>
                </div>
                {pendientes > 0 && <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, marginRight: 8 }}>{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>}
                <span style={{ color: C.textLight }}>{abierto ? '▲' : '▼'}</span>
              </button>
              {abierto && (
                <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                  {items.map(sol => (
                    <Tarjeta key={sol.id} sol={sol} onDetalle={() => setDetalle(sol)} onEstado={cambiarEstado} cambiando={cambiando} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setDetalle(null)}>
          <div style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.secondary }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Detalle de Solicitud</div>
              <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 22, cursor: 'pointer' }} onClick={() => setDetalle(null)}>✕</button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><div style={dl}>PRODUCTO</div><div style={dv_bold}>{detalle.nombre}</div>{detalle.codigoSAP && <div style={{ fontSize: 12, color: C.textSecondary }}>SAP: {detalle.codigoSAP}</div>}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><div style={dl}>MÁQUINA</div><div style={dv}>{detalle.maquina || 'N/A'}</div></div>
                <div><div style={dl}>PARTE</div><div style={dv}>{detalle.parteMaquina || 'N/A'}</div></div>
                <div><div style={dl}>CATEGORÍA</div><div style={dv}>{detalle.categoria || 'N/A'}</div></div>
                <div><div style={dl}>URGENCIA</div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: URGENCIA_CFG[detalle.urgencia]?.bg, color: URGENCIA_CFG[detalle.urgencia]?.color }}>
                    {URGENCIA_CFG[detalle.urgencia]?.label || detalle.urgencia}
                  </span>
                </div>
              </div>
              <div><div style={dl}>SOLICITANTE</div><div style={dv}>{detalle.usuario}</div></div>
              <div><div style={dl}>FECHA</div><div style={dv}>{fechaCorta(detalle.creadoEn)}</div></div>
              {detalle.caracteristicas && <div><div style={dl}>DETALLES</div><div style={{ background: C.background, borderLeft: `3px solid ${C.primary}`, padding: 12, borderRadius: 6, fontSize: 14, color: C.text, lineHeight: 1.6 }}>{detalle.caracteristicas}</div></div>}
              
              {detalle.fotografia && (
                <div>
                  <div style={dl}>FOTOGRAFÍA</div>
                  <div style={{ marginTop: 8, position: 'relative' }}>
                    <img 
                      src={detalle.fotografia} 
                      alt="Referencia" 
                      style={{ width: '100%', borderRadius: 10, border: `1px solid ${C.border}`, maxHeight: 300, objectFit: 'contain', background: '#000' }} 
                    />
                    <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                      <a 
                        href={detalle.fotografia} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 8, background: C.primary, color: '#fff', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                      >
                        👁️ Ver tamaño completo
                      </a>
                      <a 
                        href={detalle.fotografia} 
                        download={`foto_${detalle.nombre}.jpg`}
                        style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 8, background: '#f1f5f9', color: C.text, fontSize: 12, textDecoration: 'none', fontWeight: 600, border: `1px solid ${C.border}` }}
                      >
                        💾 Descargar Foto
                      </a>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <div style={{ ...dl, marginBottom: 10 }}>GESTIONAR ESTADO</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ESTADOS.map(est => {
                    const cfg = ESTADO_CFG[est] || {};
                    const activo = detalle.estado === est;
                    return (
                      <button key={est} disabled={activo || cambiando === detalle.id} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${activo ? cfg.border : C.border}`, background: activo ? cfg.bg : C.surface, color: activo ? cfg.color : C.textSecondary, cursor: activo ? 'default' : 'pointer', fontSize: 12, fontWeight: activo ? 700 : 500 }} onClick={() => cambiarEstado(detalle.id, est)}>
                        {activo ? '✓ ' : ''}{est.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.error}`, background: 'none', color: C.error, cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }} onClick={() => confirmarEliminar(detalle.id, detalle.nombre)}>
                🗑 Eliminar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tarjeta({ sol, onDetalle, onEstado, cambiando, showMaquina }) {
  const esAuto    = sol.usuario?.startsWith('Sistema');
  const esUrgente = sol.urgencia === 'urgencia';
  const estadoCfg = ESTADO_CFG[sol.estado] || {};
  const ms        = sol.creadoEn?.toDate ? sol.creadoEn.toDate().getTime() : 0;
  const reciente  = Date.now() - ms < 24 * 3600 * 1000;
  const borderColor = esUrgente ? C.error : esAuto ? '#f59e0b' : C.primary;

  return (
    <div style={{ ...card, marginBottom: 0, borderLeft: `4px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
        <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>🕐 {tiempoAtras(sol.creadoEn)}</span>
        {reciente  && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>NUEVA</span>}
        {esAuto    && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>⚡ AUTO</span>}
        {esUrgente && <span style={{ background: C.errorLight, color: C.error, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>🔴 URGENTE</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: estadoCfg.bg, color: estadoCfg.color, border: `1px solid ${estadoCfg.border}` }}>
          {sol.estado?.toUpperCase()}
        </span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{sol.nombre}</div>
      {sol.codigoSAP && <div style={{ fontSize: 11, color: C.textSecondary }}>SAP: {sol.codigoSAP}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {showMaquina && <span style={{ background: C.background, color: C.textSecondary, padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>⚙️ {sol.maquina || 'N/A'}</span>}
        <span style={{ background: C.background, color: C.textSecondary, padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>🔧 {sol.parteMaquina || 'N/A'}</span>
        {sol.categoria && <span style={{ background: C.background, color: C.textSecondary, padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>📂 {sol.categoria}</span>}
      </div>

      <div style={{ background: C.background, padding: '5px 10px', borderRadius: 6, fontSize: 12, color: C.textSecondary }}>
        👤 {sol.usuario}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${C.primary}`, background: 'none', color: C.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600 }} onClick={() => onDetalle(sol)}>Ver detalle</button>
        {sol.estado !== 'solicitud completada' && (
          <select style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, cursor: 'pointer' }} value={sol.estado} disabled={cambiando === sol.id} onChange={e => onEstado(sol.id, e.target.value)}>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

const dl = { fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 };
const dv = { fontSize: 14, color: C.text };
const dv_bold = { fontSize: 17, fontWeight: 700, color: C.text };
