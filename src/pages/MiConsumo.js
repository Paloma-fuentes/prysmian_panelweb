import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C, G } from '../theme';

const PERIODOS = [
  { label: 'Último Mes', dias: 30 },
  { label: '3 Meses', dias: 90 },
  { label: 'Histórico', dias: 9999 },
];

const MEDALLAS = ['🥇', '🥈', '🥉'];

export default function MiConsumo({ perfil }) {
  const [periodo, setPeriodo] = useState(0);
  const [materiales, setMateriales] = useState([]);
  const [maquinas, setMaquinas]     = useState([]);
  const [datosGrafico, setDatosGrafico] = useState([]);
  const [totalRetiros, setTotalRetiros] = useState(0);
  const [totalUnidades, setTotalUnidades] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, [periodo, perfil]);

  async function cargar() {
    if (!perfil?.uid && !perfil?.id) return;
    setLoading(true);
    try {
      const myId = perfil?.uid || perfil?.id;
      const q = query(
        collection(db, 'solicitudes'),
        where('solicitanteUid', '==', myId),
        where('tipo', '==', 'retiro')
      );
      
      const snap = await getDocs(q);
      
      const diasAtras = new Date();
      diasAtras.setDate(diasAtras.getDate() - PERIODOS[periodo].dias);

      const registros = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => {
          if (PERIODOS[periodo].dias === 9999) return true;
          const f = r.creadoEn?.toDate ? r.creadoEn.toDate() : new Date(r.creadoEn);
          return f >= diasAtras;
        });

      const conteo = {};
      const conteoMaquinas = {};
      const serieTiempo = {}; // { YYYY-MM-DD: cantidad }
      let unidades = 0;

      registros.forEach(r => {
        const nombre = r.producto || 'Sin nombre';
        const maq = r.maquina || 'N/A';
        const cant = Number(r.cantidad) || 1;
        const fecha = r.creadoEn?.toDate ? r.creadoEn.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        
        conteo[nombre] = (conteo[nombre] || 0) + cant;
        conteoMaquinas[maq] = (conteoMaquinas[maq] || 0) + cant;
        serieTiempo[fecha] = (serieTiempo[fecha] || 0) + cant;
        unidades += cant;
      });

      const top = Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }));

      const topMaq = Object.entries(conteoMaquinas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }));

      // Procesar datos para el gráfico (últimos 15 puntos de datos con registros)
      const graphData = Object.entries(serieTiempo)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-15)
        .map(([fecha, cant]) => ({ label: fecha.split('-').slice(1).reverse().join('/'), value: cant }));

      setMateriales(top);
      setMaquinas(topMaq);
      setDatosGrafico(graphData);
      setTotalRetiros(registros.length);
      setTotalUnidades(unidades);
    } catch (e) {
      console.error('Error MiConsumo:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      <header style={{ padding: '40px 40px 20px', background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0 }}>Mi Consumo</h1>
        <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Resumen inteligente de tus retiros de material</p>
      </header>

      <main style={{ padding: '40px', width: '100%', boxSizing: 'border-box', maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Selector de Periodo */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
          {PERIODOS.map((p, i) => (
            <button
              key={i}
              onClick={() => setPeriodo(i)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 14,
                border: `1px solid ${periodo === i ? C.primary : C.border}`,
                background: periodo === i ? C.primary : '#fff',
                color: periodo === i ? '#fff' : C.textSecondary,
                fontWeight: 700,
                cursor: 'pointer',
                transition: '0.2s'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
          <div style={{ ...G.glass, background: '#fff', padding: 25, borderRadius: 24, borderTop: `4px solid ${C.primary}`, textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: C.primary }}>{totalRetiros}</div>
            <div style={{ fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>Retiros Realizados</div>
          </div>
          <div style={{ ...G.glass, background: '#fff', padding: 25, borderRadius: 24, borderTop: `4px solid #10b981`, textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#10b981' }}>{totalUnidades}</div>
            <div style={{ fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>Unidades Retiradas</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          
          {/* 1. Ranking de Materiales (Visible para todos) */}
          <div style={{ ...G.glass, background: '#fff', padding: 35, borderRadius: 28, boxShadow: G.cardShadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
              <span style={{ fontSize: 24 }}>📦</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Mis Materiales Más Usados</h3>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 50, color: C.textLight }}>Analizando tu consumo...</div>
            ) : materiales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 50, color: C.textLight }}>No hay registros en este periodo.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {materiales.map((item, i) => {
                  const maxVal = materiales[0].cantidad || 1;
                  const pct = Math.round((item.cantidad / maxVal) * 100);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 15, background: '#F8FAFC', padding: '15px', borderRadius: 20 }}>
                      <div style={{ width: 35, fontSize: 20, textAlign: 'center' }}>{MEDALLAS[i] || `${i + 1}.`}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, color: C.secondary, fontSize: 12 }}>{item.nombre.toUpperCase()}</span>
                          <span style={{ fontWeight: 800, color: C.primary }}>{item.cantidad} <small style={{ fontSize: 9 }}>U.</small></span>
                        </div>
                        <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: C.primary, borderRadius: 2, transition: 'width 1s ease-out' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Ranking de Impacto por Máquina (SOLO PARA MANTENCIÓN) */}
          {perfil?.rol === 'mantencion' && (
            <div style={{ ...G.glass, background: '#fff', padding: 35, borderRadius: 28, boxShadow: G.cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>⚙️</span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Impacto Técnico por Máquina</h3>
                </div>
                <div style={{ fontSize: 11, background: '#F4821F15', color: C.primary, padding: '6px 12px', borderRadius: 20, fontWeight: 800 }}>
                  TOP MÁQUINAS ATENDIDAS
                </div>
              </div>

              <div style={{ position: 'relative', width: '100%' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 50, color: C.textLight }}>Analizando máquinas...</div>
                ) : maquinas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 50, color: C.textLight }}>No hay datos suficientes de máquinas.</div>
                ) : (
                  <BarChart data={maquinas} color={C.primary} />
                )}
              </div>

              <div style={{ marginTop: 30, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                <p style={{ fontSize: 13, color: C.textSecondary, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>💡</span>
                  Este gráfico identifica las máquinas que han requerido mayor volumen de repuestos de tu parte.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ── Componente Interno: Gráfico de Barras (Impacto por Máquina) ──────────────
function BarChart({ data, color }) {
  const maxVal = Math.max(...data.map(d => d.cantidad), 1);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 0' }}>
      {data.map((item, i) => {
        const pct = (item.cantidad / maxVal) * 100;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? color : '#F1F5F9', color: i === 0 ? '#fff' : C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.secondary }}>{item.nombre.toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 900, color: color }}>{item.cantidad} <small style={{fontSize: 11, color: C.textLight, fontWeight: 600}}>repuestos</small></span>
            </div>
            <div style={{ height: 32, background: '#F1F5F9', borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <div 
                style={{ 
                  width: `${pct}%`, 
                  height: '100%', 
                  background: `linear-gradient(90deg, ${color}, ${color}CC)`, 
                  borderRadius: 16, 
                  transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 20,
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 10px rgba(244,130,31,0.2)'
                }}
              >
                {pct > 20 && <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>MÁXIMA ATENCIÓN</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
