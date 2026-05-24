import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';

function getSaludo() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function fmtFecha(d) {
  return d.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function PanolInicio({ perfil, navegar }) {
  const [materiales,   setMateriales]   = useState([]);
  const [compras,      setCompras]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [ahora,        setAhora]        = useState(new Date());
  const [mensajeDia,   setMensajeDia]   = useState('');

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let done = 0;
    const check = () => { done++; if (done >= 2) setLoading(false); };
    const u1 = onSnapshot(collection(db, 'materiales'),
      s => { setMateriales(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    const u2 = onSnapshot(query(collection(db, 'solicitudes_compra'), orderBy('creadoEn', 'desc')),
      s => { setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    return () => { u1(); u2(); };
  }, []);

  // Mensaje del día desde Firestore o generado
  useEffect(() => {
    getDoc(doc(db, 'config', 'mensajeDia')).then(snap => {
      if (snap.exists() && snap.data().texto) setMensajeDia(snap.data().texto);
    }).catch(() => {});
  }, []);

  const kpis = useMemo(() => {
    const sin    = materiales.filter(m => (m.stock ?? 0) === 0).length;
    const bajo   = materiales.filter(m => (m.stock ?? 0) > 0 && (m.bajoStock || m.stock <= (m.puntoReorden || m.stockMinimo || 2))).length;
    const urgentes  = compras.filter(c => c.urgencia === 'urgencia' && c.estado === 'en espera').length;
    const pendientes = compras.filter(c => c.estado === 'en espera').length;
    return {
      total:    materiales.length,
      conStock: materiales.filter(m => (m.stock ?? 0) > 0).length,
      sinStock: sin,
      bajoStock: bajo,
      urgentes,
      pendientes,
    };
  }, [materiales, compras]);

  const mensajeAuto = (() => {
    if (kpis.urgentes > 0) return `⚠️ Hay ${kpis.urgentes} compra${kpis.urgentes > 1 ? 's' : ''} urgente${kpis.urgentes > 1 ? 's' : ''} esperando atención.`;
    if (kpis.sinStock > 0) return `🚨 ${kpis.sinStock} material${kpis.sinStock > 1 ? 'es' : ''} sin stock. Revisa solicitudes de compra.`;
    if (kpis.bajoStock > 0) return `📦 ${kpis.bajoStock} ítem${kpis.bajoStock > 1 ? 's' : ''} en stock bajo — considera reponer pronto.`;
    return '✅ Todo en orden. Inventario al día.';
  })();

  const nombre    = perfil?.nombre || 'Encargada';
  const ficha     = perfil?.ficha  || perfil?.numeroFicha || '';
  const horaStr   = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const fechaStr  = fmtFecha(ahora);

  const ACCESOS = [
    { label: 'Gestión de Compras',   icon: '🛒', page: 'panolCompras',  color: C.primary   },
    { label: 'Control de Retiros',   icon: '📤', page: 'panolRetiros',  color: '#6366f1'   },
    { label: 'Inventario',           icon: '📦', page: 'inventario',   color: '#10b981'   },
    { label: 'Ingreso Rápido',       icon: '📥', page: 'ingresoRapido',color: '#f59e0b'   },
    { label: 'Análisis del Mes',     icon: '📈', page: 'analisis',     color: '#3b82f6'   },
    { label: 'Mi Perfil',            icon: '👤', page: 'perfil',       color: '#8b5cf6'   },
  ];

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>

      {/* ── Greeting card ─────────────────────────────────────────────────── */}
      <div style={s.greetCard}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
            {fechaStr} · {horaStr}
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900, color: '#fff' }}>
            {getSaludo()}, {nombre}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            Pañol{ficha ? ` · Ficha ${ficha}` : ''}
          </div>
        </div>
        <div style={s.clock}>{horaStr}</div>
      </div>

      <div style={{ padding: '0 40px' }}>

        {/* ── Mensaje del día ─────────────────────────────────────────────── */}
        <div style={s.mensajeCard}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, letterSpacing: 1, marginBottom: 6 }}>MENSAJE DEL DÍA</div>
          <div style={{ fontSize: 14, color: C.secondary, fontWeight: 600, lineHeight: 1.5 }}>
            {mensajeDia || mensajeAuto}
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div style={s.kpiGrid}>
          {[
            { lbl: 'Total Productos',    val: kpis.total,     icon: '📦', color: C.secondary,  bg: '#fff', cursor: null },
            { lbl: 'Con Stock',          val: kpis.conStock,  icon: '✅', color: '#16a34a',    bg: '#f0fdf4', cursor: 'conStock' },
            { lbl: 'Bajo Stock',         val: kpis.bajoStock, icon: '⚠️', color: '#d97706',    bg: '#fff7ed', cursor: 'bajoStock' },
            { lbl: 'Sin Stock',          val: kpis.sinStock,  icon: '❌', color: '#dc2626',    bg: '#fef2f2', cursor: 'sinStock' },
            { lbl: 'Compras Urgentes',   val: kpis.urgentes,  icon: '🚨', color: '#dc2626',    bg: kpis.urgentes > 0 ? '#fef2f2' : '#fff', cursor: null },
            { lbl: 'Compras Pendientes', val: kpis.pendientes,icon: '🛒', color: C.primary,    bg: '#fff7ed', cursor: null },
          ].map(k => (
            <div
              key={k.lbl}
              onClick={() => {
                if (k.cursor) navegar?.('inventario', k.cursor);
                else if (k.lbl.includes('Compra')) navegar?.('panolCompras');
              }}
              style={{ ...s.kpiCard, background: k.bg, cursor: (k.cursor || k.lbl.includes('Compra')) ? 'pointer' : 'default' }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginTop: 4 }}>{k.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Accesos rápidos ─────────────────────────────────────────────── */}
        <div style={s.secTitle}>Accesos Rápidos</div>
        <div style={s.accesoGrid}>
          {ACCESOS.map(a => (
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  kpiCard: {
    borderRadius: 16,
    padding: '20px 16px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  secTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: C.secondary,
    marginBottom: 14,
  },
  accesoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 14,
  },
  accesoCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 16px',
    textAlign: 'center',
    border: 'none',
    borderTop: '3px solid',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
};
