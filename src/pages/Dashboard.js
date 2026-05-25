import { useEffect, useState } from 'react';
import { getKPIs } from '../services/dashboardService';
import { C, G } from '../theme';
import { escucharConfig, toggleConteo } from '../services/configService';
import { crearSolicitudCompra } from '../services/solicitudesCompraService';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

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
  kpiCard: { background: '#fff', borderRadius: 20, padding: '22px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', cursor: 'pointer', borderTop: `3px solid #5e5ce6`, transition: 'transform 0.15s', userSelect: 'none' },
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
  const [kpis, setKpis]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [config, setConfig]         = useState({ conteoActivo: false });
  const [invSnap, setInvSnap]       = useState({ total: 0, conStock: 0, sinStock: 0, bajoStock: 0, items: [] });
  const [ultMovs, setUltMovs]       = useState([]);

  const rolActual   = (perfil?.rol || '').toLowerCase();
  const esAdmin     = rolActual === 'admin' || rolActual === 'panol' || rolActual === 'administrador';
  const puedeEditar = rolActual === 'panol';

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

  // Inventario en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'materiales'), snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInvSnap({
        total:    items.length,
        conStock: items.filter(m => (m.stock ?? 0) > 0).length,
        sinStock: items.filter(m => (m.stock ?? 0) === 0).length,
        bajoStock: items.filter(m => m.bajoStock || (m.stock > 0 && m.stock <= (m.puntoReorden || m.stockMinimo || 2))).length,
        items,
      });
    });
    return unsub;
  }, []);

  // Últimos movimientos en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(8));
    const unsub = onSnapshot(q, snap => {
      setUltMovs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function cargar() {
    getKPIs()
      .then(d => { setKpis(d); setLoading(false); })
      .catch(e => { setError('Error cargando datos: ' + e.message); setLoading(false); });
  }

  useEffect(() => {
    cargar();
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

      {/* ── Contenido ── */}
      <main style={{ padding: '20px 40px 40px', display: 'flex', flexDirection: 'column', gap: 24, width: '100%', boxSizing: 'border-box' }}>

        {/* Fila 1: Mensaje + KPIs inventario tiempo real */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>

          {/* KPI Total */}
          <div onClick={() => navegar('inventario')} style={s.kpiCard}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 1, marginBottom: 8 }}>TOTAL PRODUCTOS</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#5e5ce6', lineHeight: 1 }}>{invSnap.total}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>en el sistema</div>
            <div style={{ fontSize: 10, color: '#5e5ce6', marginTop: 4, fontWeight: 700 }}>Ver inventario →</div>
          </div>

          {/* KPI Con Stock */}
          <div onClick={() => navegar('inventario')} style={{ ...s.kpiCard, borderTop: `3px solid ${C.success}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 1, marginBottom: 8 }}>CON STOCK</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: C.success, lineHeight: 1 }}>{invSnap.conStock}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>disponibles</div>
          </div>

          {/* KPI Bajo Stock */}
          <div onClick={() => navegar('alertas')} style={{ ...s.kpiCard, borderTop: `3px solid ${C.warning}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 1, marginBottom: 8 }}>BAJO STOCK</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: C.warning, lineHeight: 1 }}>{invSnap.bajoStock}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>requieren atención</div>
            {invSnap.bajoStock > 0 && <div style={{ fontSize: 10, color: C.warning, marginTop: 4, fontWeight: 700 }}>Ver alertas →</div>}
          </div>

          {/* KPI Sin Stock */}
          <div onClick={() => navegar('alertas')} style={{ ...s.kpiCard, borderTop: `3px solid ${C.error}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, letterSpacing: 1, marginBottom: 8 }}>SIN STOCK</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: C.error, lineHeight: 1 }}>{invSnap.sinStock}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}>agotados</div>
            {invSnap.sinStock > 0 && <div style={{ fontSize: 10, color: C.error, marginTop: 4, fontWeight: 700 }}>Ver alertas →</div>}
          </div>
        </div>

        {/* Fila 2: Mensaje del día + Sugerencias compra */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Mensaje del Día */}
          <div style={{ ...G.glass, padding: '24px', borderRadius: 24, borderLeft: `6px solid ${C.primary}`, background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>✨</span>
              <span style={{ color: '#6e6e73', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>MENSAJE DEL DÍA</span>
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.5, margin: '0 0 10px' }}>
              "{FRASES_DIARIAS[new Date().getDate() % FRASES_DIARIAS.length]}"
            </p>
            <div style={{ textAlign: 'right', color: '#86868b', fontSize: 11 }}>— Equipo Prysmian</div>

            {puedeEditar && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.textSecondary }}>AUDITORÍA DE CONTEO</span>
                <button
                  onClick={() => toggleConteo(!config.conteoActivo)}
                  style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: config.conteoActivo ? C.success : C.border, color: '#fff', fontSize: 10, fontWeight: 900, cursor: 'pointer' }}
                >
                  {config.conteoActivo ? '✓ ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>
            )}
          </div>

          {/* Sugerencias de compra */}
          <div style={{ ...G.glass, padding: '24px', borderRadius: 24, background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f' }}>Reponer Stock</span>
            </div>
            {!kpis?.sugerenciasCompra?.length ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: C.textLight, fontSize: 13 }}>✅ Sin alertas de stock</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {kpis.sugerenciasCompra.map((sug, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fef3c7', borderRadius: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{sug.nombre}</div>
                      <div style={{ fontSize: 11, color: '#b45309' }}>Stock: {sug.stock} / Mín: {sug.min}</div>
                    </div>
                    {puedeEditar && (
                      <button onClick={() => handleSolicitudAutomatica(sug)} style={{ fontSize: 11, fontWeight: 700, background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                        Solicitar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fila 3: Más solicitados + Últimos movimientos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Más solicitados del mes */}
          <div style={{ ...G.glass, padding: '24px', borderRadius: 24, background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f' }}>Más solicitados del mes</span>
            </div>
            {!kpis?.topProductosLista?.length ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: C.textLight, fontSize: 13 }}>Sin movimientos este mes</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {kpis.topProductosLista.map((p, i) => {
                  const max = kpis.topProductosLista[0].cantidad;
                  const pct = Math.round((p.cantidad / max) * 100);
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{p.nombre}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: C.primary }}>{p.cantidad}</span>
                      </div>
                      <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? C.primary : '#6366f1', borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Últimos movimientos en tiempo real */}
          <div style={{ ...G.glass, padding: '24px', borderRadius: 24, background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 20 }}>🔄</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f' }}>Últimos movimientos</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: '#dcfce7', borderRadius: 20, padding: '3px 10px' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: C.success }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: C.success }}>EN VIVO</span>
              </span>
            </div>
            {ultMovs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: C.textLight, fontSize: 13 }}>Sin movimientos</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ultMovs.map((m, i) => {
                  const tipo = m.tipo === 'retiro' ? { bg: '#fee2e2', co: C.error, ic: '↑' } :
                               m.tipo === 'ingreso' ? { bg: '#dcfce7', co: C.success, ic: '↓' } :
                               { bg: '#f1f5f9', co: C.textSecondary, ic: '↔' };
                  const fecha = m.fecha?.toDate ? m.fecha.toDate().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div key={m.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 10 }}>
                      <span style={{ background: tipo.bg, color: tipo.co, borderRadius: 6, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{tipo.ic}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.producto || 'Sin nombre'}</div>
                        <div style={{ fontSize: 10, color: C.textLight }}>{m.usuario || ''}{fecha ? ` · ${fecha}` : ''}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 900, color: tipo.co, flexShrink: 0 }}>{m.cantidad}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
