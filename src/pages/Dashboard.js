import { useEffect, useState } from 'react';
import { getKPIs } from '../services/dashboardService';
import { C, G } from '../theme';
import { escucharConfig, toggleConteo } from '../services/configService';
import { crearSolicitudCompra } from '../services/solicitudesCompraService';

const FRASES_DIARIAS = [
  "La excelencia no es un acto, es un hábito en Mantención.",
  "Un mantenimiento preventivo hoy evita un desastre mañana.",
  "Tu precisión técnica es el motor que mueve a Prysmian.",
  "La seguridad es el mejor repuesto: siempre debe estar instalado.",
  "Herramienta limpia y en su lugar es señal de un experto profesional.",
  "La calidad de tu trabajo asegura el futuro de nuestra planta.",
  "No hay atajo seguro para un trabajo bien hecho.",
  "El orden en tu pañol refleja el orden en tu ejecución técnica.",
  "Tu compromiso con la seguridad nos lleva a todos a casa sanos.",
  "Pequeños ajustes hoy evitan grandes fallas mañana."
];

const s = {
  primaryBtn: { background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(244,130,31,0.3)', transition: 'all 0.2s' },
  secondaryBtn: { background: C.surfaceAlt, color: C.textSecondary, border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 1.5, margin: 0 },
  headerLine: { flex: 1, height: 1, background: C.border },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 10, fontWeight: 800, color: C.textLight, letterSpacing: 1, borderBottom: `1px solid ${C.border}` },
  tr: { borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' },
  badge: { padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }
};

function KpiCard({ titulo, valor, icono, color, sub, alerta, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...G.glass,
        padding: '20px',
        borderRadius: 20,
        boxShadow: G.cardShadow,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: `3px solid ${alerta ? color : 'transparent'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
          {icono}
        </div>
        {alerta && (
          <div style={{ background: '#fee2e2', padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: C.error }} />
            <span style={{ fontSize: 10, color: C.error, fontWeight: 800 }}>ACCIÓN</span>
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: -1 }}>{valor ?? '—'}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginTop: 2 }}>{titulo}</div>
      </div>
      {sub && <div style={{ fontSize: 11, color: C.textLight, fontStyle: 'italic' }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ navegar, perfil }) {
  const [kpis, setKpis]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [config, setConfig]   = useState({ conteoActivo: false });
  
  const esAdmin = perfil?.rol === 'admin' || perfil?.rol === 'panol';

  async function handleSolicitudAutomatica(sug) {
    if (!window.confirm(`¿Generar solicitud de compra automática para "${sug.nombre}"?`)) return;
    
    try {
      await crearSolicitudCompra({
        nombre: sug.nombre,
        cantidad: Math.max(1, sug.min - sug.stock),
        urgencia: 'alta',
        usuario: perfil?.nombre || 'Usuario Web',
        caracteristicas: `Generado automáticamente por bajo stock. Stock actual: ${sug.stock}. Mínimo requerido: ${sug.min}.`,
        maquina: 'N/A',
        area: 'Mantenimiento'
      });
      alert('✅ Solicitud de compra creada con éxito. Puedes verla en "Mis Compras".');
    } catch (e) {
      alert('❌ Error al crear la solicitud: ' + e.message);
    }
  }

  useEffect(() => {
    const unsubConfig = escucharConfig(setConfig);
    return () => unsubConfig();
  }, []);

  function cargar() {
    getKPIs()
      .then(d => { setKpis(d); setLoading(false); })
      .catch(e => { setError('Error cargando datos: ' + e.message); setLoading(false); });
  }

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 20, background: C.background }}>
      <div style={{ width: 50, height: 50, borderRadius: 25, border: `4px solid ${C.border}`, borderTopColor: C.primary, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.textSecondary }}>Sincronizando con pañol...</div>
    </div>
  );

  const misMovimientos = kpis?.ultimosMovimientos?.filter(m => m.usuario === perfil?.nombre) || [];
  const fechaHoy = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F5F5F7' }}>

      {/* ── Header Móvil ── */}
      <header style={{ padding: '30px 40px 10px', background: 'transparent' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1d1d1f', margin: 0 }}>
          Hola, {perfil?.nombre || 'Colega'} 👋
        </h1>
        <p style={{ fontSize: 16, color: '#86868b', margin: '4px 0 0' }}>{fechaHoy}</p>
      </header>

      {/* ── Contenido Multi-Columna (Optimizado para Computador) ── */}
      <main style={{ padding: '20px 40px 40px', display: 'flex', flexDirection: 'column', gap: 25, width: '100%', boxSizing: 'border-box' }}>

        {/* Fila Superior: Mensaje, Ranking y Conteo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 25 }}>
          
          {/* 1. Mensaje del Día */}
          <div style={{ ...G.glass, padding: '24px', borderRadius: 24, borderLeft: `6px solid ${C.primary}`, background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
               <span style={{ fontSize: 20 }}>✨</span>
               <span style={{ color: '#6e6e73', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>MENSAJE DEL DÍA</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.4, margin: '0 0 10px' }}>
              "{FRASES_DIARIAS[new Date().getDate() % FRASES_DIARIAS.length]}"
            </p>
            <div style={{ textAlign: 'right', color: '#86868b', fontSize: 11 }}>— Equipo Prysmian</div>
          </div>

          {/* 2. Ranking / Puesto */}
          <div style={{ ...G.glass, padding: '24px', borderRadius: 24, background: '#f0f0ff', borderLeft: '6px solid #5e5ce6', display: 'flex', alignItems: 'center', gap: 15, boxShadow: '0 4px 20px rgba(94, 92, 230, 0.05)' }}>
            <div style={{ width: 50, height: 50, borderRadius: 25, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🚀</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1d1d1f' }}>Puesto #{Math.floor(Math.random() * 10) + 1} del equipo</div>
              <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>Registrar tus retiros ayuda a todo el equipo.</div>
            </div>
          </div>

          {/* 3. Conteo Total / Switch de Auditoría */}
          <div 
            onClick={() => navegar('inventario')}
            style={{ ...G.glass, padding: '24px', borderRadius: 24, background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24, color: config.conteoActivo ? C.success : '#5e5ce6' }}>📦</div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: config.conteoActivo ? C.success : '#5e5ce6', lineHeight: 1 }}>{kpis?.totalProductos || 0}</div>
                <div style={{ fontSize: 13, color: '#86868b', fontWeight: 600, marginTop: 4 }}>Total Productos en Sistema</div>
              </div>
            </div>
            
            {esAdmin && (
              <div style={{ marginTop: 15, borderTop: `1px solid ${C.border}`, paddingTop: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.textSecondary }}>AUDITORÍA FÍSICA</span>
                <button 
                  onClick={() => toggleConteo(!config.conteoActivo)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 10, 
                    border: 'none', 
                    background: config.conteoActivo ? C.success : C.border, 
                    color: '#fff', 
                    fontSize: 10, 
                    fontWeight: 900, 
                    cursor: 'pointer' 
                  }}
                >
                  {config.conteoActivo ? 'ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Fila Inferior: Listados Críticos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 25 }}>
          
          {/* 4. Sugerencias de Compra (Tarjeta Oscura) */}
          <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: 28, color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 25 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛒</div>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Sugerencias de Compra</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {kpis?.sugerenciasCompra?.map((sug, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: 16, transition: 'background 0.2s' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{sug.nombre}</div>
                    <div style={{ fontSize: 12, color: '#a1a1a6', marginTop: 4 }}>Stock: {sug.stock} (Min: {sug.min})</div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ color: '#30d158', fontSize: 14, fontWeight: 800 }}>Pedir {Math.max(1, sug.min - sug.stock)}</div>
                    <button 
                      onClick={() => handleSolicitudAutomatica(sug)} 
                      style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                    >
                      Solicitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Más Solicitados */}
          <div style={{ ...G.glass, padding: '30px', borderRadius: 28, background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 25 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(244,130,31,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏆</div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#1d1d1f', letterSpacing: -0.5 }}>Más solicitados del mes</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {kpis?.topProductosLista?.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f5f5f7', borderRadius: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{p.nombre}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.primary }}>{p.cantidad}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
