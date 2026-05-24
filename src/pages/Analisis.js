import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';

const PERIODOS = [
  { d: 7,  label: '7 días'  },
  { d: 15, label: '15 días' },
  { d: 30, label: '30 días' },
  { d: 90, label: '90 días' },
];

const TABS = [
  { id: 'maquinas',    label: 'Máquinas',            icon: '🔧' },
  { id: 'diagnostico', label: 'Diagnóstico',          icon: '🩺' },
  { id: 'stock',       label: 'Stock Crítico',        icon: '⚠️' },
  { id: 'proveedores', label: 'Proveedores',          icon: '🏭' },
  { id: 'compras',     label: 'Compras / SAP',        icon: '🛒' },
  { id: 'areas',       label: 'Áreas & Solicitantes', icon: '👥' },
];

function normStr(v) { return (v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function fmt$(n) { return `$${Math.round(n).toLocaleString('es-CL')}`; }

export default function Analisis({ perfil }) {
  const [historial,    setHistorial]    = useState([]);
  const [materiales,   setMateriales]   = useState([]);
  const [compras,      setCompras]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('maquinas');
  const [dias,         setDias]         = useState(30);
  const [maquinaSel,   setMaquinaSel]   = useState(null);
  const [busqModal,    setBusqModal]    = useState('');
  const [filtroCompra, setFiltroCompra] = useState('todas');
  const [sapModal,     setSapModal]     = useState(false);
  const [sapCopiado,   setSapCopiado]   = useState(false);
  const [diagMaqSel,   setDiagMaqSel]   = useState(null);

  const esAdmin = ['admin', 'administrador', 'panol'].includes((perfil?.rol || '').toLowerCase());

  // ── Suscripciones en tiempo real ────────────────────────────────────────────
  useEffect(() => {
    let n = 0;
    const done = () => { n++; if (n >= 3) setLoading(false); };

    const u1 = onSnapshot(
      query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(3000)),
      snap => { setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },
      () => done()
    );
    const u2 = onSnapshot(
      collection(db, 'materiales'),
      snap => { setMateriales(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },
      () => done()
    );
    const u3 = onSnapshot(
      query(collection(db, 'solicitudes_compra'), orderBy('creadoEn', 'desc')),
      snap => { setCompras(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },
      () => done()
    );
    return () => { u1(); u2(); u3(); };
  }, []);

  // ── Máquinas ────────────────────────────────────────────────────────────────
  const { maquinas, kpisMaq } = useMemo(() => {
    const ahora      = Date.now();
    const inicioPer  = ahora - dias * 86_400_000;
    const inicioPrev = inicioPer - dias * 86_400_000;

    const retiros = historial.filter(h => h.tipo === 'retiro' && h.maquina && h.maquina !== 'N/A');

    const totalPer = {}, totalPrev = {}, ultimaFecha = {};
    retiros.forEach(h => {
      const maq  = h.maquina.trim();
      const f    = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
      const cant = Number(h.cantidad) || 1;
      if (f >= inicioPer) {
        totalPer[maq] = (totalPer[maq] || 0) + cant;
        if (!ultimaFecha[maq] || f > ultimaFecha[maq]) ultimaFecha[maq] = f;
      } else if (f >= inicioPrev) {
        totalPrev[maq] = (totalPrev[maq] || 0) + cant;
      }
    });

    const lista = Object.entries(totalPer)
      .sort((a, b) => b[1] - a[1]).slice(0, 20)
      .map(([nombre, total]) => {
        const prev = totalPrev[nombre] || 0;
        const tend = total > prev * 1.1 ? 'sube' : total < prev * 0.9 ? 'baja' : 'estable';
        return { nombre, total, prev, tend, ultimaFecha: ultimaFecha[nombre] ? new Date(ultimaFecha[nombre]) : null };
      });

    const topMatMap = {};
    retiros.filter(h => { const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0; return f >= inicioPer; })
      .forEach(h => { const p = h.producto || '—'; topMatMap[p] = (topMatMap[p] || 0) + (Number(h.cantidad) || 1); });
    const topMaterial = Object.entries(topMatMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return {
      maquinas: lista,
      kpisMaq: { totalRetiros: lista.reduce((acc, m) => acc + m.total, 0), maqActivas: lista.length, topMaterial },
    };
  }, [historial, dias]);

  const maxMaqVal = maquinas[0]?.total || 1;

  // ── Stock Crítico ────────────────────────────────────────────────────────────
  const { sinStock, bajoStock, conStockOk } = useMemo(() => {
    const sin  = materiales
      .filter(m => (m.stock ?? 0) === 0)
      .sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || ''));
    const bajo = materiales
      .filter(m => (m.stock ?? 0) > 0 && (m.bajoStock || m.stock <= (m.puntoReorden || m.stockMinimo || 2)))
      .sort((a, b) => (a.stock || 0) - (b.stock || 0));
    const ok = materiales.filter(m => m.stock > 0 && !m.bajoStock && m.stock > (m.stockMinimo || 2)).length;
    return { sinStock: sin, bajoStock: bajo, conStockOk: ok };
  }, [materiales]);

  // ── Proveedores ──────────────────────────────────────────────────────────────
  const proveedores = useMemo(() => {
    const map = {};
    compras.forEach(c => {
      const prov = (c.proveedor || '').trim() || 'Sin Proveedor';
      if (!map[prov]) map[prov] = { nombre: prov, total: 0, ordenes: 0, pendientes: 0, ultima: null };
      map[prov].total    += (c.cantidad || 0) * (c.costoEstimado || 0);
      map[prov].ordenes  += 1;
      if (c.estado === 'en espera') map[prov].pendientes += 1;
      const f = c.creadoEn?.toDate ? c.creadoEn.toDate() : null;
      if (f && (!map[prov].ultima || f > map[prov].ultima)) map[prov].ultima = f;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [compras]);

  const maxProvTotal = proveedores[0]?.total || 1;

  // ── Compras filtradas ────────────────────────────────────────────────────────
  const comprasFiltradas = useMemo(() => {
    if (filtroCompra === 'todas') return compras;
    if (filtroCompra === 'urgencia') return compras.filter(c => c.urgencia === 'urgencia');
    return compras.filter(c => c.estado === filtroCompra);
  }, [compras, filtroCompra]);

  // ── Script SAP (CSV de órdenes en espera) ────────────────────────────────────
  const sapScript = useMemo(() => {
    const pendientes = compras.filter(c => c.estado === 'en espera');
    const header = 'CODIGO_MAT;DESCRIPCION;CANTIDAD;UNIDAD;PROVEEDOR;PRECIO_UNIT;MONEDA;MAQUINA;URGENTE';
    const rows = pendientes.map(c => [
      c.codigoMaterial || c.id.slice(0, 8).toUpperCase(),
      (c.nombre || c.producto || '').replace(/;/g, ','),
      c.cantidad || 1,
      c.unidad || 'UND',
      (c.proveedor || '').replace(/;/g, ','),
      c.costoEstimado || 0,
      'CLP',
      (c.maquina || 'STOCK').replace(/;/g, ','),
      c.urgencia === 'urgencia' ? 'SI' : 'NO',
    ].join(';'));
    return [header, ...rows].join('\n');
  }, [compras]);

  function descargarSAP() {
    const blob = new Blob([sapScript], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sap_compras_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copiarSAP() {
    navigator.clipboard?.writeText(sapScript).then(() => {
      setSapCopiado(true);
      setTimeout(() => setSapCopiado(false), 2000);
    });
  }

  // ── Áreas & Solicitantes ────────────────────────────────────────────────────
  const { areasData, solicitantesData } = useMemo(() => {
    const ahora     = Date.now();
    const inicioPer = ahora - dias * 86_400_000;

    const recientes = historial.filter(h => {
      if (h.tipo !== 'retiro') return false;
      const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
      return f >= inicioPer;
    });

    const areasMap = {};
    const solMap   = {};
    recientes.forEach(h => {
      const area = (h.area || 'General').trim();
      areasMap[area] = (areasMap[area] || 0) + (Number(h.cantidad) || 1);
      const sol = (h.usuario || 'Anónimo').trim();
      solMap[sol] = (solMap[sol] || 0) + (Number(h.cantidad) || 1);
    });

    return {
      areasData:      Object.entries(areasMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
      solicitantesData: Object.entries(solMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })),
    };
  }, [historial, dias]);

  // ── Modal máquina ────────────────────────────────────────────────────────────
  const datosModal = useMemo(() => {
    if (!maquinaSel) return { semanas: [], materiales: [], movimientos: [] };

    const movs = historial.filter(h =>
      h.maquina?.trim() === maquinaSel.nombre &&
      (esAdmin || h.solicitanteUid === perfil?.uid || h.usuario === perfil?.nombre)
    );

    const ahora = Date.now();
    const semanas = [];
    for (let i = 7; i >= 0; i--) {
      const ini = ahora - (i + 1) * 7 * 86_400_000;
      const fin = ahora - i * 7 * 86_400_000;
      const lbl = new Date(ini).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
      const total = movs.filter(h => h.tipo === 'retiro').reduce((acc, h) => {
        const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
        return (f >= ini && f < fin) ? acc + (Number(h.cantidad) || 1) : acc;
      }, 0);
      semanas.push({ lbl, total });
    }

    const matMap = {};
    movs.filter(h => h.tipo === 'retiro').forEach(h => {
      const p = h.producto || 'Sin nombre';
      matMap[p] = (matMap[p] || 0) + (Number(h.cantidad) || 1);
    });
    const materiales = Object.entries(matMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nombre, cant]) => ({ nombre, cant }));

    const q = normStr(busqModal);
    const filtrados = movs.filter(h => !q || normStr(h.producto || '').includes(q) || normStr(h.usuario || '').includes(q)).slice(0, 80);

    return { semanas, materiales, movimientos: filtrados };
  }, [maquinaSel, historial, busqModal, esAdmin, perfil]);

  // ── Diagnóstico de fallas recurrentes ──────────────────────────────────────
  const diagnostico = useMemo(() => {
    const maqMap = {};
    historial.filter(h => h.tipo === 'retiro' && h.maquina && h.maquina !== 'N/A').forEach(h => {
      const maq  = h.maquina.trim();
      const prod = h.producto || 'Sin nombre';
      const f    = h.fecha?.toDate ? h.fecha.toDate() : null;
      if (!f) return;
      if (!maqMap[maq]) maqMap[maq] = {};
      if (!maqMap[maq][prod]) maqMap[maq][prod] = [];
      maqMap[maq][prod].push(f.getTime());
    });
    const fallas = [];
    Object.entries(maqMap).forEach(([maq, prods]) => {
      Object.entries(prods).forEach(([prod, fechas]) => {
        const sorted = [...fechas].sort((a, b) => a - b);
        let maxEnVentana = 0;
        for (let i = 0; i < sorted.length; i++) {
          const fin   = sorted[i] + 7 * 86_400_000;
          const count = sorted.filter(t => t >= sorted[i] && t <= fin).length;
          if (count > maxEnVentana) maxEnVentana = count;
        }
        if (maxEnVentana > 2) fallas.push({ maquina: maq, producto: prod, frecuencia: maxEnVentana, total: fechas.length });
      });
    });
    return fallas.sort((a, b) => b.frecuencia - a.frecuencia);
  }, [historial]);

  const panosPorTrabajador = useMemo(() => {
    const ahora = Date.now();
    const ini   = ahora - dias * 86_400_000;
    const map   = {};
    historial.filter(h => {
      if (h.tipo !== 'retiro') return false;
      const t = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
      if (t < ini) return false;
      const n = normStr(h.producto || '');
      return n.includes('pano') || n.includes('guaipe') || n.includes('trapo') || n.includes('tela');
    }).forEach(h => {
      const u = (h.usuario || 'Anónimo').trim();
      map[u] = (map[u] || 0) + (Number(h.cantidad) || 1);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([nombre, total]) => ({ nombre, total }));
  }, [historial, dias]);

  // Materiales con alta rotación (para stock crítico diagnóstico)
  const altaRotacion = useMemo(() => {
    const ahora    = Date.now();
    const ini      = ahora - dias * 86_400_000;
    const retMap   = {};
    historial.filter(h => h.tipo === 'retiro').forEach(h => {
      const t = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
      if (t < ini) return;
      const p = h.producto || 'Sin nombre';
      retMap[p] = (retMap[p] || 0) + (Number(h.cantidad) || 1);
    });
    return Object.entries(retMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([nombre, usoMes]) => {
        const mat = materiales.find(m => normStr(m.descripcion || '').includes(normStr(nombre)) || normStr(nombre).includes(normStr(m.descripcion || '')));
        return { nombre, usoMes, stock: mat?.stock ?? '—', min: mat?.stockMinimo || 2 };
      });
  }, [historial, materiales, dias]);

  // ── Helpers de render ────────────────────────────────────────────────────────
  const ESTADO_BADGE = {
    'en espera':  { bg: '#fef3c7', co: '#d97706', lbl: 'EN ESPERA' },
    'en proceso': { bg: '#eff6ff', co: '#3b82f6', lbl: 'EN PROCESO' },
    'completado': { bg: '#f0fdf4', co: '#16a34a', lbl: 'COMPLETADO' },
    'urgencia':   { bg: '#fef2f2', co: '#ef4444', lbl: 'URGENTE' },
    'cancelado':  { bg: '#f8fafc', co: '#94a3b8', lbl: 'CANCELADO' },
  };

  if (loading) return (
    <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando datos de análisis...</div>
  );

  const showPeriodo = tab === 'maquinas' || tab === 'areas';

  return (
    <div style={{ minHeight: '100vh', background: C.background, paddingBottom: 60 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={st.header}>
        <div>
          <h1 style={st.titulo}>Análisis del Mes</h1>
          <p style={st.sub}>Máquinas · Stock Crítico · Proveedores · Compras SAP · Áreas</p>
        </div>
        {showPeriodo && (
          <div style={{ display: 'flex', gap: 8 }}>
            {PERIODOS.map(p => (
              <button key={p.d} style={{ ...st.perBtn, ...(dias === p.d ? st.perBtnActive : {}) }} onClick={() => setDias(p.d)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={st.tabBar}>
        {TABS.map(t => (
          <button key={t.id} style={{ ...st.tabBtn, ...(tab === t.id ? st.tabBtnActive : {}) }} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Máquinas
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'maquinas' && (
        <div style={st.content}>
          <div style={st.kpiRow}>
            {[
              { lbl: 'Retiros en período', val: kpisMaq.totalRetiros, color: C.primary },
              { lbl: 'Máquinas activas',   val: kpisMaq.maqActivas,   color: '#6366f1' },
              { lbl: 'Material top',       val: kpisMaq.topMaterial,  color: C.secondary, small: true },
            ].map(k => (
              <div key={k.lbl} style={{ ...st.kpiCard, borderLeftColor: k.color }}>
                <div style={st.kpiLbl}>{k.lbl.toUpperCase()}</div>
                <div style={{ fontSize: k.small ? 15 : 28, fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.val}</div>
              </div>
            ))}
          </div>

          {maquinas.length === 0 ? (
            <div style={st.empty}><div style={{ fontSize: 40 }}>🔧</div><div>Sin retiros con máquina asignada en los últimos {dias} días.</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {maquinas.map((maq, i) => {
                const pct   = Math.max(4, Math.round((maq.total / maxMaqVal) * 100));
                const barCo = i === 0 ? '#ef4444' : i <= 2 ? '#f97316' : i <= 4 ? '#eab308' : C.primary;
                const tend  = maq.tend === 'sube' ? { ic: '↑', co: '#ef4444', lbl: 'Sube' }
                            : maq.tend === 'baja' ? { ic: '↓', co: '#10b981', lbl: 'Baja' }
                            : { ic: '→', co: '#94a3b8', lbl: 'Estable' };
                return (
                  <div key={maq.nombre} onClick={() => { setMaquinaSel(maq); setBusqModal(''); }} style={st.maqCard}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? barCo : '#e2e8f0', color: i < 3 ? '#fff' : C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{maq.nombre}</div>
                        <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Último: {maq.ultimaFecha?.toLocaleDateString('es-CL') || '—'}</div>
                      </div>
                    </div>
                    <div style={{ flex: 2, padding: '0 16px' }}>
                      <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barCo, borderRadius: 5, transition: 'width 0.6s' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: C.secondary, lineHeight: 1 }}>{maq.total}</div>
                        <div style={{ fontSize: 10, color: C.textLight }}>retiros</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 56 }}>
                        <div style={{ fontSize: 16, color: tend.co }}>{tend.ic}</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: tend.co }}>{tend.lbl.toUpperCase()}</div>
                        {maq.prev > 0 && <div style={{ fontSize: 9, color: C.textLight }}>vs {maq.prev} ant.</div>}
                      </div>
                      <div style={{ color: C.primary, fontSize: 12, fontWeight: 700 }}>Ver →</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Diagnóstico
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'diagnostico' && (
        <div style={st.content}>
          {/* KPIs diagnóstico */}
          <div style={st.kpiRow}>
            {[
              { lbl: 'Fallas Recurrentes', val: diagnostico.length,              color: '#dc2626' },
              { lbl: 'Máquinas Afectadas', val: new Set(diagnostico.map(d => d.maquina)).size, color: '#d97706' },
              { lbl: 'Paños en período',   val: panosPorTrabajador.reduce((s, p) => s + p.total, 0), color: '#6366f1' },
            ].map(k => (
              <div key={k.lbl} style={{ ...st.kpiCard, borderLeftColor: k.color }}>
                <div style={st.kpiLbl}>{k.lbl.toUpperCase()}</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>

            {/* Fallas recurrentes */}
            <div>
              <div style={st.seccionTitle}><span style={{ fontSize: 20 }}>🩺</span> Fallas Recurrentes</div>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 0, marginBottom: 14 }}>
                Materiales retirados de la misma máquina más de 2 veces en una semana.
              </p>
              {diagnostico.length === 0 ? (
                <div style={st.empty}><div style={{ fontSize: 32 }}>✅</div><div>Sin fallas recurrentes detectadas.</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {diagnostico.slice(0, 15).map((d, i) => (
                    <div key={i}
                      onClick={() => setDiagMaqSel(diagMaqSel?.maquina === d.maquina ? null : d)}
                      style={{ background: diagMaqSel?.maquina === d.maquina ? '#fef3c7' : '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer', border: `1.5px solid ${diagMaqSel?.maquina === d.maquina ? '#d97706' : 'transparent'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.secondary }}>{d.maquina}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{d.producto}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{d.frecuencia}×</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>en 7 días</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Detalle al seleccionar máquina */}
              {diagMaqSel && (
                <div style={{ marginTop: 16, background: '#fff7ed', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706', marginBottom: 10 }}>
                    MATERIALES CRÍTICOS — {diagMaqSel.maquina}
                  </div>
                  {Object.entries(
                    historial
                      .filter(h => h.tipo === 'retiro' && h.maquina?.trim() === diagMaqSel.maquina)
                      .reduce((acc, h) => {
                        const p = h.producto || 'Sin nombre';
                        acc[p] = (acc[p] || 0) + (Number(h.cantidad) || 1);
                        return acc;
                      }, {})
                  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([prod, cant], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #fed7aa', fontSize: 12 }}>
                      <span style={{ color: C.secondary, fontWeight: 600 }}>{prod}</span>
                      <span style={{ fontWeight: 800, color: '#d97706' }}>{cant} u.</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paños por trabajador */}
            <div>
              <div style={st.seccionTitle}><span style={{ fontSize: 20 }}>🧻</span> Paños por Trabajador — {dias} días</div>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 0, marginBottom: 14 }}>
                Consumo de paños, guaipes y trapos por solicitante en el período.
              </p>
              {panosPorTrabajador.length === 0 ? (
                <div style={st.empty}><div style={{ fontSize: 32 }}>🧻</div><div>Sin consumo de paños registrado.</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {panosPorTrabajador.map((p, i) => {
                    const maxP  = panosPorTrabajador[0].total;
                    const pct   = Math.max(4, Math.round((p.total / maxP) * 100));
                    const barCo = i === 0 ? '#dc2626' : i <= 2 ? '#f97316' : '#94a3b8';
                    return (
                      <div key={p.nombre} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: i < 3 ? barCo : '#e2e8f0', color: i < 3 ? '#fff' : C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>{i + 1}</div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: C.secondary }}>{p.nombre}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 900, color: barCo }}>{p.total} u.</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barCo, borderRadius: 3, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Alta Rotación + stock disponible */}
          <div style={{ marginTop: 28 }}>
            <div style={st.seccionTitle}><span style={{ fontSize: 20 }}>🔄</span> Alta Rotación — Disponibilidad de Stock</div>
            <div style={st.grid3}>
              {altaRotacion.map((m, i) => {
                const stockNum = typeof m.stock === 'number' ? m.stock : null;
                const critico  = stockNum !== null && stockNum <= m.min;
                return (
                  <div key={m.nombre} style={{ ...st.matCard, borderLeft: `4px solid ${critico ? '#ef4444' : '#10b981'}` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.secondary, marginBottom: 6, lineHeight: 1.4 }}>{m.nombre}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                      <span>Stock: <strong style={{ color: critico ? '#ef4444' : '#16a34a' }}>{m.stock === '—' ? '—' : `${m.stock} u.`}</strong></span>
                      <span>Uso: <strong style={{ color: C.primary }}>{m.usoMes} u.</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Stock Crítico
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'stock' && (
        <div style={st.content}>
          <div style={st.kpiRow}>
            {[
              { lbl: 'Sin Stock',  val: sinStock.length,  color: C.error,   bg: '#fef2f2' },
              { lbl: 'Bajo Stock', val: bajoStock.length, color: '#f97316', bg: '#fff7ed' },
              { lbl: 'Con Stock',  val: conStockOk,       color: C.success, bg: '#f0fdf4' },
            ].map(k => (
              <div key={k.lbl} style={{ ...st.kpiCard, borderLeftColor: k.color, background: k.bg }}>
                <div style={st.kpiLbl}>{k.lbl.toUpperCase()}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {sinStock.length > 0 && (
            <div style={st.seccion}>
              <div style={st.seccionTitle}><span style={{ fontSize: 20 }}>🚨</span> Sin Stock — {sinStock.length} item{sinStock.length !== 1 ? 's' : ''}</div>
              <div style={st.grid3}>
                {sinStock.map(m => (
                  <div key={m.id} style={{ ...st.matCard, borderLeft: `4px solid ${C.error}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.secondary, marginBottom: 6, lineHeight: 1.3 }}>{m.descripcion}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, color: C.textLight }}>{m.categoria || 'Sin categoría'}</div>
                        <div style={{ fontSize: 11, color: C.textLight }}>Mín: {m.stockMinimo || 2} ud.</div>
                      </div>
                      <div style={{ background: C.error, color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 900 }}>0 ud.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bajoStock.length > 0 && (
            <div style={st.seccion}>
              <div style={st.seccionTitle}><span style={{ fontSize: 20 }}>⚠️</span> Bajo Stock — {bajoStock.length} item{bajoStock.length !== 1 ? 's' : ''}</div>
              <div style={st.grid3}>
                {bajoStock.map(m => {
                  const pct = Math.min(100, Math.round(((m.stock || 0) / (m.stockMinimo || 2)) * 100));
                  return (
                    <div key={m.id} style={{ ...st.matCard, borderLeft: '4px solid #f97316' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.secondary, marginBottom: 6, lineHeight: 1.3 }}>{m.descripcion}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: C.textLight }}>{m.categoria || 'Sin categoría'}</div>
                          <div style={{ fontSize: 11, color: C.textLight }}>Mín: {m.stockMinimo || 2} ud.</div>
                        </div>
                        <div style={{ background: '#fff7ed', color: '#f97316', border: '1.5px solid #f97316', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 900 }}>{m.stock} ud.</div>
                      </div>
                      <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#f97316', borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sinStock.length === 0 && bajoStock.length === 0 && (
            <div style={st.empty}><div style={{ fontSize: 40 }}>✅</div><div>No hay materiales en estado crítico.</div></div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Proveedores
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'proveedores' && (
        <div style={st.content}>
          <div style={st.kpiRow}>
            {[
              { lbl: 'Proveedores',     val: proveedores.length,                                      color: '#6366f1' },
              { lbl: 'Total Órdenes',   val: compras.length,                                          color: C.primary },
              { lbl: 'Gasto Acumulado', val: fmt$(proveedores.reduce((s, p) => s + p.total, 0)),       color: C.success, small: true },
            ].map(k => (
              <div key={k.lbl} style={{ ...st.kpiCard, borderLeftColor: k.color }}>
                <div style={st.kpiLbl}>{k.lbl.toUpperCase()}</div>
                <div style={{ fontSize: k.small ? 16 : 28, fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.val}</div>
              </div>
            ))}
          </div>

          {proveedores.length === 0 ? (
            <div style={st.empty}><div style={{ fontSize: 40 }}>🏭</div><div>No hay datos de proveedores aún.</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {proveedores.map((prov, i) => {
                const pct   = Math.max(4, Math.round((prov.total / maxProvTotal) * 100));
                const barCo = i === 0 ? C.primary : '#6366f1';
                return (
                  <div key={prov.nombre} style={st.provCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: i === 0 ? C.primary : '#e2e8f0', color: i === 0 ? '#fff' : C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prov.nombre}</div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 11, color: C.textLight, flexWrap: 'wrap' }}>
                          <span>{prov.ordenes} orden{prov.ordenes !== 1 ? 'es' : ''}</span>
                          {prov.pendientes > 0 && <span style={{ color: '#f97316', fontWeight: 700 }}>{prov.pendientes} pendiente{prov.pendientes !== 1 ? 's' : ''}</span>}
                          {prov.ultima && <span>Última: {prov.ultima.toLocaleDateString('es-CL')}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 2, padding: '0 20px' }}>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barCo, borderRadius: 4, transition: 'width 0.6s' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.secondary }}>{fmt$(prov.total)}</div>
                      <div style={{ fontSize: 10, color: C.textLight }}>gasto acumulado</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Compras / SAP
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'compras' && (
        <div style={st.content}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['todas', 'Todas'], ['en espera', 'En Espera'], ['en proceso', 'En Proceso'], ['completado', 'Completadas'], ['urgencia', 'Urgentes']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFiltroCompra(val)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filtroCompra === val ? C.primary : C.border}`, background: filtroCompra === val ? C.primary : '#fff', color: filtroCompra === val ? '#fff' : C.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {lbl}
                  {val !== 'todas' && <span style={{ marginLeft: 6, background: filtroCompra === val ? 'rgba(255,255,255,0.3)' : '#f1f5f9', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>
                    {val === 'urgencia' ? compras.filter(c => c.urgencia === 'urgencia').length : compras.filter(c => c.estado === val).length}
                  </span>}
                </button>
              ))}
            </div>
            {/* Botón SAP */}
            <button onClick={() => setSapModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,112,243,0.3)' }}>
              <span>⚙️</span> Exportar Script SAP
            </button>
          </div>

          {comprasFiltradas.length === 0 ? (
            <div style={st.empty}><div style={{ fontSize: 40 }}>🛒</div><div>No hay compras en este filtro.</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {comprasFiltradas.map(c => {
                const eb    = ESTADO_BADGE[c.estado] || { bg: '#f8fafc', co: '#94a3b8', lbl: (c.estado || 'ESTADO').toUpperCase() };
                const fecha = c.creadoEn?.toDate ? c.creadoEn.toDate().toLocaleDateString('es-CL') : '—';
                const total = (c.cantidad || 0) * (c.costoEstimado || 0);
                return (
                  <div key={c.id} style={st.compraCard}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: C.secondary }}>{c.nombre || c.producto || 'Sin nombre'}</span>
                        {c.urgencia === 'urgencia' && <span style={{ background: '#fef2f2', color: '#ef4444', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 10 }}>🚨 URGENTE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: C.textLight, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>Cant: <strong>{c.cantidad}</strong> {c.unidad || 'UND'}</span>
                        {c.proveedor && <span>🏭 {c.proveedor}</span>}
                        {c.maquina && <span>🔧 {c.maquina}</span>}
                        <span>👤 {c.usuario || '—'}</span>
                        <span>📅 {fecha}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, marginLeft: 16 }}>
                      <div style={{ background: eb.bg, color: eb.co, borderRadius: 20, padding: '3px 12px', fontSize: 10, fontWeight: 800 }}>{eb.lbl}</div>
                      {total > 0 && <div style={{ fontSize: 15, fontWeight: 900, color: C.secondary }}>{fmt$(total)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Áreas & Solicitantes
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'areas' && (
        <div style={st.content}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>

            {/* Uso por Área */}
            <div>
              <div style={st.seccionTitle}><span style={{ fontSize: 18 }}>🏭</span> Uso por Área — {dias} días</div>
              {areasData.length === 0 ? (
                <div style={st.empty}><div style={{ fontSize: 32 }}>🏭</div><div>Sin datos de área en este período.</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {areasData.map((area, i) => {
                    const maxA  = areasData[0].value;
                    const pct   = Math.max(4, Math.round((area.value / maxA) * 100));
                    const COLS  = [C.primary, '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];
                    const co    = COLS[i % COLS.length];
                    return (
                      <div key={area.name} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: C.secondary }}>{area.name}</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: co }}>{area.value} u.</span>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: co, borderRadius: 4, transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Solicitantes */}
            <div>
              <div style={st.seccionTitle}><span style={{ fontSize: 18 }}>👥</span> Top Solicitantes — {dias} días</div>
              {solicitantesData.length === 0 ? (
                <div style={st.empty}><div style={{ fontSize: 32 }}>👥</div><div>Sin solicitantes en este período.</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {solicitantesData.map((sol, i) => {
                    const maxS  = solicitantesData[0].value;
                    const pct   = Math.max(4, Math.round((sol.value / maxS) * 100));
                    const barCo = i === 0 ? C.primary : i <= 2 ? '#6366f1' : '#94a3b8';
                    return (
                      <div key={sol.name} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: i < 3 ? barCo : '#e2e8f0', color: i < 3 ? '#fff' : C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>{i + 1}</div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: C.secondary }}>{sol.name}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 900, color: barCo }}>{sol.value} u.</span>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barCo, borderRadius: 4, transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Detalle Máquina
      ══════════════════════════════════════════════════════════════════════ */}
      {maquinaSel && (
        <div style={st.overlay} onClick={() => setMaquinaSel(null)}>
          <div style={st.modalBox} onClick={e => e.stopPropagation()}>
            <div style={st.modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.secondary }}>Detalle de Máquina</h2>
                <div style={{ color: C.primary, fontWeight: 800, marginTop: 4, fontSize: 16 }}>{maquinaSel.nombre}</div>
              </div>
              <button onClick={() => setMaquinaSel(null)} style={st.closeBtn}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px' }}>

              {/* Gráfico semanal */}
              <div style={{ marginBottom: 24 }}>
                <div style={st.subTitulo}>RETIROS POR SEMANA (ÚLTIMAS 8 SEMANAS)</div>
                {datosModal.semanas.every(sem => sem.total === 0) ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: C.textLight, fontSize: 13 }}>Sin retiros recientes para esta máquina</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '10px 0' }}>
                    {(() => {
                      const maxS = Math.max(...datosModal.semanas.map(sem => sem.total), 1);
                      return datosModal.semanas.map((sem, i) => {
                        const h = Math.max(4, Math.round((sem.total / maxS) * 100));
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: sem.total > 0 ? C.primary : C.textLight }}>{sem.total || ''}</div>
                            <div style={{ width: '100%', height: 90, display: 'flex', alignItems: 'flex-end' }}>
                              <div style={{ width: '100%', height: `${h}%`, background: sem.total > 0 ? C.primary : '#e2e8f0', borderRadius: '4px 4px 0 0', transition: 'height 0.5s' }} />
                            </div>
                            <div style={{ fontSize: 9, color: C.textLight, textAlign: 'center', lineHeight: 1.2 }}>{sem.lbl}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Top materiales */}
              {datosModal.materiales.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={st.subTitulo}>MATERIALES MÁS USADOS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {datosModal.materiales.map((mat, i) => {
                      const maxM = datosModal.materiales[0].cant;
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.secondary }}>{mat.nombre}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: C.primary }}>{mat.cant} u.</span>
                          </div>
                          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round((mat.cant / maxM) * 100)}%`, background: i === 0 ? C.primary : '#6366f1', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Historial */}
              <div style={st.subTitulo}>HISTORIAL DE MOVIMIENTOS</div>
              <input
                style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
                placeholder="Buscar material o usuario..."
                value={busqModal}
                onChange={e => setBusqModal(e.target.value)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {datosModal.movimientos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: C.textLight, fontSize: 13 }}>Sin movimientos registrados</div>
                ) : datosModal.movimientos.map(h => {
                  const esRetiro = h.tipo === 'retiro';
                  const fecha = h.fecha?.toDate ? h.fecha.toDate().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                  return (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.producto || 'Sin nombre'}</div>
                        <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{h.usuario || '—'} · {fecha}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: esRetiro ? C.error : C.success }}>{esRetiro ? '-' : '+'}{h.cantidad}</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: C.textLight }}>{(h.tipo || '').toUpperCase()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Script SAP
      ══════════════════════════════════════════════════════════════════════ */}
      {sapModal && (
        <div style={st.overlay} onClick={() => setSapModal(false)}>
          <div style={{ ...st.modalBox, maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div style={st.modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.secondary }}>Script de Compras — SAP</h2>
                <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
                  {compras.filter(c => c.estado === 'en espera').length} órdenes en espera · Formato ME21N/ME51N
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={copiarSAP} style={{ padding: '7px 16px', background: sapCopiado ? C.success : '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
                  {sapCopiado ? '✓ Copiado' : '📋 Copiar'}
                </button>
                <button onClick={descargarSAP} style={{ padding: '7px 16px', background: C.success, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  ⬇ Descargar CSV
                </button>
                <button onClick={() => setSapModal(false)} style={st.closeBtn}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px 24px' }}>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 11, lineHeight: 1.7, overflowX: 'auto', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre' }}>
                {sapScript || '-- Sin órdenes en espera --'}
              </pre>
              <div style={{ marginTop: 14, padding: '10px 16px', background: '#eff6ff', borderRadius: 10, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
                <strong>Campos exportados:</strong> CODIGO_MAT · DESCRIPCION · CANTIDAD · UNIDAD · PROVEEDOR · PRECIO_UNIT · MONEDA · MAQUINA · URGENTE<br/>
                <strong>Uso:</strong> Importar en SAP transacción ME21N (Crear Pedido) o ME51N (Crear Solicitud de Pedido) usando el archivo CSV descargado.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  header:  { padding: '36px 48px 24px', background: '#fff', borderBottom: `1px solid #e2e8f0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  titulo:  { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:     { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  perBtn:  { padding: '7px 16px', borderRadius: 20, border: `1px solid #e2e8f0`, background: '#fff', color: C.textSecondary, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  perBtnActive: { background: C.secondary, color: '#fff', border: `1px solid ${C.secondary}` },

  tabBar:     { display: 'flex', gap: 4, padding: '12px 48px 0', background: '#fff', borderBottom: `1px solid #e2e8f0`, overflowX: 'auto' },
  tabBtn:     { padding: '10px 18px', borderRadius: '10px 10px 0 0', border: 'none', background: 'transparent', color: C.textSecondary, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 },
  tabBtnActive: { background: C.primary, color: '#fff' },

  content: { padding: '24px 48px 40px' },
  empty:   { textAlign: 'center', padding: 60, color: C.textSecondary, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },

  kpiRow:  { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  kpiCard: { flex: 1, minWidth: 160, background: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid' },
  kpiLbl:  { fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5, marginBottom: 6 },

  seccion:      { marginBottom: 28 },
  seccionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: C.secondary, marginBottom: 14 },
  subTitulo:    { fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5, marginBottom: 14 },

  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 },
  matCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },

  maqCard:  { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' },
  provCard: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  compraCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalBox:   { background: '#fff', borderRadius: 24, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 16px', borderBottom: `1px solid #e2e8f0`, flexWrap: 'wrap', gap: 10 },
  closeBtn:   { background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: 18, cursor: 'pointer', fontSize: 16, fontWeight: 800, color: '#64748b', flexShrink: 0 },
};
