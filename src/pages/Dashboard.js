import { useEffect, useState } from 'react';
import { getKPIs } from '../services/dashboardService';
import { C } from '../theme';

function KpiCard({ titulo, valor, icono, color, sub, alerta, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 10,
        padding: '16px',
        borderLeft: `4px solid ${alerta ? color : '#e0e0e0'}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 24 }}>{icono}</span>
        {alerta && <span style={{ fontSize: 9, background: color, color: '#fff', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>ALERTA</span>}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{valor ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{titulo}</div>
      {sub && <div style={{ fontSize: 11, color: C.textLight }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ navegar }) {
  const [kpis, setKpis]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getKPIs()
      .then(d => { setKpis(d); setLoading(false); })
      .catch(e => { setError('Error cargando datos: ' + e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 14, color: C.textLight }}>
      <div style={{ fontSize: 48 }}>📊</div>
      <div style={{ fontSize: 15 }}>Cargando dashboard...</div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: C.error, fontSize: 14 }}>{error}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

      {/* ── Header ── */}
      <div style={{ background: C.secondary, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Panel de Control</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>Encargada de Pañol — Vista general del sistema</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#4ade80' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>En vivo</span>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPIs inventario */}
        <Section titulo="📦 Inventario">
          <div style={grid}>
            <KpiCard titulo="Total Productos"  valor={kpis.totalProductos} icono="📦" color={C.primary}  onClick={() => navegar('inventario', 'todos')} />
            <KpiCard titulo="Con Stock"        valor={kpis.conStock}       icono="✅" color={C.success}  onClick={() => navegar('inventario', 'conStock')} />
            <KpiCard titulo="Sin Stock"        valor={kpis.sinStock}       icono="❌" color={C.error}    alerta={kpis.sinStock > 0}  onClick={() => navegar('inventario', 'sinStock')} />
            <KpiCard titulo="Bajo Stock"       valor={kpis.bajoStock}      icono="⚠️" color={C.warning} alerta={kpis.bajoStock > 0} onClick={() => navegar('inventario', 'bajoStock')} />
            <KpiCard titulo="Críticos"         valor={kpis.criticos}       icono="🚨" color={C.urgent}  alerta={kpis.criticos > 0}  onClick={() => navegar('inventario', 'criticos')} />
            <KpiCard titulo="Sin Rotación"     valor={kpis.sinRotacion}    icono="🔒" color="#8b5cf6"    sub="+90 días sin movimiento" onClick={() => navegar('inventario', 'sinRotacion')} />
          </div>
        </Section>

        {/* KPIs operaciones */}
        <Section titulo="🔔 Operaciones">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <KpiCard titulo="Retiros Pendientes" valor={kpis.solicitudesPendientes} icono="📤" color={C.primary}  alerta={kpis.solicitudesPendientes > 0} sub="Por entregar" onClick={() => navegar('solicitudes')} />
            <KpiCard titulo="Compras en Espera"  valor={kpis.comprasEnEspera}       icono="🛒" color="#8b5cf6"   alerta={kpis.comprasEnEspera > 0} sub={kpis.comprasUrgentes > 0 ? `${kpis.comprasUrgentes} urgentes` : 'Sin urgentes'} onClick={() => navegar('solicitudesCompra')} />
          </div>
        </Section>

        {/* Fila: Top solicitados + Máquinas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card titulo="🏆 Más solicitados del mes">
            {kpis.topMaquinas.length > 0 ? kpis.topMaquinas.slice(0, 5).map(([prod, cnt], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, background: `${C.primary}15`, padding: '2px 8px', borderRadius: 10 }}>{cnt}</span>
              </div>
            )) : <Empty />}
          </Card>

          <Card titulo="⚙️ Máquinas con mayor consumo">
            {kpis.topMaquinas.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {kpis.topMaquinas.map(([maq, cnt], i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px 4px', color: C.textSecondary, width: 28, fontSize: 12 }}>#{i + 1}</td>
                      <td style={{ padding: '8px 4px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>{maq}</td>
                      <td style={{ padding: '8px 4px', fontWeight: 700, color: C.primary, textAlign: 'right', whiteSpace: 'nowrap' }}>{cnt} uds</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty />}
          </Card>
        </div>

        {/* Últimos movimientos */}
        <Card titulo="🕐 Últimos movimientos">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.background }}>
                  {['Tipo', 'Producto', 'Cant.', 'Máquina', 'Usuario', 'Fecha'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.textSecondary, fontWeight: 700, fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.ultimosMovimientos.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: C.textLight }}>Sin movimientos</td></tr>
                ) : kpis.ultimosMovimientos.map((m, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.background }}>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: m.tipo === 'retiro' ? '#fee2e2' : '#d1fae5', color: m.tipo === 'retiro' ? C.error : C.success }}>{(m.tipo || '').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.producto}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: C.primary }}>{m.cantidad}</td>
                    <td style={{ padding: '9px 12px', color: C.textSecondary, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.maquina || '—'}</td>
                    <td style={{ padding: '9px 12px', color: C.textSecondary }}>{m.usuario || '—'}</td>
                    <td style={{ padding: '9px 12px', color: C.textLight, fontSize: 11, whiteSpace: 'nowrap' }}>{m.fecha?.toDate ? m.fecha.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function Section({ titulo, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{titulo}</div>
      {children}
    </div>
  );
}

function Card({ titulo, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>{titulo}</div>
      {children}
    </div>
  );
}

function Empty() {
  return <div style={{ textAlign: 'center', padding: '20px 0', color: C.textLight, fontSize: 13 }}>Sin datos</div>;
}

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 };
