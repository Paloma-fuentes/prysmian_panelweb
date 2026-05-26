import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { C } from '../theme';

const ROL_LABEL = {
  mantencion: 'Mantención',
  planta:     'Planta',
  externos:   'Externo',
};

const HERRAMIENTAS = [
  {
    icon: '🔧', color: '#f97316', bg: '#fff7ed',
    title: 'Dashboard de Máquinas',
    desc:  'Historial de materiales pedidos y rotación por equipo',
    page:  'analisis',
  },
  {
    icon: '🔨', color: '#6366f1', bg: '#eef2ff',
    title: 'Control de Herramientas',
    desc:  'Ver disponibilidad, tomar o devolver herramientas',
    page:  'gestionActivos',
  },
  {
    icon: '⚡', color: '#8b5cf6', bg: '#f5f3ff',
    title: 'Guía de Escobillas de Grafito',
    desc:  'Escobillas por máquina, dimensiones y material',
    page:  'guiaEscobillas',
  },
  {
    icon: '⛓️', color: '#10b981', bg: '#f0fdf4',
    title: 'Guía de Correas',
    desc:  'Correas y bandas por máquina, stock y dimensiones',
    page:  'guiaCorreas',
  },
];

export default function MantencionPerfil({ perfil, navegar }) {
  const nombre   = perfil?.nombre   || 'Usuario';
  const apellido = perfil?.apellido || '';
  const rol      = (perfil?.rol || 'mantencion').toLowerCase();
  const ficha    = perfil?.ficha || perfil?.numeroFicha || '—';
  const rolLabel = ROL_LABEL[rol] || (rol.charAt(0).toUpperCase() + rol.slice(1));
  const inicial  = nombre.charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.avatar}>{inicial}</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#fff' }}>{nombre}</h1>
          <div style={s.rolBadge}>🔧 {rolLabel}</div>
        </div>
      </div>

      <div style={{ padding: '0 40px' }}>

        {/* Información */}
        <div style={s.card}>
          <div style={s.secLabel}>INFORMACIÓN</div>
          {[
            { icon: '📱', label: 'Ficha',  val: ficha },
            { icon: '👤', label: 'Nombre', val: `${nombre} ${apellido}`.trim() },
            { icon: '🛡️', label: 'Rol',   val: rolLabel },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ ...s.infoRow, borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 20, width: 28, flexShrink: 0 }}>{row.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{row.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.secondary }}>{row.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Herramientas */}
        <div style={s.secLabel}>HERRAMIENTAS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {HERRAMIENTAS.map(h => (
            <button key={h.page} onClick={() => navegar?.(h.page)} style={s.toolCard}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ ...s.toolIcon, background: h.bg }}>
                <span style={{ fontSize: 22 }}>{h.icon}</span>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.secondary }}>{h.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>{h.desc}</div>
              </div>
              <span style={{ color: '#cbd5e1', fontSize: 18, fontWeight: 300 }}>›</span>
            </button>
          ))}
        </div>

        {/* Cerrar sesión */}
        <button onClick={() => signOut(auth)} style={s.logoutBtn}>
          ⏻ &nbsp;Cerrar Sesión
        </button>

      </div>
    </div>
  );
}

const s = {
  header: {
    background: `linear-gradient(135deg, ${C.secondary} 0%, #1e293b 100%)`,
    padding: '40px 40px', display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28,
  },
  avatar: {
    width: 68, height: 68, borderRadius: '50%',
    background: `linear-gradient(135deg, ${C.primary}, #f97316)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 900, color: '#fff',
    boxShadow: '0 8px 20px rgba(244,130,31,0.4)', flexShrink: 0,
  },
  rolBadge: {
    marginTop: 8, display: 'inline-block',
    background: 'rgba(244,130,31,0.2)', border: '1px solid rgba(244,130,31,0.35)',
    borderRadius: 20, padding: '3px 14px', fontSize: 13, fontWeight: 700, color: C.primary,
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 28,
  },
  secLabel: { fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: 1.2, marginBottom: 14 },
  infoRow:  { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0' },
  toolCard: {
    display: 'flex', alignItems: 'center', gap: 16,
    background: '#fff', borderRadius: 14, padding: '16px 20px',
    border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.15s', width: '100%',
  },
  toolIcon: {
    width: 48, height: 48, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoutBtn: {
    width: '100%', padding: '14px 0', borderRadius: 14,
    background: '#fef2f2', color: '#dc2626', border: 'none',
    fontSize: 14, fontWeight: 800, cursor: 'pointer',
  },
};
