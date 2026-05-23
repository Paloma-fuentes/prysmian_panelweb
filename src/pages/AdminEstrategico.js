import { useEffect, useState } from 'react';
import { getKPIs } from '../services/dashboardService';
import { C, G } from '../theme';

export default function AdminEstrategico({ navegar }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKPIs().then(d => {
      setKpis(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={s.loading}>Cargando Inteligencia de Negocio...</div>;

  const totalValor = kpis?.valorTotal || 0;

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Panel Estratégico de Jefatura</h1>
          <p style={s.sub}>Trazabilidad, Control de Costos y Continuidad Operativa</p>
        </div>
        <div style={s.dateBadge}>{new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
      </header>

      <main style={s.main}>
        
        {/* 1. Dashboard de Disponibilidad Crítica */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.dot} />
            <h2 style={s.sectionTitle}>DISPONIBILIDAD CRÍTICA Y VALORIZACIÓN</h2>
          </div>
          
          <div style={s.gridKpi}>
            <KpiMini 
              label="Valorización de Inventario" 
              value={`$${totalValor.toLocaleString('es-CL')}`} 
              sub="Capital inmovilizado en bodega"
              icon="💰"
              color="#10B981"
            />
            <KpiMini 
              label="Índice de Quiebre de Stock" 
              value={`${kpis?.stockoutRate.toFixed(1)}%`} 
              sub="Solicitudes no satisfechas"
              icon="⚠️"
              color="#EF4444"
              alerta={kpis?.stockoutRate > 5}
            />
            <KpiMini 
              label="Puntos de Reorden" 
              value={kpis?.bajoStock} 
              sub="Artículos bajo el mínimo"
              icon="📦"
              color="#F4821F"
            />
          </div>
        </section>

        <div style={s.dualGrid}>
          {/* 2. Control de Costos por Área */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>Consumo por Centro de Costo (Área)</h3>
            <div style={s.chartContainer}>
              {kpis?.consumoPorArea.map((area, i) => (
                <BarItem key={i} label={area.name} value={area.value} max={Math.max(...kpis.consumoPorArea.map(a => a.value))} />
              ))}
            </div>
          </div>

          {/* 3. Ranking de Solicitantes (Control de Usuarios) */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>Ranking de Retiros por Usuario</h3>
            <div style={s.chartContainer}>
              {kpis?.rankingUsuarios.map((user, i) => (
                <BarItem key={i} label={user.name} value={user.value} max={Math.max(...kpis.rankingUsuarios.map(u => u.value))} color="#6366F1" />
              ))}
            </div>
          </div>
        </div>

        {/* 4. Sugerencia de Compra Inteligente */}
        <div style={s.dualGrid}>
          {/* 1. Gasto en Compras */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={s.cardTitle}>Gasto en Compras del Mes</h3>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#10B981' }}>💵 FLUJO DE CAJA</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: C.secondary }}>
              ${(kpis?.gastoMensual || 0).toLocaleString('es-CL')}
            </div>
            <p style={{ fontSize: 12, color: C.textLight, marginTop: 10 }}>Total acumulado por solicitudes de compra creadas este mes.</p>
          </div>

          {/* 2. Alertas y Reorden (Explicación Punto de Reorden) */}
          <div style={{ ...s.card, borderLeft: `6px solid ${C.warning}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={s.cardTitle}>Alertas de Reposición</h3>
              <span style={{ fontSize: 18 }}>🔔</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.warning }}>{kpis?.bajoStock || 0} ítems</div>
            <p style={{ fontSize: 11, color: C.textSecondary, marginTop: 10, lineHeight: 1.4, background: '#FFF7ED', padding: 10, borderRadius: 10 }}>
              <b>¿Qué es el Punto de Reorden?</b><br/>
              Es el stock mínimo de seguridad. Cuando el stock baja de este número, el sistema activa una alerta automática para comprar antes de que se agote.
            </p>
          </div>
        </div>

        <section style={s.section}>
          <div style={s.cardFull}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={s.cardTitle}>Sugerencia de Compra Inteligente</h3>
              <span style={s.badge}>ALGORITMO DE REABASTECIMIENTO</span>
            </div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>REPUESTO CRÍTICO</th>
                    <th style={s.th}>STOCK ACTUAL</th>
                    <th style={s.th}>MIN. SEGURIDAD</th>
                    <th style={s.th}>STATUS OPERATIVO</th>
                    <th style={s.th}>ACCIÓN RECOMENDADA</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis?.sugerenciasCompra.map((sug, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}><b>{sug.nombre}</b></td>
                      <td style={s.td}>{sug.stock}</td>
                      <td style={s.td}>{sug.min}</td>
                      <td style={s.td}>
                        <span style={{ ...s.status, background: sug.stock === 0 ? '#FEE2E2' : '#FEF3C7', color: sug.stock === 0 ? '#B91C1C' : '#92400E' }}>
                          {sug.stock === 0 ? 'QUIEBRE' : 'CRÍTICO'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button style={s.actionBtn} onClick={() => navegar('crearCompra')}>Solicitar Pedido</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

function KpiMini({ label, value, sub, icon, color, alerta }) {
  return (
    <div style={{ ...s.kpiMini, borderLeft: `4px solid ${color}` }}>
      <div style={s.kpiHeader}>
        <span style={s.kpiLabel}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ ...s.kpiValue, color: alerta ? '#EF4444' : C.secondary }}>{value}</div>
      <div style={s.kpiSub}>{sub}</div>
    </div>
  );
}

function BarItem({ label, value, max, color = C.primary }) {
  const pct = (value / max) * 100;
  return (
    <div style={s.barRow}>
      <div style={s.barLabelRow}>
        <span style={s.barLabel}>{label}</span>
        <span style={s.barValue}>{value} <small>unid.</small></span>
      </div>
      <div style={s.barBg}>
        <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#F4F7FA', paddingBottom: 60 },
  header: { padding: '40px 60px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0 },
  sub: { fontSize: 14, color: C.textSecondary, marginTop: 5 },
  dateBadge: { background: C.secondary, color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: 1 },
  
  main: { padding: '40px 60px', maxWidth: 1200, margin: '0 auto' },
  section: { marginBottom: 40 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, background: C.primary },
  sectionTitle: { fontSize: 12, fontWeight: 900, color: C.textLight, letterSpacing: 1.5, margin: 0 },
  
  gridKpi: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 },
  kpiMini: { background: '#fff', padding: 24, borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
  kpiHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  kpiLabel: { fontSize: 11, fontWeight: 800, color: C.textLight, textTransform: 'uppercase' },
  kpiValue: { fontSize: 32, fontWeight: 900, letterSpacing: -1 },
  kpiSub: { fontSize: 12, color: C.textSecondary, marginTop: 5, fontStyle: 'italic' },

  dualGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 25, marginBottom: 40 },
  card: { background: '#fff', padding: 30, borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' },
  cardFull: { background: '#fff', padding: 35, borderRadius: 28, boxShadow: '0 10px 40px rgba(0,0,0,0.05)' },
  cardTitle: { fontSize: 18, fontWeight: 800, color: C.secondary, margin: 0 },
  chartContainer: { marginTop: 25, display: 'flex', flexDirection: 'column', gap: 20 },
  
  barRow: { display: 'flex', flexDirection: 'column', gap: 8 },
  barLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { fontSize: 13, fontWeight: 700, color: C.textSecondary },
  barValue: { fontSize: 14, fontWeight: 800, color: C.secondary },
  barBg: { height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, transition: 'width 1s ease-out' },
  
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '15px', fontSize: 10, fontWeight: 800, color: C.textLight, borderBottom: `1px solid ${C.border}` },
  td: { padding: '15px', fontSize: 14, color: C.text, borderBottom: `1px solid ${C.border}` },
  tr: { transition: 'background 0.2s' },
  status: { padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 800 },
  actionBtn: { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  badge: { background: '#EEF2FF', color: '#4F46E5', padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800 },
  
  loading: { textAlign: 'center', padding: 100, fontSize: 18, fontWeight: 700, color: C.textSecondary }
};
