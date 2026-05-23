import { useEffect, useState } from 'react';
import { getKPIs } from '../services/dashboardService';
import { C, G } from '../theme';

export default function AnalisisProveedores() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    getKPIs().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}>Analizando Mercado y Proveedores...</div>;

  return (
    <div style={{ padding: '40px 60px' }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 }}>Análisis de Proveedores y Compras</h1>
        <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 5 }}>Lead Time, Variación de Precios y Eficiencia de Abastecimiento</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 25, marginBottom: 40 }}>
        
        {/* Lead Time (Tiempo de Espera) */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
            <h3 style={s.cardTitle}>Promedio de Lead Time por Proveedor</h3>
            <span style={s.badgeBlue}>TIEMPO DE RESPUESTA</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <LeadTimeItem provider="O'Higgins" days={3.5} trend="down" />
            <LeadTimeItem provider="Indumot" days={7.2} trend="up" />
            <LeadTimeItem provider="Prysmian Global" days={15.0} trend="stable" />
            <LeadTimeItem provider="Ferretería Central" days={1.2} trend="down" />
          </div>
        </div>

        {/* Variación de Precios */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
            <h3 style={s.cardTitle}>Variación de Precios (Semestre)</h3>
            <span style={s.badgeOrange}>INFLACIÓN INTERNA</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {/* Gráfico simple de variación */}
             <div style={{ width: '100%', height: 200, background: '#F8FAFC', borderRadius: 20, display: 'flex', alignItems: 'flex-end', padding: 20, gap: 15 }}>
                {[40, 55, 45, 70, 85, 95].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: C.primary, borderRadius: '4px 4px 0 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -20, width: '100%', textAlign: 'center', fontSize: 10, fontWeight: 800 }}>+{Math.floor(h/10)}%</div>
                  </div>
                ))}
             </div>
          </div>
        </div>

      </div>

      {/* Sugerencias de Compra Inteligente Detallada */}
      <div style={s.cardFull}>
        <h3 style={{ ...s.cardTitle, marginBottom: 25 }}>Sugerencia de Abastecimiento Próximo Mes</h3>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 30 }}>Basado en el historial de uso de los últimos 3 meses, el sistema recomienda el siguiente stock de seguridad:</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
          {data?.sugerenciasCompra.map((s, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, padding: 20, borderRadius: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.secondary, marginBottom: 10 }}>{s.nombre}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textSecondary }}>
                <span>Sugerencia:</span>
                <span style={{ fontWeight: 800, color: C.primary }}>+{s.min * 2} unidades</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadTimeItem({ provider, days, trend }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: trend === 'down' ? '#10B981' : trend === 'up' ? '#EF4444' : '#94A3B8' }} />
        <span style={{ fontWeight: 700, color: C.secondary, fontSize: 14 }}>{provider}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        <span style={{ fontSize: 16, fontWeight: 900 }}>{days} <small style={{ fontSize: 10, fontWeight: 600 }}>días</small></span>
        <span style={{ fontSize: 14 }}>{trend === 'down' ? '📉' : trend === 'up' ? '📈' : '➡️'}</span>
      </div>
    </div>
  );
}

const s = {
  card: { background: '#fff', padding: 30, borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' },
  cardFull: { background: '#fff', padding: 40, borderRadius: 28, boxShadow: '0 10px 40px rgba(0,0,0,0.05)' },
  cardTitle: { fontSize: 18, fontWeight: 800, color: C.secondary, margin: 0 },
  badgeBlue: { background: '#DBEAFE', color: '#1E40AF', padding: '6px 12px', borderRadius: 20, fontSize: 9, fontWeight: 800 },
  badgeOrange: { background: '#FFEDD5', color: '#9A3412', padding: '6px 12px', borderRadius: 20, fontSize: 9, fontWeight: 800 },
};
