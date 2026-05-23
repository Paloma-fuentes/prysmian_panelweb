import { useEffect, useMemo, useState } from 'react';
import { C } from '../theme';
import { getMateriales } from '../services/inventarioService';
import { getHistorial } from '../services/historialService';

const PERNERIA = ['perno', 'tornillo', 'tuerca', 'arandela', 'chaveta', 'pasador', 'birlo', 'clavo', 'grapa', 'remache'];
function normStr(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function esPerneria(n) { const v = normStr(n); return PERNERIA.some(k => v.includes(k)); }

const VISTAS = ['Diagnóstico de Fallas', 'Consumo de Paños', 'Proyección de Stock'];

export default function AnalisisConsumo() {
  const [loading,       setLoading]       = useState(true);
  const [historial,     setHistorial]     = useState([]);
  const [materiales,    setMateriales]    = useState([]);
  const [analisis,      setAnalisis]      = useState([]);
  const [vista,         setVista]         = useState(0);
  const [periodoDias,   setPeriodoDias]   = useState(30);
  const [busqueda,      setBusqueda]      = useState('');
  const [maqSelec,      setMaqSelec]      = useState(null);
  const [periodoConsumo,setPeriodoConsumo]= useState(1);

  useEffect(() => { cargar(); }, []);
  useEffect(() => { if (materiales.length && historial.length) calcularAnalisis(); }, [materiales, historial, periodoDias]);

  async function cargar() {
    setLoading(true);
    try {
      const [mats, hist] = await Promise.all([getMateriales({}), getHistorial(2000)]);
      setMateriales(mats || []);
      setHistorial(hist || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function calcularAnalisis() {
    const ahora = Date.now();
    const limite = ahora - periodoDias * 86_400_000;
    const retirosPeriodo = historial.filter(h => {
      if (h.tipo !== 'retiro') return false;
      const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
      return f >= limite;
    });

    const dataMap = {};
    materiales.forEach(m => {
      if (m?.id) dataMap[m.id] = { id: m.id, nombre: m.descripcion || 'Sin nombre', sap: m.codigoSAP || '', stockActual: Number(m.stock || 0), consumoTotal: 0, ubicacion: m.ubicacion || '' };
    });
    retirosPeriodo.forEach(r => {
      if (dataMap[r.materialId]) dataMap[r.materialId].consumoTotal += Number(r.cantidad || 0);
    });

    const lista = Object.values(dataMap).map(item => {
      const consumoDiario = item.consumoTotal / periodoDias;
      const diasRestantes = consumoDiario > 0 ? Math.floor(item.stockActual / consumoDiario) : 999;
      return { ...item, consumoDiario, consumoMensual: +(consumoDiario * 30).toFixed(1), diasRestantes,
        criticidad: diasRestantes < 7 ? 'ALTA' : diasRestantes < 15 ? 'MEDIA' : 'BAJA' };
    }).sort((a, b) => a.diasRestantes - b.diasRestantes);

    setAnalisis(lista);
  }

  // Diagnóstico de fallas recurrentes
  const frecuenciaData = useMemo(() => {
    const grupos = {};
    historial.filter(h => h.tipo === 'retiro' && h.maquina && h.maquina !== 'N/A' && !esPerneria(h.producto)).forEach(h => {
      const maq = h.maquina.trim();
      const prod = (h.producto || '').trim();
      const f = h.fecha?.toDate ? h.fecha.toDate() : null;
      if (!prod || !f) return;
      if (!grupos[maq]) grupos[maq] = {};
      if (!grupos[maq][prod]) grupos[maq][prod] = [];
      grupos[maq][prod].push({ fecha: f, cantidad: h.cantidad || 1 });
    });

    const porMaquina = {};
    Object.entries(grupos).forEach(([maq, mats]) => {
      const items = [];
      Object.entries(mats).forEach(([prod, regs]) => {
        if (regs.length < 2) return;
        const sorted = [...regs].sort((a, b) => a.fecha - b.fecha);
        let maxSemana = 0, mejorIdx = 0;
        for (let i = 0; i < sorted.length; i++) {
          let count = 1;
          for (let j = i + 1; j < sorted.length; j++) {
            if ((sorted[j].fecha - sorted[i].fecha) / 86_400_000 <= 7) count++; else break;
          }
          if (count > maxSemana) { maxSemana = count; mejorIdx = i; }
        }
        if (maxSemana < 2) return;
        const fechaStr = sorted[mejorIdx].fecha.toLocaleDateString('es-CL');
        const nivel = maxSemana >= 3 ? 'CRÍTICO' : 'ATENCIÓN';
        const msg   = maxSemana >= 3
          ? `Reemplazado ${maxSemana}× en ≤7 días (semana del ${fechaStr}). Posible falla no detectada.`
          : `${maxSemana} cambios en ≤7 días (semana del ${fechaStr}). Revisar desgaste acelerado.`;
        items.push({ producto: prod, totalCambios: regs.length, maxSemana, nivel, msg });
      });
      if (items.length) porMaquina[maq] = items.sort((a, b) => b.maxSemana - a.maxSemana).slice(0, 5);
    });
    return { maquinas: Object.keys(porMaquina).sort(), porMaquina };
  }, [historial]);

  // Consumo de paños por usuario
  const consumoPanos = useMemo(() => {
    const corte = periodoConsumo ? new Date(Date.now() - periodoConsumo * 30 * 86_400_000) : null;
    const porUsuario = {};
    historial.forEach(h => {
      if (h.tipo !== 'retiro') return;
      if (!normStr(h.producto || '').includes('pano') && !normStr(h.producto || '').includes('paño')) return;
      const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha || 0);
      if (corte && f < corte) return;
      const nombre = h.usuario || 'Sin nombre';
      if (!porUsuario[nombre]) porUsuario[nombre] = { nombre, total: 0 };
      porUsuario[nombre].total += (h.cantidad || 1);
    });
    return Object.values(porUsuario).sort((a, b) => b.total - a.total);
  }, [historial, periodoConsumo]);

  const maxConsumo = consumoPanos[0]?.total || 1;

  const analisisFiltrado = analisis.filter(a =>
    !busqueda || normStr(a.nombre).includes(normStr(busqueda)) || normStr(a.sap).includes(normStr(busqueda))
  );

  const CRIT_COLOR = { ALTA: C.error, MEDIA: C.warning, BAJA: C.success };
  const CRIT_BG    = { ALTA: '#fef2f2', MEDIA: '#fffbeb', BAJA: '#f0fdf4' };

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando análisis de consumo...</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.background, paddingBottom: 60 }}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Análisis de Consumo</h1>
          <p style={s.sub}>Diagnóstico de fallas, paños y proyección de stock</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[30, 60, 90].map(d => (
            <button key={d} style={{ ...s.periodBtn, ...(periodoDias === d ? s.periodBtnActive : {}) }} onClick={() => setPeriodoDias(d)}>{d}d</button>
          ))}
        </div>
      </header>

      {/* Tabs */}
      <div style={s.tabBar}>
        {VISTAS.map((v, i) => (
          <button key={i} style={{ ...s.tab, ...(vista === i ? s.tabActive : {}) }} onClick={() => setVista(i)}>{v}</button>
        ))}
      </div>

      <div style={s.content}>

        {/* ── Vista 0: Diagnóstico de Fallas ── */}
        {vista === 0 && (
          <div>
            <div style={s.infoBox}>
              <span>ℹ️</span>
              <span>Recambios repetidos ≥2× en 7 días en la misma máquina indican posible falla subyacente. Pernería excluida del análisis.</span>
            </div>
            {frecuenciaData.maquinas.length === 0 ? (
              <div style={s.empty}><div style={{ fontSize: 36 }}>✅</div><div>Sin patrones sospechosos detectados en el historial.</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Selector de máquinas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {frecuenciaData.maquinas.map(maq => {
                    const tieneCrit = frecuenciaData.porMaquina[maq]?.some(i => i.nivel === 'CRÍTICO');
                    const activa = maqSelec === maq;
                    return (
                      <button key={maq} onClick={() => setMaqSelec(m => m === maq ? null : maq)}
                        style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${tieneCrit ? C.error : C.border}`, background: activa ? C.secondary : tieneCrit ? '#fff1f2' : '#fff', color: activa ? '#fff' : tieneCrit ? C.error : C.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {tieneCrit ? '⚠️' : '🔧'} {maq}
                      </button>
                    );
                  })}
                </div>

                {/* Resultados de máquina seleccionada */}
                {maqSelec && frecuenciaData.porMaquina[maqSelec]?.map((item, i) => {
                  const color = item.nivel === 'CRÍTICO' ? C.error : C.warning;
                  const bg    = item.nivel === 'CRÍTICO' ? '#fef2f2' : '#fffbeb';
                  return (
                    <div key={i} style={{ background: bg, borderLeft: `4px solid ${color}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: C.secondary }}>{item.producto}</div>
                        <span style={{ background: color, color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>{item.nivel} · {item.maxSemana}×/sem</span>
                      </div>
                      <div style={{ fontSize: 12, color, fontWeight: 600 }}>{item.msg}</div>
                      <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>Total registros: {item.totalCambios} cambios</div>
                    </div>
                  );
                })}

                {/* Tabla resumen */}
                {!maqSelec && (
                  <div style={s.card}>
                    <h3 style={s.cardTitulo}>Resumen por máquina</h3>
                    <table style={s.table}>
                      <thead>
                        <tr>{['Máquina', 'Items sospechosos', 'Máx. recambios/sem', 'Nivel máximo'].map(th => (
                          <th key={th} style={s.th}>{th}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {frecuenciaData.maquinas.map(maq => {
                          const items = frecuenciaData.porMaquina[maq];
                          const nivel = items.some(i => i.nivel === 'CRÍTICO') ? 'CRÍTICO' : 'ATENCIÓN';
                          const color = nivel === 'CRÍTICO' ? C.error : C.warning;
                          return (
                            <tr key={maq} onClick={() => setMaqSelec(maq)} style={{ cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={s.td}><b>{maq}</b></td>
                              <td style={s.td}>{items.length}</td>
                              <td style={s.td}>{Math.max(...items.map(i => i.maxSemana))}×</td>
                              <td style={s.td}><span style={{ background: `${color}20`, color, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 800 }}>{nivel}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Vista 1: Consumo de Paños ── */}
        {vista === 1 && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: '32px' }}>Período:</span>
              {[[0, 'Todo'], [1, '1 mes'], [3, '3 meses'], [6, '6 meses']].map(([val, lbl]) => (
                <button key={val} onClick={() => setPeriodoConsumo(val)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${C.border}`, background: periodoConsumo === val ? C.secondary : '#fff', color: periodoConsumo === val ? '#fff' : C.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {lbl}
                </button>
              ))}
            </div>
            {consumoPanos.length === 0 ? (
              <div style={s.empty}><div style={{ fontSize: 36 }}>🧹</div><div>Sin registros de consumo de paños.</div></div>
            ) : (
              <div style={s.card}>
                <h3 style={s.cardTitulo}>Ranking de consumo de paños por operario</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {consumoPanos.map((u, i) => {
                    const pct = (u.total / maxConsumo) * 100;
                    return (
                      <div key={u.nombre}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.secondary }}>
                            <span style={{ color: C.textLight, marginRight: 8 }}>#{i + 1}</span>{u.nombre}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: C.secondary }}>{u.total} und.</span>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? C.primary : '#6366f1', borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Vista 2: Proyección de Stock ── */}
        {vista === 2 && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input style={s.searchInput} placeholder="Buscar material..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ k: 'ALTA', lbl: '🔴 Alta' }, { k: 'MEDIA', lbl: '🟡 Media' }, { k: 'BAJA', lbl: '🟢 Baja' }].map(({ k, lbl }) => (
                  <span key={k} style={{ background: CRIT_BG[k], color: CRIT_COLOR[k], borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                    {lbl}: {analisisFiltrado.filter(a => a.criticidad === k && a.consumoTotal > 0).length}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Material', 'SAP', 'Stock actual', `Consumo/${periodoDias}d`, 'C/mes estimado', 'Días restantes', 'Criticidad'].map(th => (
                      <th key={th} style={s.th}>{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analisisFiltrado.filter(a => a.consumoTotal > 0).map(item => (
                    <tr key={item.id}>
                      <td style={s.td}><b>{item.nombre}</b>{item.ubicacion && <div style={{ fontSize: 10, color: C.textLight }}>📍 {item.ubicacion}</div>}</td>
                      <td style={s.td}>{item.sap || '—'}</td>
                      <td style={s.td}>{item.stockActual}</td>
                      <td style={s.td}>{item.consumoTotal}</td>
                      <td style={s.td}>{item.consumoMensual}</td>
                      <td style={s.td}>
                        <span style={{ fontWeight: 800, color: item.diasRestantes < 7 ? C.error : item.diasRestantes < 15 ? C.warning : C.success }}>
                          {item.diasRestantes === 999 ? '∞' : `${item.diasRestantes}d`}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ background: CRIT_BG[item.criticidad], color: CRIT_COLOR[item.criticidad], borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 800 }}>
                          {item.criticidad}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  header:     { padding: '36px 48px 24px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  titulo:     { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:        { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  periodBtn:  { padding: '6px 16px', borderRadius: 20, border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  periodBtnActive: { background: C.secondary, color: '#fff', border: `1px solid ${C.secondary}` },
  tabBar:     { display: 'flex', gap: 0, background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '0 48px' },
  tab:        { padding: '14px 20px', background: 'none', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.textSecondary, whiteSpace: 'nowrap' },
  tabActive:  { borderBottomColor: C.primary, color: C.secondary },
  content:    { padding: '28px 48px', maxWidth: 1200, margin: '0 auto' },
  infoBox:    { display: 'flex', gap: 8, alignItems: 'flex-start', background: '#eef2ff', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#3730a3', lineHeight: 1.5 },
  card:       { background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' },
  cardTitulo: { fontSize: 18, fontWeight: 800, color: C.secondary, margin: '0 0 20px' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 800, color: C.textLight, borderBottom: `1px solid ${C.border}`, background: '#f8fafc', letterSpacing: 0.5 },
  td:         { padding: '12px 14px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` },
  empty:      { textAlign: 'center', padding: 80, color: C.textSecondary, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  searchInput:{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px', fontSize: 13, outline: 'none', background: C.background, minWidth: 240 },
};
