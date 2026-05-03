import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C, card } from '../theme';

const PERIODOS = [
  { dias: 30,  label: '30 días'  },
  { dias: 60,  label: '60 días'  },
  { dias: 90,  label: '90 días'  },
  { dias: 180, label: '6 meses'  },
];

export default function Analisis() {
  const [loading, setLoading]      = useState(true);
  const [periodo, setPeriodo]      = useState(30);
  const [materiales, setMateriales]= useState([]);
  const [historial, setHistorial]  = useState([]);
  const [tabSel, setTabSel]        = useState(0); // 0=Stock crítico 1=Consumo 2=Sin rotación

  useEffect(() => {
    async function cargar() {
      const [matSnap, histSnap] = await Promise.all([
        getDocs(collection(db, 'materiales')),
        getDocs(query(collection(db, 'historial'), orderBy('fecha', 'desc'))),
      ]);
      setMateriales(matSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHistorial(histSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    cargar();
  }, []);

  const corte = new Date(Date.now() - periodo * 86_400_000);

  // Consumo por material en el periodo
  const retiros = historial.filter(h => {
    const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha || 0);
    return h.tipo === 'retiro' && f >= corte;
  });

  const consumoPorMat = {};
  retiros.forEach(h => {
    const key = h.materialId || h.producto;
    if (!consumoPorMat[key]) consumoPorMat[key] = { nombre: h.producto, total: 0, retiros: 0 };
    consumoPorMat[key].total   += Number(h.cantidad) || 0;
    consumoPorMat[key].retiros += 1;
  });

  const rankConsumo = Object.values(consumoPorMat)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // Stock crítico
  const maxConsumo = Math.max(...Object.values(consumoPorMat).map(c => c.total), 1);
  const stockCritico = materiales
    .map(m => {
      const consumo = consumoPorMat[m.id]?.total || consumoPorMat[m.descripcion]?.total || 0;
      const stock   = m.stock ?? 0;
      const dias    = consumo > 0 ? Math.round((stock / consumo) * periodo) : null;
      return { ...m, consumoTotal: consumo, diasRestantes: dias };
    })
    .filter(m => m.consumoTotal > 0 && (m.stock === 0 || (m.diasRestantes !== null && m.diasRestantes < 60)))
    .sort((a, b) => (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999));

  // Sin rotación
  const movidos = new Set(retiros.map(h => h.materialId || h.producto));
  const sinRotacion = materiales
    .filter(m => m.stock > 0 && !movidos.has(m.id) && !movidos.has(m.descripcion))
    .sort((a, b) => b.stock - a.stock);

  const TABS = [
    { label: `Stock Crítico (${stockCritico.length})`, key: 0 },
    { label: `Consumo Top (${rankConsumo.length})`,    key: 1 },
    { label: `Sin Rotación (${sinRotacion.length})`,   key: 2 },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: C.textLight }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
        <div>Calculando análisis...</div>
      </div>
    </div>
  );

  return (
    <div style={{ color: C.text }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', background: C.secondary }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Análisis Técnico de Stock</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Consumo, rotación y durabilidad estimada</div>
      </div>

      <div style={{ padding: '16px 28px' }}>
        {/* Selector periodo */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {PERIODOS.map(p => (
            <button
              key={p.dias}
              style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${C.border}`, background: periodo === p.dias ? C.primary : C.surface, color: periodo === p.dias ? '#fff' : C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              onClick={() => setPeriodo(p.dias)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPIs rápidos */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Retiros en periodo', valor: retiros.length,         color: C.primary },
            { label: 'Materiales activos', valor: Object.keys(consumoPorMat).length, color: C.success },
            { label: 'Stock crítico',      valor: stockCritico.length,    color: C.error   },
            { label: 'Sin rotación',       valor: sinRotacion.length,     color: '#8b5cf6' },
          ].map(k => (
            <div key={k.label} style={{ ...card, flex: 1, minWidth: 120, borderLeft: `4px solid ${k.color}`, marginBottom: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.valor}</div>
              <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${C.border}`, marginBottom: 16 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tabSel === t.key ? C.primary : C.textSecondary, borderBottom: tabSel === t.key ? `3px solid ${C.primary}` : '3px solid transparent', marginBottom: -2 }}
              onClick={() => setTabSel(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Stock Crítico */}
        {tabSel === 0 && (
          <div style={card}>
            {stockCritico.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.textLight }}>✅ Sin materiales en stock crítico</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.background }}>
                    {['Material', 'Stock', 'Consumo', 'Días restantes', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textSecondary, letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockCritico.map((m, i) => {
                    const alerta = m.stock === 0 ? 'SIN STOCK' : m.diasRestantes < 14 ? 'CRÍTICO' : m.diasRestantes < 30 ? 'BAJO' : 'CUIDADO';
                    const alertColor = m.stock === 0 ? C.error : m.diasRestantes < 14 ? C.urgent : m.diasRestantes < 30 ? C.warning : '#f59e0b';
                    return (
                      <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.background }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.descripcion}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: m.stock === 0 ? C.error : C.text }}>{m.stock}</td>
                        <td style={{ padding: '10px 12px', color: C.textSecondary }}>{m.consumoTotal}</td>
                        <td style={{ padding: '10px 12px', color: alertColor, fontWeight: 700 }}>{m.diasRestantes !== null ? `${m.diasRestantes}d` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: `${alertColor}20`, color: alertColor }}>{alerta}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab: Consumo */}
        {tabSel === 1 && (
          <div style={card}>
            {rankConsumo.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.textLight }}>Sin retiros en el periodo</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rankConsumo.map((m, i) => {
                  const pct = Math.round((m.total / rankConsumo[0].total) * 100);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 14, background: i < 3 ? C.primary : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i < 3 ? '#fff' : C.textSecondary, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.nombre}</div>
                        <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: 6, width: `${pct}%`, background: C.primary, borderRadius: 3 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>{m.total}</div>
                        <div style={{ fontSize: 11, color: C.textLight }}>{m.retiros} retiros</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Sin Rotación */}
        {tabSel === 2 && (
          <div style={card}>
            {sinRotacion.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.textLight }}>✅ Todos los materiales tienen movimiento</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.background }}>
                    {['Material', 'Stock', 'Ubicación', 'Tipo'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textSecondary }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sinRotacion.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.background }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.descripcion}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#8b5cf6' }}>{m.stock}</td>
                      <td style={{ padding: '10px 12px', color: C.textSecondary }}>{m.ubicacion || '—'}</td>
                      <td style={{ padding: '10px 12px', color: C.textSecondary }}>{m.tipoMaterial || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
