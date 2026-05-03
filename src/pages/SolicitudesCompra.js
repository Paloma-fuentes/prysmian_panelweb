import React, { useEffect, useState, useMemo } from 'react';
import { getSolicitudesCompra, actualizarEstado, eliminarSolicitudCompra } from '../services/solicitudesCompraService';

const ESTADOS = ['en espera', 'en revision', 'pr realizada', 'solicitud completada'];

const ESTADO_COLOR = {
  'en espera':           { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
  'en revision':         { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' },
  'pr realizada':        { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
  'solicitud completada':{ bg: '#dcfce7', color: '#166534', border: '#22c55e' },
};

const URGENCIA_COLOR = {
  urgencia: { bg: '#fee2e2', color: '#b91c1c', label: '🔴 URGENTE'  },
  alta:     { bg: '#fef3c7', color: '#92400e', label: '🟡 Alta'      },
  normal:   { bg: '#f0fdf4', color: '#166534', label: '🟢 Normal'    },
};

function tiempoAtras(ts) {
  if (!ts) return '—';
  const ms  = ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 60)  return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)}h`;
  return `hace ${Math.floor(min / 1440)}d`;
}

function fechaCorta(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SolicitudesCompra() {
  const [solicitudes, setSolicitudes]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState(0);        // 0=Nuevas 1=Por Máquina
  const [filtroHoras, setFiltroHoras]     = useState(24);
  const [expandidas, setExpandidas]       = useState({});
  const [detalle, setDetalle]             = useState(null);
  const [cambiandoEstado, setCambiando]   = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const data = await getSolicitudesCompra();
    setSolicitudes(data);
    setLoading(false);
  }

  // ── Solicitudes nuevas (filtro de tiempo) ──────────────────────────────
  const solicitudesNuevas = useMemo(() => {
    const corte = Date.now() - filtroHoras * 3_600_000;
    return solicitudes
      .filter(s => {
        const ms = s.creadoEn?.toDate ? s.creadoEn.toDate().getTime() : 0;
        return ms >= corte;
      })
      .sort((a, b) => {
        const fa = a.creadoEn?.toDate ? a.creadoEn.toDate().getTime() : 0;
        const fb = b.creadoEn?.toDate ? b.creadoEn.toDate().getTime() : 0;
        return fb - fa;
      });
  }, [solicitudes, filtroHoras]);

  // ── Agrupadas por máquina ──────────────────────────────────────────────
  const porMaquina = useMemo(() => {
    const mapa = {};
    solicitudes.forEach(s => {
      const maq = s.maquina || 'Sin Máquina';
      if (!mapa[maq]) mapa[maq] = [];
      mapa[maq].push(s);
    });
    return Object.entries(mapa)
      .map(([maq, items]) => ({
        maq,
        items: items.sort((a, b) => {
          const fa = a.creadoEn?.toDate ? a.creadoEn.toDate().getTime() : 0;
          const fb = b.creadoEn?.toDate ? b.creadoEn.toDate().getTime() : 0;
          return fb - fa;
        }),
        pendientes: items.filter(i => i.estado === 'en espera' || i.estado === 'en revision').length,
      }))
      .sort((a, b) => b.pendientes - a.pendientes || a.maq.localeCompare(b.maq));
  }, [solicitudes]);

  async function cambiarEstado(id, nuevoEstado) {
    setCambiando(id);
    await actualizarEstado(id, nuevoEstado);
    await cargar();
    if (detalle?.id === id) setDetalle(prev => ({ ...prev, estado: nuevoEstado }));
    setCambiando(null);
  }

  async function confirmarEliminar(id, nombre) {
    if (!window.confirm(`¿Eliminar la solicitud de "${nombre}"?`)) return;
    await eliminarSolicitudCompra(id);
    if (detalle?.id === id) setDetalle(null);
    cargar();
  }

  function toggleMaquina(maq) {
    setExpandidas(p => ({ ...p, [maq]: !p[maq] }));
  }

  // ── Resumen global ─────────────────────────────────────────────────────
  const resumen = useMemo(() => ({
    enEspera:  solicitudes.filter(s => s.estado === 'en espera').length,
    enRevision:solicitudes.filter(s => s.estado === 'en revision').length,
    urgentes:  solicitudes.filter(s => s.urgencia === 'urgencia' && s.estado === 'en espera').length,
  }), [solicitudes]);

  if (loading) return <div style={s.loading}>Cargando solicitudes de compra...</div>;

  return (
    <div style={s.page}>
      <h1 style={s.titulo}>Solicitudes de Compra</h1>

      {/* Resumen */}
      {(resumen.urgentes > 0 || resumen.enEspera > 0) && (
        <div style={s.banner}>
          <span style={s.bannerIcon}>⚠️</span>
          <span style={s.bannerTxt}>Requieren atención:</span>
          {resumen.urgentes > 0 && <span style={{ ...s.chip, background: '#fee2e2', color: '#b91c1c' }}>🔴 {resumen.urgentes} urgentes</span>}
          {resumen.enEspera > 0 && <span style={{ ...s.chip, background: '#fef3c7', color: '#92400e' }}>⏳ {resumen.enEspera} en espera</span>}
          {resumen.enRevision > 0 && <span style={{ ...s.chip, background: '#dbeafe', color: '#1e40af' }}>🔍 {resumen.enRevision} en revisión</span>}
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabBar}>
        <button
          style={{ ...s.tab, ...(tab === 0 ? s.tabActivo : {}) }}
          onClick={() => setTab(0)}
        >
          🆕 Nuevas
          {solicitudesNuevas.length > 0 && (
            <span style={{ ...s.tabBadge, ...(tab === 0 ? { background: '#fff', color: '#F4821F' } : {}) }}>
              {solicitudesNuevas.length}
            </span>
          )}
        </button>
        <button
          style={{ ...s.tab, ...(tab === 1 ? s.tabActivo : {}) }}
          onClick={() => setTab(1)}
        >
          ⚙️ Por Máquina
        </button>
      </div>

      {/* ══ TAB NUEVAS ══ */}
      {tab === 0 && (
        <div>
          {/* Filtro tiempo */}
          <div style={s.filtroRow}>
            {[{ h: 24, l: 'Hoy (24h)' }, { h: 48, l: '48 horas' }, { h: 168, l: '7 días' }].map(({ h, l }) => (
              <button
                key={h}
                style={{ ...s.filtroBtn, ...(filtroHoras === h ? s.filtroBtnActivo : {}) }}
                onClick={() => setFiltroHoras(h)}
              >
                {l}
              </button>
            ))}
          </div>

          {solicitudesNuevas.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 40 }}>✅</div>
              <div>Sin solicitudes nuevas en las últimas {filtroHoras}h</div>
            </div>
          ) : (
            <div style={s.cardGrid}>
              {solicitudesNuevas.map(sol => (
                <TarjetaSolicitud
                  key={sol.id}
                  sol={sol}
                  onDetalle={() => setDetalle(sol)}
                  onEstado={cambiarEstado}
                  onEliminar={confirmarEliminar}
                  cambiando={cambiandoEstado}
                  modoVista="nueva"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB POR MÁQUINA ══ */}
      {tab === 1 && (
        <div>
          {porMaquina.map(({ maq, items, pendientes }) => {
            const abierto = expandidas[maq] !== false;
            return (
              <div key={maq} style={s.maqCard}>
                <button style={s.maqHeader} onClick={() => toggleMaquina(maq)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <span style={s.maqIcon}>⚙️</span>
                    <div>
                      <div style={s.maqNombre}>{maq}</div>
                      <div style={s.maqSub}>{items.length} solicitud{items.length !== 1 ? 'es' : ''}</div>
                    </div>
                  </div>
                  {pendientes > 0 && (
                    <span style={s.pendBadge}>{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
                  )}
                  <span style={{ color: '#6b7280', marginLeft: 8 }}>{abierto ? '▲' : '▼'}</span>
                </button>

                {abierto && (
                  <div style={s.maqBody}>
                    {items.map(sol => (
                      <TarjetaSolicitud
                        key={sol.id}
                        sol={sol}
                        onDetalle={() => setDetalle(sol)}
                        onEstado={cambiarEstado}
                        onEliminar={confirmarEliminar}
                        cambiando={cambiandoEstado}
                        modoVista="maquina"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL DETALLE ══ */}
      {detalle && (
        <div style={s.overlay} onClick={() => setDetalle(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitulo}>Detalle de Solicitud</h2>
              <button style={s.closeBtn} onClick={() => setDetalle(null)}>✕</button>
            </div>

            <div style={s.modalBody}>
              {/* Producto */}
              <div style={s.detSection}>
                <div style={s.detLabel}>PRODUCTO</div>
                <div style={s.detValorBold}>{detalle.nombre}</div>
                {detalle.codigoSAP && <div style={s.detSub}>SAP: {detalle.codigoSAP}</div>}
              </div>

              <div style={s.detGrid}>
                <div>
                  <div style={s.detLabel}>MÁQUINA</div>
                  <div style={s.detValor}>{detalle.maquina || 'N/A'}</div>
                </div>
                <div>
                  <div style={s.detLabel}>PARTE</div>
                  <div style={s.detValor}>{detalle.parteMaquina || 'N/A'}</div>
                </div>
                <div>
                  <div style={s.detLabel}>CATEGORÍA</div>
                  <div style={s.detValor}>{detalle.categoria || 'N/A'}</div>
                </div>
                <div>
                  <div style={s.detLabel}>URGENCIA</div>
                  <div style={{ ...s.urgBadge, ...URGENCIA_COLOR[detalle.urgencia] }}>
                    {URGENCIA_COLOR[detalle.urgencia]?.label || detalle.urgencia}
                  </div>
                </div>
              </div>

              <div style={s.detSection}>
                <div style={s.detLabel}>SOLICITANTE</div>
                <div style={s.detValor}>{detalle.usuario}</div>
              </div>

              <div style={s.detSection}>
                <div style={s.detLabel}>FECHA</div>
                <div style={s.detValor}>{fechaCorta(detalle.creadoEn)}</div>
              </div>

              {detalle.caracteristicas && (
                <div style={s.detSection}>
                  <div style={s.detLabel}>DETALLES / CARACTERÍSTICAS</div>
                  <div style={s.detBox}>{detalle.caracteristicas}</div>
                </div>
              )}

              {/* Cambiar estado */}
              <div style={s.detSection}>
                <div style={s.detLabel}>GESTIONAR ESTADO</div>
                <div style={s.estadoRow}>
                  {ESTADOS.map(est => (
                    <button
                      key={est}
                      disabled={detalle.estado === est || cambiandoEstado === detalle.id}
                      style={{
                        ...s.estadoBtn,
                        ...(detalle.estado === est ? {
                          background: ESTADO_COLOR[est]?.bg || '#e5e7eb',
                          color: ESTADO_COLOR[est]?.color || '#111',
                          borderColor: ESTADO_COLOR[est]?.border || '#ccc',
                          fontWeight: 'bold',
                        } : {}),
                      }}
                      onClick={() => cambiarEstado(detalle.id, est)}
                    >
                      {est === detalle.estado ? '✓ ' : ''}{est.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div style={s.accionesRow}>
                <button
                  style={s.btnEliminar}
                  onClick={() => confirmarEliminar(detalle.id, detalle.nombre)}
                >
                  🗑 Eliminar solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta individual ────────────────────────────────────────────────────
function TarjetaSolicitud({ sol, onDetalle, onEstado, onEliminar, cambiando, modoVista }) {
  const esAuto    = sol.usuario?.startsWith('Sistema');
  const esUrgente = sol.urgencia === 'urgencia';
  const estadoEst = ESTADO_COLOR[sol.estado] || {};
  const urgEst    = URGENCIA_COLOR[sol.urgencia] || {};
  const ms        = sol.creadoEn?.toDate ? sol.creadoEn.toDate().getTime() : 0;
  const reciente  = Date.now() - ms < 24 * 3600 * 1000;

  return (
    <div style={{
      ...s.tarjeta,
      borderLeft: `4px solid ${esUrgente ? '#ef4444' : esAuto ? '#f59e0b' : '#3b82f6'}`,
    }}>
      {/* Fila superior */}
      <div style={s.tarjetaTop}>
        <span style={s.tiempoBadge}>🕐 {tiempoAtras(sol.creadoEn)}</span>
        {reciente && <span style={s.nuevaBadge}>NUEVA</span>}
        {esAuto   && <span style={s.autoBadge}>⚡ AUTO</span>}
        {esUrgente&& <span style={{ ...s.urgBadgeSmall, ...urgEst }}>🔴 URGENTE</span>}
        <span style={{ ...s.estadoBadge, background: estadoEst.bg, color: estadoEst.color, borderColor: estadoEst.border }}>
          {sol.estado?.toUpperCase()}
        </span>
      </div>

      {/* Nombre */}
      <div style={s.tarjetaNombre}>{sol.nombre}</div>
      {sol.codigoSAP && <div style={s.tarjetaSap}>SAP: {sol.codigoSAP}</div>}

      {/* Info */}
      <div style={s.tarjetaInfoRow}>
        {modoVista === 'nueva' && <span style={s.infoChip}>⚙️ {sol.maquina || 'N/A'}</span>}
        <span style={s.infoChip}>🔧 {sol.parteMaquina || 'N/A'}</span>
        {sol.categoria && <span style={s.infoChip}>📂 {sol.categoria}</span>}
      </div>

      {/* Solicitante */}
      <div style={s.tarjetaUser}>👤 {sol.usuario}</div>

      {/* Acciones */}
      <div style={s.tarjetaAcciones}>
        <button style={s.btnDetalle} onClick={() => onDetalle(sol)}>Ver detalle</button>
        {sol.estado !== 'solicitud completada' && (
          <select
            style={s.selectEstado}
            value={sol.estado}
            disabled={cambiando === sol.id}
            onChange={e => onEstado(sol.id, e.target.value)}
          >
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const s = {
  page:    { padding: '28px 32px', color: '#f1f5f9' },
  titulo:  { fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 20 },
  loading: { padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 18 },
  empty:   { textAlign: 'center', padding: 60, color: '#6b7280', fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },

  banner:      { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#1f2937', borderLeft: '4px solid #f59e0b', borderRadius: 8, padding: '12px 16px', marginBottom: 20 },
  bannerIcon:  { fontSize: 18 },
  bannerTxt:   { color: '#fcd34d', fontWeight: 700, fontSize: 14 },
  chip:        { padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 },

  tabBar:    { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #374151' },
  tab:       { padding: '10px 24px', background: 'none', border: 'none', color: '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderBottom: '3px solid transparent', marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8, borderRadius: '6px 6px 0 0' },
  tabActivo: { color: '#F4821F', borderBottomColor: '#F4821F', background: '#1f2937' },
  tabBadge:  { background: '#F4821F', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },

  filtroRow:       { display: 'flex', gap: 8, marginBottom: 16 },
  filtroBtn:       { padding: '6px 16px', borderRadius: 20, border: '1px solid #374151', background: '#1f2937', color: '#9ca3af', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  filtroBtnActivo: { background: '#F4821F', borderColor: '#F4821F', color: '#fff' },

  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },

  tarjeta:       { background: '#1f2937', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  tarjetaTop:    { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  tiempoBadge:   { background: '#312e81', color: '#a5b4fc', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 },
  nuevaBadge:    { background: '#1d4ed8', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 },
  autoBadge:     { background: '#78350f', color: '#fbbf24', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 },
  urgBadgeSmall: { padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 },
  estadoBadge:   { padding: '3px 8px', borderRadius: 10, border: '1px solid', fontSize: 10, fontWeight: 700, marginLeft: 'auto' },
  tarjetaNombre: { fontSize: 15, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 },
  tarjetaSap:    { fontSize: 12, color: '#6b7280' },
  tarjetaInfoRow:{ display: 'flex', flexWrap: 'wrap', gap: 6 },
  infoChip:      { background: '#111827', color: '#9ca3af', padding: '3px 8px', borderRadius: 6, fontSize: 12 },
  tarjetaUser:   { fontSize: 13, color: '#6b7280', background: '#111827', padding: '6px 10px', borderRadius: 6 },
  tarjetaAcciones:{ display: 'flex', gap: 8, marginTop: 4 },
  btnDetalle:    { flex: 1, padding: '7px 12px', borderRadius: 8, border: '1px solid #F4821F', background: 'none', color: '#F4821F', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  selectEstado:  { flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #374151', background: '#111827', color: '#f1f5f9', fontSize: 12, cursor: 'pointer' },

  maqCard:   { background: '#1f2937', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  maqHeader: { width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#f1f5f9', textAlign: 'left' },
  maqIcon:   { fontSize: 20 },
  maqNombre: { fontWeight: 700, fontSize: 15, color: '#f1f5f9' },
  maqSub:    { fontSize: 12, color: '#6b7280', marginTop: 2 },
  pendBadge: { background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 },
  maqBody:   { padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 },

  // Modal
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:      { background: '#1f2937', borderRadius: 16, width: '90%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #374151' },
  modalTitulo:{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  closeBtn:   { background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer', padding: '0 4px' },
  modalBody:  { padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  detSection: { display: 'flex', flexDirection: 'column', gap: 4 },
  detLabel:   { fontSize: 11, color: '#6b7280', fontWeight: 700, letterSpacing: 1 },
  detValor:   { fontSize: 15, color: '#f1f5f9' },
  detValorBold:{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' },
  detSub:     { fontSize: 12, color: '#9ca3af' },
  detGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  detBox:     { background: '#111827', borderLeft: '3px solid #F4821F', padding: 12, borderRadius: 6, fontSize: 14, color: '#d1d5db', lineHeight: 1.6 },
  urgBadge:   { display: 'inline-block', padding: '4px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700 },
  estadoRow:  { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  estadoBtn:  { padding: '8px 14px', borderRadius: 8, border: '1px solid #374151', background: '#111827', color: '#9ca3af', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  accionesRow:{ display: 'flex', gap: 10, marginTop: 8 },
  btnEliminar:{ padding: '9px 16px', borderRadius: 8, border: '1px solid #ef4444', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
};
