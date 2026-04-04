import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { getKPIs } from '../services/dashboardService';

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKPIs().then(data => { setKpis(data); setLoading(false); });
  }, []);

  if (loading) return <div style={s.loading}>Cargando dashboard...</div>;

  return (
    <div style={s.container}>
      <h1 style={s.titulo}>Dashboard de Bodega</h1>

      {/* KPIs principales */}
      <div style={s.grid}>
        <StatCard titulo="Total Productos" valor={kpis.totalProductos} icono="📦" color="#6366f1" />
        <StatCard titulo="Con Stock" valor={kpis.conStock} icono="✅" color="#10b981" />
        <StatCard titulo="Sin Stock" valor={kpis.sinStock} icono="❌" color="#ef4444" alerta={kpis.sinStock > 0} />
        <StatCard titulo="Bajo Stock" valor={kpis.bajoStock} icono="⚠️" color="#f59e0b" alerta={kpis.bajoStock > 0} />
        <StatCard titulo="Críticos" valor={kpis.criticos} icono="🚨" color="#dc2626" alerta={kpis.criticos > 0} />
        <StatCard titulo="Sin Rotación" valor={kpis.sinRotacion} icono="🔒" color="#8b5cf6" sub="+90 días sin movimiento" />
      </div>

      <div style={s.row2}>
        {/* Material más solicitado */}
        <div style={s.card}>
          <h3 style={s.cardTitulo}>🏆 Más solicitado del mes</h3>
          {kpis.topProducto ? (
            <>
              <div style={s.topNombre}>{kpis.topProducto.nombre}</div>
              <div style={s.topSub}>{kpis.topProducto.cantidad} retiros en los últimos 30 días</div>
            </>
          ) : <div style={s.empty}>Sin datos este mes</div>}
        </div>

        {/* Máquinas con mayor consumo */}
        <div style={s.card}>
          <h3 style={s.cardTitulo}>⚙️ Máquinas con mayor consumo</h3>
          {kpis.topMaquinas.length > 0 ? (
            <table style={s.table}>
              <tbody>
                {kpis.topMaquinas.map(([maq, cnt], i) => (
                  <tr key={i}>
                    <td style={s.tdRank}>#{i + 1}</td>
                    <td style={s.tdNombre}>{maq}</td>
                    <td style={s.tdCant}>{cnt} uds</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={s.empty}>Sin movimientos registrados</div>}
        </div>
      </div>

      {/* Alertas: bajo stock */}
      {kpis.bajoStock > 0 && (
        <div style={s.card}>
          <h3 style={{ ...s.cardTitulo, color: '#f59e0b' }}>⚠️ Productos con bajo stock ({kpis.bajoStock})</h3>
          <p style={s.alertaDesc}>Estos productos están en o por debajo del punto de reorden.</p>
        </div>
      )}

      {/* Sin rotación */}
      {kpis.sinRotacionLista.length > 0 && (
        <div style={s.card}>
          <h3 style={{ ...s.cardTitulo, color: '#8b5cf6' }}>🔒 Productos sin rotación (últimos 90 días)</h3>
          <table style={{ ...s.table, width: '100%' }}>
            <thead>
              <tr>
                {['Descripción', 'Ubicación', 'Stock'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpis.sinRotacionLista.map((m, i) => (
                <tr key={i} style={i % 2 === 0 ? s.trPar : {}}>
                  <td style={s.td}>{m.descripcion}</td>
                  <td style={s.td}>{m.ubicacion}</td>
                  <td style={s.td}>{m.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Últimos movimientos */}
      <div style={s.card}>
        <h3 style={s.cardTitulo}>🕐 Últimos movimientos</h3>
        {kpis.ultimosMovimientos.length > 0 ? (
          <table style={{ ...s.table, width: '100%' }}>
            <thead>
              <tr>
                {['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Máquina', 'Usuario'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpis.ultimosMovimientos.map((h, i) => {
                const fecha = h.fecha?.toDate ? h.fecha.toDate().toLocaleDateString('es-CL') : (h.fecha || '—');
                return (
                  <tr key={i} style={i % 2 === 0 ? s.trPar : {}}>
                    <td style={s.td}>{fecha}</td>
                    <td style={s.td}><span style={{ ...s.badge, background: tipoBadge(h.tipo) }}>{h.tipo}</span></td>
                    <td style={s.td}>{h.producto}</td>
                    <td style={s.td}>{h.cantidad}</td>
                    <td style={s.td}>{h.maquina || '—'}</td>
                    <td style={s.td}>{h.usuario || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <div style={s.empty}>Sin movimientos registrados aún</div>}
      </div>
    </div>
  );
}

function tipoBadge(tipo) {
  if (tipo === 'retiro') return '#dc2626';
  if (tipo === 'ingreso') return '#10b981';
  if (tipo === 'devolucion') return '#6366f1';
  return '#6b7280';
}

const s = {
  container: { padding: 28, color: '#f9fafb', background: '#0f172a', minHeight: '100vh' },
  loading: { padding: 40, color: '#9ca3af', textAlign: 'center', fontSize: 16 },
  titulo: { fontSize: 24, fontWeight: 800, color: '#f9fafb', marginBottom: 24, marginTop: 0 },
  grid: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 },
  row2: { display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  card: { background: '#1f2937', borderRadius: 10, padding: 20, marginBottom: 16, flex: 1, minWidth: 300 },
  cardTitulo: { fontSize: 15, fontWeight: 700, color: '#f9fafb', marginTop: 0, marginBottom: 14 },
  alertaDesc: { color: '#9ca3af', fontSize: 13, margin: 0 },
  topNombre: { fontSize: 18, fontWeight: 700, color: '#F4821F' },
  topSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  empty: { color: '#6b7280', fontSize: 13 },
  table: { borderCollapse: 'collapse' },
  th: { textAlign: 'left', color: '#6b7280', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderBottom: '1px solid #374151' },
  td: { padding: '8px 12px', fontSize: 13, color: '#d1d5db' },
  tdRank: { padding: '6px 8px', color: '#F4821F', fontWeight: 700, fontSize: 13 },
  tdNombre: { padding: '6px 12px', color: '#d1d5db', fontSize: 13 },
  tdCant: { padding: '6px 12px', color: '#9ca3af', fontSize: 13 },
  trPar: { background: '#111827' },
  badge: { padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 600 },
};
