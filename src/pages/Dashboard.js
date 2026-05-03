import { useEffect, useState } from 'react';
import { getKPIs } from '../services/dashboardService';
import { C, card } from '../theme';

function KpiCard({ titulo, valor, icono, color, sub, alerta, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...card,
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: alerta ? `4px solid ${color}` : `4px solid transparent`,
        display: 'flex', flexDirection: 'column', gap: 6,
        minWidth: 0, flex: 1,
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 22 }}>{icono}</span>
        {alerta && <span style={{ fontSize: 10, background: color, color: '#fff', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>ALERTA</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{valor ?? '—'}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{titulo}</div>
      {sub && <div style={{ fontSize: 11, color: C.textLight }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ navegar }) {
  const [kpis, setKpis]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKPIs().then(d => { setKpis(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center', color: C.textLight }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 15 }}>Cargando dashboard...</div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.topBar}>
        <div>
          <div style={s.titulo}>Panel de Control</div>
          <div style={s.subtitulo}>Encargada de Pañol — Resumen del sistema</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={s.liveDot} />
          <span style={{ fontSize: 12, color: C.textSecondary }}>En vivo</span>
        </div>
      </div>

      {/* KPIs — fila 1: inventario */}
      <div style={s.secTitulo}>📦 Inventario</div>
      <div style={s.kpiRow}>
        <KpiCard titulo="Total Productos"  valor={kpis.totalProductos} icono="📦" color={C.primary}   onClick={() => navegar('inventario', 'todos')} />
        <KpiCard titulo="Con Stock"        valor={kpis.conStock}        icono="✅" color={C.success}   onClick={() => navegar('inventario', 'conStock')} />
        <KpiCard titulo="Sin Stock"        valor={kpis.sinStock}        icono="❌" color={C.error}     alerta={kpis.sinStock > 0}  onClick={() => navegar('inventario', 'sinStock')} />
        <KpiCard titulo="Bajo Stock"       valor={kpis.bajoStock}       icono="⚠️" color={C.warning}  alerta={kpis.bajoStock > 0} onClick={() => navegar('inventario', 'bajoStock')} />
        <KpiCard titulo="Críticos"         valor={kpis.criticos}        icono="🚨" color={C.urgent}   alerta={kpis.criticos > 0}  onClick={() => navegar('inventario', 'criticos')} />
        <KpiCard titulo="Sin Rotación"     valor={kpis.sinRotacion}     icono="🔒" color="#8b5cf6"     sub="+90 días sin movimiento" onClick={() => navegar('inventario', 'sinRotacion')} />
      </div>

      {/* KPIs — fila 2: operaciones */}
      <div style={s.secTitulo}>🔔 Operaciones</div>
      <div style={s.kpiRow}>
        <KpiCard titulo="Retiros Pendientes"  valor={kpis.solicitudesPendientes} icono="📤" color={C.primary}  alerta={kpis.solicitudesPendientes > 0} sub="Por entregar" onClick={() => navegar('solicitudes')} />
        <KpiCard titulo="Compras en Espera"   valor={kpis.comprasEnEspera}       icono="🛒" color="#8b5cf6"    alerta={kpis.comprasEnEspera > 0} sub={kpis.comprasUrgentes > 0 ? `${kpis.comprasUrgentes} urgentes` : 'Sin urgentes'} onClick={() => navegar('solicitudesCompra')} />
      </div>

      {/* Fila inferior: top solicitados + máquinas */}
      <div style={s.row2}>
        <div style={{ ...card, flex: 1 }}>
          <div style={s.cardTitulo}>🏆 Más solicitados del mes (Top 4)</div>
          {kpis.topMaquinas.length > 0 ? (
            kpis.topMaquinas.slice(0, 4).map(([prod, cnt], i) => (
              <div key={i} style={s.rankRow}>
                <div style={{ ...s.rankBadge, background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : C.border }}>
                  <span style={s.rankNum}>{i + 1}</span>
                </div>
                <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{prod}</span>
                <span style={s.rankCnt}>{cnt}</span>
              </div>
            ))
          ) : <div style={s.empty}>Sin datos este mes</div>}
        </div>

        <div style={{ ...card, flex: 1 }}>
          <div style={s.cardTitulo}>⚙️ Máquinas con mayor consumo</div>
          {kpis.topMaquinas.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {kpis.topMaquinas.map(([maq, cnt], i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 4px', color: C.textSecondary, fontSize: 12, width: 28 }}>#{i + 1}</td>
                    <td style={{ padding: '8px 4px', fontSize: 13, color: C.text }}>{maq}</td>
                    <td style={{ padding: '8px 4px', fontSize: 13, fontWeight: 700, color: C.primary, textAlign: 'right' }}>{cnt} uds</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={s.empty}>Sin movimientos</div>}
        </div>
      </div>

      {/* Últimos movimientos */}
      <div style={card}>
        <div style={s.cardTitulo}>🕐 Últimos movimientos</div>
        {kpis.ultimosMovimientos.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.background }}>
                {['Tipo', 'Producto', 'Cantidad', 'Máquina', 'Usuario', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.textSecondary, fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpis.ultimosMovimientos.map((m, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.background }}>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: m.tipo === 'retiro' ? C.errorLight : C.successLight, color: m.tipo === 'retiro' ? C.error : C.success }}>
                      {m.tipo?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '9px 10px', fontWeight: 500 }}>{m.producto}</td>
                  <td style={{ padding: '9px 10px', color: C.textSecondary }}>{m.cantidad}</td>
                  <td style={{ padding: '9px 10px', color: C.textSecondary }}>{m.maquina || '—'}</td>
                  <td style={{ padding: '9px 10px', color: C.textSecondary }}>{m.usuario || '—'}</td>
                  <td style={{ padding: '9px 10px', color: C.textLight, fontSize: 11 }}>
                    {m.fecha?.toDate ? m.fecha.toDate().toLocaleDateString('es-CL') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={s.empty}>Sin movimientos recientes</div>}
      </div>
    </div>
  );
}

const s = {
  page:     { padding: '0', color: C.text },
  topBar:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px 16px', background: C.secondary, color: '#fff' },
  titulo:   { fontSize: 22, fontWeight: 800, color: '#fff' },
  subtitulo:{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  liveDot:  { width: 8, height: 8, borderRadius: 4, background: '#4ade80' },
  secTitulo:{ fontSize: 12, fontWeight: 700, color: C.textSecondary, letterSpacing: 1, padding: '16px 28px 8px', textTransform: 'uppercase' },
  kpiRow:   { display: 'flex', gap: 12, padding: '0 28px', flexWrap: 'wrap' },
  row2:     { display: 'flex', gap: 16, padding: '0 28px', marginTop: 4, flexWrap: 'wrap' },
  cardTitulo:{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 },
  rankRow:  { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` },
  rankBadge:{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankNum:  { fontSize: 11, fontWeight: 700, color: '#fff' },
  rankCnt:  { fontSize: 12, fontWeight: 700, color: C.primary, background: `${C.primary}20`, padding: '2px 8px', borderRadius: 10 },
  empty:    { color: C.textLight, fontSize: 13, padding: '20px 0', textAlign: 'center' },
};
