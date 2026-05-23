import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';

const PERIODOS = [
  { d: 7,  label: '7 días' },
  { d: 30, label: '30 días' },
  { d: 90, label: '90 días' },
];

function normStr(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

export default function Analisis({ perfil }) {
  const [historial,    setHistorial]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dias,         setDias]         = useState(30);
  const [maquinaSel,   setMaquinaSel]   = useState(null);
  const [busqModal,    setBusqModal]    = useState('');

  const esAdmin = ['admin', 'administrador', 'panol'].includes((perfil?.rol || '').toLowerCase());

  // ── Historial en tiempo real ────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(3000));
    const unsub = onSnapshot(q, snap => {
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Calcular ranking de máquinas para el período seleccionado ──────────────
  const { maquinas, kpis } = useMemo(() => {
    const ahora     = Date.now();
    const inicioPer = ahora - dias * 86_400_000;
    const inicioPrev= inicioPer - dias * 86_400_000;

    const retiros = historial.filter(h => {
      if (h.tipo !== 'retiro') return false;
      if (!h.maquina || h.maquina === 'N/A') return false;
      return true;
    });

    const totalPer  = {};
    const totalPrev = {};
    const ultimaFecha = {};

    retiros.forEach(h => {
      const maq = h.maquina.trim();
      const f   = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
      const cant = Number(h.cantidad) || 1;

      if (f >= inicioPer) {
        totalPer[maq] = (totalPer[maq] || 0) + cant;
        if (!ultimaFecha[maq] || f > ultimaFecha[maq]) ultimaFecha[maq] = f;
      } else if (f >= inicioPrev) {
        totalPrev[maq] = (totalPrev[maq] || 0) + cant;
      }
    });

    const lista = Object.entries(totalPer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([nombre, total]) => {
        const prev = totalPrev[nombre] || 0;
        const tendencia = total > prev * 1.1 ? 'sube' : total < prev * 0.9 ? 'baja' : 'estable';
        const ult = ultimaFecha[nombre];
        return {
          nombre,
          total,
          prev,
          tendencia,
          ultimaFecha: ult ? new Date(ult) : null,
        };
      });

    const totalRetiros  = lista.reduce((s, m) => s + m.total, 0);
    const maqActivas    = lista.length;
    const topMaterialMap = {};
    retiros.filter(h => {
      const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
      return f >= inicioPer;
    }).forEach(h => {
      const p = h.producto || 'Sin nombre';
      topMaterialMap[p] = (topMaterialMap[p] || 0) + (Number(h.cantidad) || 1);
    });
    const topMaterial = Object.entries(topMaterialMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return { maquinas: lista, kpis: { totalRetiros, maqActivas, topMaterial } };
  }, [historial, dias]);

  const maxVal = maquinas[0]?.total || 1;

  // ── Datos para el modal de la máquina seleccionada ─────────────────────────
  const datosModal = useMemo(() => {
    if (!maquinaSel) return { semanas: [], materiales: [], movimientos: [] };

    const movimientos = historial.filter(h =>
      h.maquina?.trim() === maquinaSel.nombre &&
      (esAdmin || h.solicitanteUid === perfil?.uid || h.usuario === perfil?.nombre)
    );

    // Gráfico: agrupar por semana (últimas 8 semanas)
    const ahora = Date.now();
    const semanas = [];
    for (let i = 7; i >= 0; i--) {
      const ini = ahora - (i + 1) * 7 * 86_400_000;
      const fin = ahora - i * 7 * 86_400_000;
      const lbl = new Date(ini).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
      const total = movimientos
        .filter(h => h.tipo === 'retiro')
        .filter(h => {
          const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
          return f >= ini && f < fin;
        })
        .reduce((s, h) => s + (Number(h.cantidad) || 1), 0);
      semanas.push({ lbl, total });
    }

    // Top materiales
    const matMap = {};
    movimientos.filter(h => h.tipo === 'retiro').forEach(h => {
      const p = h.producto || 'Sin nombre';
      matMap[p] = (matMap[p] || 0) + (Number(h.cantidad) || 1);
    });
    const materiales = Object.entries(matMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nombre, cant]) => ({ nombre, cant }));

    // Movimientos filtrados por búsqueda
    const q = normStr(busqModal);
    const filtrados = movimientos.filter(h =>
      !q || normStr(h.producto || '').includes(q) || normStr(h.usuario || '').includes(q)
    ).slice(0, 80);

    return { semanas, materiales, movimientos: filtrados };
  }, [maquinaSel, historial, busqModal, esAdmin, perfil]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando historial de movimientos...</div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.background, paddingBottom: 60 }}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Dashboard de Máquinas</h1>
          <p style={s.sub}>Actividad basada en historial de movimientos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODOS.map(p => (
            <button key={p.d} style={{ ...s.perBtn, ...(dias === p.d ? s.perBtnActive : {}) }} onClick={() => setDias(p.d)}>{p.label}</button>
          ))}
        </div>
      </header>

      {/* KPIs */}
      <div style={s.kpiRow}>
        {[
          { lbl: 'Retiros en período', val: kpis.totalRetiros, color: C.primary },
          { lbl: 'Máquinas activas',   val: kpis.maqActivas,   color: '#6366f1' },
          { lbl: 'Material top',       val: kpis.topMaterial,  color: C.secondary, small: true },
        ].map(k => (
          <div key={k.lbl} style={{ ...s.kpiCard, borderLeftColor: k.color }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 0.5, marginBottom: 6 }}>{k.lbl.toUpperCase()}</div>
            <div style={{ fontSize: k.small ? 15 : 28, fontWeight: 900, color: k.color, lineHeight: 1.1 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Ranking de máquinas */}
      <div style={s.content}>
        {maquinas.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40 }}>🔧</div>
            <div>Sin retiros con máquina asignada en los últimos {dias} días.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {maquinas.map((maq, i) => {
              const pct = Math.max(4, Math.round((maq.total / maxVal) * 100));
              const barColor = i === 0 ? '#ef4444' : i <= 2 ? '#f97316' : i <= 4 ? '#eab308' : C.primary;
              const tend = maq.tendencia === 'sube'
                ? { ic: '↑', co: '#ef4444', lbl: 'Sube' }
                : maq.tendencia === 'baja'
                ? { ic: '↓', co: '#10b981', lbl: 'Baja' }
                : { ic: '→', co: '#94a3b8', lbl: 'Estable' };

              return (
                <div
                  key={maq.nombre}
                  onClick={() => { setMaquinaSel(maq); setBusqModal(''); }}
                  style={s.maqCard}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  {/* Rank + nombre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? barColor : '#e2e8f0', color: i < 3 ? '#fff' : C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{maq.nombre}</div>
                      <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                        Último: {maq.ultimaFecha?.toLocaleDateString('es-CL') || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Barra de actividad */}
                  <div style={{ flex: 2, padding: '0 16px' }}>
                    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 5, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>

                  {/* Stats */}
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

      {/* ── Modal detalle máquina ──────────────────────────────────────────── */}
      {maquinaSel && (
        <div style={s.overlay} onClick={() => setMaquinaSel(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div style={s.modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.secondary }}>Detalle de Máquina</h2>
                <div style={{ color: C.primary, fontWeight: 800, marginTop: 4, fontSize: 16 }}>{maquinaSel.nombre}</div>
              </div>
              <button onClick={() => setMaquinaSel(null)} style={s.closeBtn}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px' }}>

              {/* Gráfico semanal */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 0.5, marginBottom: 14 }}>RETIROS POR SEMANA (ÚLTIMAS 8 SEMANAS)</div>
                {datosModal.semanas.every(s => s.total === 0) ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: C.textLight, fontSize: 13 }}>Sin retiros recientes para esta máquina</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '10px 0' }}>
                    {(() => {
                      const maxS = Math.max(...datosModal.semanas.map(s => s.total), 1);
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
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 0.5, marginBottom: 14 }}>MATERIALES MÁS USADOS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {datosModal.materiales.map((mat, i) => {
                      const maxM = datosModal.materiales[0].cant;
                      const pct = Math.round((mat.cant / maxM) * 100);
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.secondary }}>{mat.nombre}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: C.primary }}>{mat.cant} u.</span>
                          </div>
                          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? C.primary : '#6366f1', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Historial de movimientos */}
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 0.5, marginBottom: 10 }}>HISTORIAL DE MOVIMIENTOS</div>
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
                        <div style={{ fontSize: 16, fontWeight: 900, color: esRetiro ? C.error : C.success }}>
                          {esRetiro ? '-' : '+'}{h.cantidad}
                        </div>
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
    </div>
  );
}

const s = {
  header:  { padding: '36px 48px 24px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titulo:  { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:     { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  perBtn:  { padding: '7px 16px', borderRadius: 20, border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  perBtnActive: { background: C.secondary, color: '#fff', border: `1px solid ${C.secondary}` },

  kpiRow:  { display: 'flex', gap: 16, padding: '20px 48px 0' },
  kpiCard: { flex: 1, background: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid' },

  content: { padding: '20px 48px 40px' },
  empty:   { textAlign: 'center', padding: 80, color: C.textSecondary, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },

  maqCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#fff', borderRadius: 14, padding: '14px 18px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer',
    border: '1px solid transparent', transition: 'border-color 0.15s',
  },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalBox:   { background: '#fff', borderRadius: 24, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}` },
  closeBtn:   { background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: 18, cursor: 'pointer', fontSize: 16, fontWeight: 800, color: C.textSecondary },
};
