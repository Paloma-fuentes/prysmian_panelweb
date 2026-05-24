import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';
import { notificarPanol } from '../services/notificacionesService';

const ESTADOS = ['en espera', 'en revision', 'pr realizada', 'completado', 'rechazado'];
const ESTADO_STYLE = {
  'en espera':    { bg: '#fef3c7', co: '#d97706', lbl: 'EN ESPERA' },
  'en revision':  { bg: '#eff6ff', co: '#3b82f6', lbl: 'EN REVISIÓN' },
  'pr realizada': { bg: '#fdf4ff', co: '#9333ea', lbl: 'PR REALIZADA' },
  'completado':   { bg: '#f0fdf4', co: '#16a34a', lbl: 'COMPLETADO' },
  'rechazado':    { bg: '#fef2f2', co: '#dc2626', lbl: 'RECHAZADO' },
};

const FILTROS_TIEMPO = [
  { id: '24h',  label: 'Hoy (24h)',  ms: 86_400_000 },
  { id: '48h',  label: '48 horas',   ms: 172_800_000 },
  { id: '7d',   label: '7 días',     ms: 604_800_000 },
  { id: 'todas',label: 'Todas',      ms: Infinity },
];

function exportCSV(lista, nombre) {
  const header = 'N°;Fecha;Hora;Repuesto;Máquina;Parte;Solicitante;Cantidad;Unidad;Proveedor;Costo Est.;Estado;Urgente';
  const rows = lista.map((c, i) => {
    const f = c.creadoEn?.toDate ? c.creadoEn.toDate() : new Date();
    return [
      i + 1,
      f.toLocaleDateString('es-CL'),
      f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      (c.nombre || c.producto || '').replace(/;/g, ','),
      (c.maquina || 'N/A').replace(/;/g, ','),
      (c.parteMaquina || '').replace(/;/g, ','),
      (c.usuario || '').replace(/;/g, ','),
      c.cantidad || 1,
      c.unidad || 'UND',
      (c.proveedor || '').replace(/;/g, ','),
      c.costoEstimado || 0,
      c.estado || '',
      c.urgencia === 'urgencia' ? 'SI' : 'NO',
    ].join(';');
  });
  const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${nombre}_${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}


export default function PanolCompras({ perfil, filtroInicial }) {
  const [compras,      setCompras]      = useState([]);
  const [usuarios,     setUsuarios]     = useState({});
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('nuevas');
  const [filtroTiempo, setFiltroTiempo] = useState('7d');
  const [soloUrgentes, setSoloUrgentes] = useState(filtroInicial === 'urgentes');
  const [editando,     setEditando]     = useState(null);
  const [guardando,    setGuardando]    = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, 'solicitudes_compra'), orderBy('creadoEn', 'desc')),
      snap => { setCompras(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    const u2 = onSnapshot(collection(db, 'usuarios'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setUsuarios(map);
    }, () => {});
    return () => { u1(); u2(); };
  }, []);

  function getFicha(sol) {
    const uid = sol.solicitanteUid || sol.usuarioUid;
    if (uid && usuarios[uid]?.ficha) return usuarios[uid].ficha;
    return sol.fichasSolicitante || sol.ficha || '—';
  }

  const ahora = Date.now();

  // Filtro por tiempo + urgentes
  const comprasFiltradas = useMemo(() => {
    if (soloUrgentes) return compras.filter(c => c.urgencia === 'urgencia');
    const cfg = FILTROS_TIEMPO.find(f => f.id === filtroTiempo);
    const cutoff = cfg?.ms === Infinity ? 0 : ahora - cfg.ms;
    return compras.filter(c => {
      const f = c.creadoEn?.toDate ? c.creadoEn.toDate().getTime() : 0;
      return f >= cutoff;
    });
  }, [compras, filtroTiempo, ahora, soloUrgentes]);

  // Por Máquinas — agrupar por nombre de máquina + KPIs
  const porMaquinasData = useMemo(() => {
    const enEspera   = compras.filter(c => c.estado === 'en espera').length;
    const enRevision = compras.filter(c => c.estado === 'en revision').length;
    const ult72h     = compras.filter(c => {
      const f = c.creadoEn?.toDate ? c.creadoEn.toDate().getTime() : 0;
      return ahora - f <= 259_200_000;
    }).length;
    const map = {};
    compras.forEach(c => {
      const maq = (c.maquina && c.maquina.trim() && c.maquina !== 'N/A') ? c.maquina.trim() : 'Sin Máquina';
      if (!map[maq]) map[maq] = [];
      map[maq].push(c);
    });
    const grupos = Object.entries(map)
      .map(([maquina, solicitudes]) => ({ maquina, solicitudes }))
      .sort((a, b) => {
        if (a.maquina === 'Sin Máquina') return 1;
        if (b.maquina === 'Sin Máquina') return -1;
        return a.maquina.localeCompare(b.maquina, 'es');
      });
    return { grupos, enEspera, enRevision, ult72h };
  }, [compras, ahora]);

  async function cambiarEstado(id, estado) {
    try {
      await updateDoc(doc(db, 'solicitudes_compra', id), { estado, actualizadoEn: serverTimestamp() });
    } catch (e) { console.error(e); }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta solicitud de compra?')) return;
    await deleteDoc(doc(db, 'solicitudes_compra', id));
  }

  async function guardarEdicion() {
    if (!editando) return;
    setGuardando(true);
    try {
      const { id, ...data } = editando;
      await updateDoc(doc(db, 'solicitudes_compra', id), { ...data, actualizadoEn: serverTimestamp() });
      setEditando(null);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setGuardando(false); }
  }

  function numSolicitud(idx, total) {
    const n = String(total - idx).padStart(4, '0');
    return `SC-${n}`;
  }

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando compras...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>

      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Gestión de Compras</h1>
          <p style={s.sub}>Control de solicitudes · {compras.length} en total</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setSoloUrgentes(v => !v)}
            style={{ ...s.excelBtn, background: soloUrgentes ? '#dc2626' : '#fff', color: soloUrgentes ? '#fff' : '#dc2626', border: '1.5px solid #dc2626' }}
          >
            🚨 {soloUrgentes ? `Urgentes (${comprasFiltradas.length})` : 'Urgentes'}
          </button>
          <button onClick={() => exportCSV(tab === 'nuevas' ? comprasFiltradas : compras, 'compras')} style={s.excelBtn}>⬇ Excel</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={s.tabBar}>
        {[['nuevas', '📋 Nuevas / Recientes'], ['maquinas', '🔧 Por Máquinas']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...s.tabBtn, ...(tab === id ? s.tabBtnActive : {}) }}>{lbl}</button>
        ))}
      </div>

      {/* ═══════ Tab Nuevas ═══════════════════════════════════════════════════ */}
      {tab === 'nuevas' && (
        <div style={s.content}>
          {/* Filtros de tiempo */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {FILTROS_TIEMPO.map(f => (
              <button key={f.id} onClick={() => setFiltroTiempo(f.id)}
                style={{ ...s.filtroBtn, ...(filtroTiempo === f.id ? s.filtroBtnActive : {}) }}>
                {f.label}
                <span style={{ marginLeft: 6, background: filtroTiempo === f.id ? 'rgba(255,255,255,0.3)' : '#e2e8f0', borderRadius: 10, padding: '0 7px', fontSize: 11 }}>
                  {compras.filter(c => {
                    if (f.ms === Infinity) return true;
                    const t = c.creadoEn?.toDate ? c.creadoEn.toDate().getTime() : 0;
                    return ahora - t <= f.ms;
                  }).length}
                </span>
              </button>
            ))}
          </div>

          {comprasFiltradas.length === 0 ? (
            <div style={s.empty}><div style={{ fontSize: 40 }}>🛒</div><div>No hay solicitudes en este período.</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comprasFiltradas.map((c, i) => <SolicitudCard key={c.id} c={c} idx={i} total={comprasFiltradas.length} ahora={ahora} getFicha={getFicha} cambiarEstado={cambiarEstado} eliminar={eliminar} setEditando={setEditando} numSolicitud={numSolicitud} />)}
            </div>
          )}
        </div>
      )}

      {/* ═══════ Tab Por Máquinas ═════════════════════════════════════════════ */}
      {tab === 'maquinas' && (
        <div style={s.content}>
          {/* KPIs */}
          <div style={s.kpiRow}>
            {[
              { lbl: 'Total en Espera',    val: porMaquinasData.enEspera,   color: '#d97706', bg: '#fff7ed' },
              { lbl: 'En Revisión',        val: porMaquinasData.enRevision, color: '#3b82f6', bg: '#eff6ff' },
              { lbl: 'Últimas 72 horas',   val: porMaquinasData.ult72h,     color: C.primary, bg: '#fff' },
            ].map(k => (
              <div key={k.lbl} style={{ flex: 1, minWidth: 140, background: k.bg, borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5, marginBottom: 6 }}>{k.lbl.toUpperCase()}</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Grupos por máquina */}
          {porMaquinasData.grupos.length === 0 ? (
            <div style={s.empty}><div style={{ fontSize: 40 }}>🔧</div><div>No hay solicitudes registradas.</div></div>
          ) : porMaquinasData.grupos.map(grupo => (
            <div key={grupo.maquina} style={{ marginBottom: 28 }}>
              <div style={{ ...s.secTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                {grupo.maquina === 'Sin Máquina' ? '📦' : '🔧'} {grupo.maquina}
                <span style={{ background: '#f1f5f9', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                  {grupo.solicitudes.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grupo.solicitudes.map((c, i) => (
                  <SolicitudCard key={c.id} c={c} idx={i} total={grupo.solicitudes.length} ahora={ahora} getFicha={getFicha} cambiarEstado={cambiarEstado} eliminar={eliminar} setEditando={setEditando} numSolicitud={numSolicitud} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal edición */}
      {editando && (
        <div style={s.overlay} onClick={() => setEditando(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 900, color: C.secondary }}>Editar Solicitud</h3>
              <button onClick={() => setEditando(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['nombre',       'Repuesto',       'text'],
                ['cantidad',     'Cantidad',       'number'],
                ['unidad',       'Unidad',         'text'],
                ['maquina',      'Máquina',        'text'],
                ['parteMaquina', 'Parte Máquina',  'text'],
                ['proveedor',    'Proveedor',      'text'],
                ['costoEstimado','Costo Est. ($)',  'number'],
              ].map(([k, lbl, t]) => (
                <div key={k}>
                  <label style={s.label}>{lbl.toUpperCase()}</label>
                  <input type={t} style={s.input} value={editando[k] || ''} onChange={e => setEditando({ ...editando, [k]: e.target.value })} />
                </div>
              ))}
              <div>
                <label style={s.label}>ESTADO</label>
                <select style={s.input} value={editando.estado || ''} onChange={e => setEditando({ ...editando, estado: e.target.value })}>
                  {ESTADOS.map(est => <option key={est} value={est}>{ESTADO_STYLE[est]?.lbl || est}</option>)}
                </select>
              </div>
            </div>
            <button onClick={guardarEdicion} disabled={guardando} style={{ ...s.saveBtn, marginTop: 20, opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de solicitud ─────────────────────────────────────────────────────
function SolicitudCard({ c, idx, total, ahora, getFicha, cambiarEstado, eliminar, setEditando, numSolicitud }) {
  const f = c.creadoEn?.toDate ? c.creadoEn.toDate() : null;
  const fechaStr = f ? f.toLocaleDateString('es-CL') : '—';
  const horaStr  = f ? f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—';
  const esNueva  = f && (ahora - f.getTime()) < 86_400_000;
  const eb       = ESTADO_STYLE[c.estado] || { bg: '#f1f5f9', co: '#64748b', lbl: (c.estado || '').toUpperCase() };
  const ficha    = getFicha(c);

  return (
    <div style={s2.card}>
      {/* Fila 1: número, badges, estado selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>{numSolicitud(idx, total)}</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>{fechaStr} {horaStr}</span>
        {esNueva && <span style={s2.badgeNueva}>🆕 NUEVA</span>}
        {c.urgencia === 'urgencia' && <span style={s2.badgeUrgente}>🚨 URGENTE</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={c.estado || ''}
            onChange={e => cambiarEstado(c.id, e.target.value)}
            style={{ background: eb.bg, color: eb.co, border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', outline: 'none' }}
          >
            {ESTADOS.map(est => <option key={est} value={est}>{ESTADO_STYLE[est]?.lbl || est}</option>)}
          </select>
          <button onClick={() => setEditando({ ...c })} style={s2.iconBtn} title="Editar">✏️</button>
          <button onClick={() => eliminar(c.id)} style={s2.iconBtn} title="Eliminar">🗑️</button>
        </div>
      </div>

      {/* Fila 2: info del repuesto */}
      <div style={{ fontSize: 15, fontWeight: 800, color: C.secondary, marginBottom: 6 }}>
        {c.nombre || c.producto || 'Sin nombre'}
      </div>

      {/* Fila 3: detalles en chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#475569' }}>
        <span>📦 <strong>{c.cantidad}</strong> {c.unidad || 'UND'}</span>
        {c.maquina && c.maquina !== 'N/A' && <span>🔧 {c.maquina}</span>}
        {c.parteMaquina && <span>⚙️ {c.parteMaquina}</span>}
        <span>👤 {c.usuario || '—'}</span>
        {ficha !== '—' && <span>🪪 Ficha {ficha}</span>}
        {c.proveedor && <span>🏭 {c.proveedor}</span>}
        {c.costoEstimado > 0 && <span>💲 ${Number(c.costoEstimado).toLocaleString('es-CL')}</span>}
      </div>
    </div>
  );
}

const s = {
  header:  { padding: '32px 40px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  titulo:  { margin: 0, fontSize: 24, fontWeight: 900, color: C.secondary },
  sub:     { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  excelBtn:{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  tabBar:  { display: 'flex', gap: 4, padding: '10px 40px 0', background: '#fff', borderBottom: '1px solid #e2e8f0' },
  tabBtn:  { padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  tabBtnActive: { background: C.primary, color: '#fff' },
  content: { padding: '24px 40px' },
  kpiRow:  { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  secTitle:{ fontSize: 15, fontWeight: 800, color: C.secondary, marginBottom: 12 },
  filtroBtn: { padding: '7px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' },
  filtroBtnActive: { background: C.secondary, color: '#fff', borderColor: C.secondary },
  empty:   { textAlign: 'center', padding: 60, color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal:   { background: '#fff', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' },
  closeBtn:{ background: '#f1f5f9', border: 'none', width: 34, height: 34, borderRadius: 17, cursor: 'pointer', fontSize: 15, fontWeight: 800, color: '#475569' },
  label:   { display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 6, letterSpacing: 0.5 },
  input:   { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: C.secondary, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' },
  saveBtn: { width: '100%', padding: 14, borderRadius: 12, border: 'none', background: C.secondary, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' },
};

const s2 = {
  card:        { background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  badgeNueva:  { background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 800 },
  badgeUrgente:{ background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 800 },
  iconBtn:     { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' },
};
