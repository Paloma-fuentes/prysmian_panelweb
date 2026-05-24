import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';

// ── Mensajes motivacionales / seguridad — rotan cada día ─────────────────────
const MENSAJES_DIA = [
  '🦺 Recuerda usar EPP completo antes de iniciar cualquier tarea. Tu seguridad es prioridad.',
  '🔒 Materiales bien almacenados = menos accidentes. Orden en bodega, seguridad en planta.',
  '⚠️ Revisa las etiquetas antes de entregar materiales peligrosos o químicos.',
  '🧤 Guantes apropiados para el material correcto. Consulta si tienes dudas.',
  '🔍 Un inventario preciso evita detenciones no planificadas. Registra todo.',
  '💪 Tu trabajo en pañol mantiene la producción en movimiento. Eres clave.',
  '📋 Registra cada retiro, incluso los urgentes. La trazabilidad nos protege a todos.',
  '🚧 Área de bodega señalizada = tránsito seguro para todos los trabajadores.',
  '🔧 Materiales de calidad + técnico preparado = menos tiempo de mantención.',
  '⏰ Las solicitudes urgentes respondidas a tiempo evitan paradas costosas.',
  '🌿 Materiales ordenados por categoría reducen el tiempo de búsqueda.',
  '🏆 Un pañol organizado refleja el estándar de toda la planta.',
  '🧹 La limpieza en bodega no es opcional, es parte del trabajo diario.',
  '📦 Stock mínimo = alerta de compra. No esperes a quedarte sin nada.',
  '👀 Revisa fechas de vencimiento en materiales con caducidad.',
  '🤝 La comunicación con mantención evita solicitudes duplicadas.',
  '⚡ Materiales eléctricos: nunca almacenes cerca de fuentes de humedad.',
  '🛡️ Cero accidentes empieza con cero improvisaciones en el trabajo.',
  '📊 El análisis del mes te ayuda a anticipar necesidades del próximo período.',
  '🔑 Materiales críticos con stock de seguridad: siempre deben estar disponibles.',
  '🌟 Tu gestión diaria impacta directamente en la continuidad operacional.',
  '🎯 Prioriza urgencias sin descuidar el flujo normal de solicitudes.',
  '💡 Materiales sin movimiento por 90+ días: evalúa si siguen siendo necesarios.',
  '📝 Cada solicitud bien documentada ahorra tiempo en auditorías e inspecciones.',
  '🔄 Rotación de stock: lo que entró primero, sale primero. FIFO siempre.',
  '🏗️ Bodega segura = trabajadores seguros. Responsabilidad compartida.',
  '📡 Sistema actualizado en tiempo real = decisiones más rápidas y precisas.',
  '🎖️ Excelencia: respuesta rápida, información exacta, cero errores.',
  '🧰 Herramientas prestadas = responsabilidad del solicitante. Registra siempre.',
  '✅ Antes de cerrar el día: inventario al día, área ordenada, reportes enviados.',
  '🔐 Un accidente de trabajo es prevenible. La prevención empieza aquí.',
];

function getMensajeDia() {
  const inicio = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dia    = Math.floor((Date.now() - inicio) / 86_400_000);
  return MENSAJES_DIA[dia % MENSAJES_DIA.length];
}

function getSaludo() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function PanolInicio({ perfil, navegar }) {
  const [materiales, setMateriales] = useState([]);
  const [compras,    setCompras]    = useState([]);
  const [historial,  setHistorial]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [ahora,      setAhora]      = useState(new Date());

  // Reloj en vivo
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Suscripciones
  useEffect(() => {
    let done = 0;
    const check = () => { done++; if (done >= 3) setLoading(false); };
    const u1 = onSnapshot(collection(db, 'materiales'),
      s => { setMateriales(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    const u2 = onSnapshot(query(collection(db, 'solicitudes_compra'), orderBy('creadoEn', 'desc')),
      s => { setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    const u3 = onSnapshot(query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(1000)),
      s => { setHistorial(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    return () => { u1(); u2(); u3(); };
  }, []);

  // KPIs
  const kpis = useMemo(() => ({
    total:     materiales.length,
    conStock:  materiales.filter(m => (m.stock ?? 0) > 0).length,
    sinStock:  materiales.filter(m => (m.stock ?? 0) === 0).length,
    bajoStock: materiales.filter(m => (m.stock ?? 0) > 0 && (m.bajoStock || m.stock <= (m.puntoReorden || m.stockMinimo || 2))).length,
    urgentes:  compras.filter(c => c.urgencia === 'urgencia' && c.estado === 'en espera').length,
    pendientes:compras.filter(c => c.estado === 'en espera').length,
  }), [materiales, compras]);

  // Top 5 más retirados del mes actual
  const top5Mes = useMemo(() => {
    const now   = new Date();
    const mes   = now.getMonth();
    const anio  = now.getFullYear();
    const map   = {};
    historial.filter(h => {
      if (h.tipo !== 'retiro') return false;
      const f = h.fecha?.toDate ? h.fecha.toDate() : null;
      return f && f.getMonth() === mes && f.getFullYear() === anio;
    }).forEach(h => {
      const p = h.producto || 'Sin nombre';
      map[p] = (map[p] || 0) + (Number(h.cantidad) || 1);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }, [historial]);

  const maxTop5 = top5Mes[0]?.cantidad || 1;

  // Sin rotación +90 días (misma lógica que la app móvil)
  const sinRotacion = useMemo(() => {
    const hace90   = Date.now() - 90 * 86_400_000;
    const movidos  = new Set(
      historial
        .filter(h => { const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0; return f >= hace90; })
        .map(h => h.producto)
    );
    return materiales
      .filter(m => (m.stock ?? 0) > 0 && !movidos.has(m.descripcion))
      .sort((a, b) => (b.stock || 0) - (a.stock || 0))
      .slice(0, 10);
  }, [materiales, historial]);

  const nombre   = perfil?.nombre || 'Encargada';
  const ficha    = perfil?.ficha  || perfil?.numeroFicha || '';
  const horaStr  = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const fechaStr = ahora.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const KPI_CARDS = [
    { lbl: 'Total Productos',    val: kpis.total,      icon: '📦', color: C.secondary, bg: '#fff',     onClick: () => navegar?.('inventario', 'todos') },
    { lbl: 'Con Stock',          val: kpis.conStock,   icon: '✅', color: '#16a34a',   bg: '#f0fdf4',  onClick: () => navegar?.('inventario', 'conStock') },
    { lbl: 'Bajo Stock',         val: kpis.bajoStock,  icon: '⚠️', color: '#d97706',   bg: '#fff7ed',  onClick: () => navegar?.('inventario', 'bajoStock') },
    { lbl: 'Sin Stock',          val: kpis.sinStock,   icon: '❌', color: '#dc2626',   bg: '#fef2f2',  onClick: () => navegar?.('inventario', 'sinStock') },
    { lbl: 'Compras Urgentes',   val: kpis.urgentes,   icon: '🚨', color: '#dc2626',   bg: kpis.urgentes > 0 ? '#fef2f2' : '#fff', onClick: () => navegar?.('panolCompras', 'urgentes') },
    { lbl: 'Compras Pendientes', val: kpis.pendientes, icon: '🛒', color: C.primary,   bg: '#fff7ed',  onClick: () => navegar?.('panolCompras') },
  ];

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#64748b' }}>Cargando...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>

      {/* ── Header saludo ─────────────────────────────────────────────────── */}
      <div style={s.greetCard}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
            {fechaStr}
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900, color: '#fff' }}>
            {getSaludo()}, {nombre}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
            Pañol Prysmian{ficha ? ` · Ficha ${ficha}` : ''}
          </div>
        </div>
        <div style={s.clock}>{horaStr}</div>
      </div>

      <div style={{ padding: '0 40px' }}>

        {/* ── Mensaje del día ─────────────────────────────────────────────── */}
        <div style={s.mensajeCard}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.primary, letterSpacing: 1, marginBottom: 6 }}>💬 MENSAJE DEL DÍA</div>
          <div style={{ fontSize: 14, color: C.secondary, fontWeight: 600, lineHeight: 1.6 }}>
            {getMensajeDia()}
          </div>
        </div>

        {/* ── KPIs ──────────────────────────────────────────────────────────── */}
        <div style={s.kpiGrid}>
          {KPI_CARDS.map(k => (
            <div key={k.lbl} onClick={k.onClick} style={{ ...s.kpiCard, background: k.bg, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 4 }}>{k.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Dos columnas: Top 5 + Sin Rotación ──────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          {/* Top 5 más retirados del mes */}
          <div style={s.panel}>
            <div style={s.panelTitle}>🏆 Top 5 Más Retirados — {new Date().toLocaleDateString('es-CL', { month: 'long' })}</div>
            {top5Mes.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Sin retiros este mes</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {top5Mes.map((item, i) => {
                  const pct    = Math.max(6, Math.round((item.cantidad / maxTop5) * 100));
                  const COLORS = [C.primary, '#6366f1', '#10b981', '#f59e0b', '#ef4444'];
                  const co     = COLORS[i];
                  return (
                    <div key={item.nombre}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: co, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{i + 1}</div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: co, flexShrink: 0, marginLeft: 8 }}>{item.cantidad} u.</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: co, borderRadius: 3, transition: 'width 0.6s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sin rotación +90 días */}
          <div style={s.panel}>
            <div style={s.panelTitle}>🔴 Sin Rotación +90 días ({sinRotacion.length})</div>
            {sinRotacion.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Todos los materiales con movimiento</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                {sinRotacion.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fef9f0', borderRadius: 10, borderLeft: '3px solid #f97316' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.descripcion}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{m.ubicacion || 'Sin ubicación'}</div>
                    </div>
                    <div style={{ background: '#fff7ed', color: '#f97316', border: '1.5px solid #f97316', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800, flexShrink: 0, marginLeft: 8 }}>
                      {m.stock} u.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Accesos rápidos ─────────────────────────────────────────────── */}
        <div style={s.secTitle}>Accesos Rápidos</div>
        <div style={s.accesoGrid}>
          {[
            { label: 'Gestión de Compras', icon: '🛒', page: 'panolCompras',  color: C.primary  },
            { label: 'Control de Retiros', icon: '📤', page: 'panolRetiros',  color: '#6366f1'  },
            { label: 'Inventario',         icon: '📦', page: 'inventario',    color: '#10b981'  },
            { label: 'Ingreso Rápido',     icon: '📥', page: 'ingresoRapido', color: '#f59e0b'  },
            { label: 'Análisis del Mes',   icon: '📈', page: 'analisis',      color: '#3b82f6'  },
            { label: 'Mi Perfil',          icon: '👤', page: 'perfil',        color: '#8b5cf6'  },
          ].map(a => (
            <button key={a.page} onClick={() => navegar?.(a.page)} style={{ ...s.accesoCard, borderTopColor: a.color }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.secondary }}>{a.label}</div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

const s = {
  greetCard: {
    background: `linear-gradient(135deg, ${C.secondary} 0%, #1e293b 100%)`,
    padding: '36px 48px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  clock: {
    fontSize: 48,
    fontWeight: 900,
    color: C.primary,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  mensajeCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '18px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: 24,
    borderLeft: `4px solid ${C.primary}`,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
    gap: 14,
    marginBottom: 28,
  },
  kpiCard: {
    borderRadius: 16,
    padding: '20px 14px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  panel: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: C.secondary,
    marginBottom: 16,
  },
  secTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: C.secondary,
    marginBottom: 14,
  },
  accesoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
    gap: 12,
  },
  accesoCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 14px',
    textAlign: 'center',
    border: 'none',
    borderTop: '3px solid',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    cursor: 'pointer',
  },
};
