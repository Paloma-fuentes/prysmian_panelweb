import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C, G } from '../theme';

export default function Analisis() {
  const [maquinas, setMaquinas]     = useState([]);
  const [historial, setHistorial]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [maquinaSel, setMaquinaSel] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      const histSnap = await getDocs(query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(1500)));
      const hist = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistorial(hist);

      const totalMap = {};
      const recienteMap = {};
      const anteriorMap = {};

      const mitad = Math.floor(hist.length / 2);
      const reciente = hist.slice(0, mitad);
      const anterior = hist.slice(mitad);

      hist.forEach(h => {
        if (!h.maquina || h.maquina === 'N/A') return;
        const m = h.maquina.trim();
        totalMap[m] = (totalMap[m] || 0) + (Number(h.cantidad) || 1);
      });

      reciente.forEach(h => {
        if (!h.maquina || h.maquina === 'N/A') return;
        const m = h.maquina.trim();
        recienteMap[m] = (recienteMap[m] || 0) + 1;
      });

      anterior.forEach(h => {
        if (!h.maquina || h.maquina === 'N/A') return;
        const m = h.maquina.trim();
        anteriorMap[m] = (anteriorMap[m] || 0) + 1;
      });

      const lista = Object.entries(totalMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([nombre, total]) => {
          const r = recienteMap[nombre] || 0;
          const a = anteriorMap[nombre] || 0;
          const tendencia = r > a ? 'sube' : r < a ? 'baja' : 'estable';
          const ultimoReg = hist.find(h => h.maquina?.trim() === nombre);
          const ultimaFecha = ultimoReg?.fecha?.toDate ? ultimoReg.fecha.toDate() : null;
          return { nombre, total, tendencia, ultimaFecha };
        });

      setMaquinas(lista);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const maxVal = maquinas[0]?.total || 1;

  // Lógica para el gráfico del modal
  function getDatosGrafico(maqNombre) {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hoy = new Date();
    const ultimos6 = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      ultimos6.push({ 
        mes: meses[d.getMonth()], 
        anio: d.getFullYear(), 
        total: 0,
        id: `${d.getFullYear()}-${d.getMonth()}`
      });
    }

    historial
      .filter(h => h.maquina?.trim() === maqNombre)
      .forEach(h => {
        const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha || 0);
        const id = `${f.getFullYear()}-${f.getMonth()}`;
        const slot = ultimos6.find(s => s.id === id);
        if (slot) slot.total += Number(h.cantidad) || 1;
      });

    return ultimos6;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      <header style={{ padding: '40px 40px 20px', background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0 }}>Dashboard de Máquinas</h1>
        <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Análisis de rendimiento y frecuencia de fallas por equipo</p>
      </header>

      <main style={{ padding: '40px', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100 }}>Generando reportes técnicos...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>
            {maquinas.map((maq, i) => {
              const pct = Math.max(5, Math.round((maq.total / maxVal) * 100));
              const barColor = i === 0 ? '#ef4444' : i === 1 ? '#f97316' : i === 2 ? '#eab308' : C.primary;
              const { icon, color, label } = 
                maq.tendencia === 'sube' ? { icon: '📈', color: '#ef4444', label: 'Alta' } :
                maq.tendencia === 'baja' ? { icon: '📉', color: '#10b981', label: 'Baja' } :
                                           { icon: '➖', color: '#94a3b8', label: 'Estable' };

              return (
                <div 
                  key={maq.nombre} 
                  onClick={() => setMaquinaSel(maq)}
                  style={{ ...G.glass, background: '#fff', padding: '25px', borderRadius: 24, boxShadow: G.cardShadow, cursor: 'pointer', transition: '0.2s', border: `1px solid transparent` }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: C.secondary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900 }}>{i + 1}</div>
                    <div style={{ flex: 1, fontSize: 18, fontWeight: 800, color: C.secondary }}>{maq.nombre}</div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: 18 }}>{icon}</div>
                       <div style={{ fontSize: 10, fontWeight: 900, color }}>{label.toUpperCase()}</div>
                    </div>
                  </div>

                  <div style={{ height: 12, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden', marginBottom: 15 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 6, transition: 'width 1s ease-out' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.textSecondary }}>{maq.total} retiros</div>
                    <div style={{ fontSize: 12, color: C.textLight }}>Último: {maq.ultimaFecha?.toLocaleDateString('es-CL') || '—'}</div>
                    <div style={{ color: C.primary, fontSize: 12, fontWeight: 800 }}>Ver historial ›</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL DE INFORME CON GRÁFICOS */}
      {maquinaSel && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
             <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Informe de Actividad</h2>
                  <div style={{ color: C.primary, fontWeight: 800, marginTop: 5, fontSize: 18 }}>{maquinaSel.nombre}</div>
                </div>
                <button onClick={() => setMaquinaSel(null)} style={s.closeBtn}>✕</button>
             </header>

             {/* GRÁFICO DE BARRAS CUSTOM */}
             <div style={{ marginBottom: 35 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.textLight, letterSpacing: 1, marginBottom: 20 }}>TENDENCIA DE RETIROS (ÚLTIMOS 6 MESES)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, background: '#F8FAFC', borderRadius: 20, padding: '20px 30px' }}>
                  {getDatosGrafico(maquinaSel.nombre).map(d => {
                    const maxM = Math.max(...getDatosGrafico(maquinaSel.nombre).map(x => x.total), 1);
                    const hPct = (d.total / maxM) * 100;
                    return (
                      <div key={d.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{ position: 'relative', width: 24, height: 100, background: 'rgba(15,23,42,0.03)', borderRadius: 12, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                           <div style={{ width: '100%', height: `${hPct}%`, background: C.primary, borderRadius: 12, transition: 'height 0.5s' }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, marginTop: 10 }}>{d.mes}</div>
                        <div style={{ fontSize: 10, fontWeight: 900, color: C.primary }}>{d.total}</div>
                      </div>
                    );
                  })}
                </div>
             </div>

             <div style={{ fontSize: 12, fontWeight: 800, color: C.textLight, letterSpacing: 1, marginBottom: 15 }}>HISTORIAL COMPLETO DE MOVIMIENTOS</div>
             <div style={{ height: 300, overflowY: 'auto', paddingRight: 10 }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {historial.filter(h => h.maquina?.trim() === maquinaSel.nombre).map(h => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: C.secondary }}>{h.producto}</div>
                          <div style={{ fontSize: 11, color: C.textLight, marginTop: 3 }}>{h.usuario} • {h.fecha?.toDate?.().toLocaleString('es-CL')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, color: h.tipo === 'retiro' ? C.primary : C.success }}>{h.tipo === 'retiro' ? '-' : '+'}{h.cantidad}</div>
                          <div style={{ fontSize: 9, fontWeight: 900, color: C.textLight }}>{h.tipo?.toUpperCase()}</div>
                        </div>
                      </div>
                    ))}
                 </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,23,42,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' },
  modalBox: { background: '#fff', width: '90%', maxWidth: 700, borderRadius: 32, padding: 40, boxShadow: G.cardShadowLg },
  closeBtn: { background: '#F1F5F9', border: 'none', width: 40, height: 40, borderRadius: 20, cursor: 'pointer', fontSize: 18, fontWeight: 800, color: C.textSecondary },
  tab: { flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#F1F5F9', color: C.textSecondary, fontWeight: 700, cursor: 'pointer' },
  tabAct: { background: C.primary, color: '#fff' }
};
