import { C, G } from '../theme';

const MENU = [
  // ── Admin ────────────────────────────────────────────────────
  { id: 'dashboard',           label: 'Inicio',                  icon: '🏠', roles: ['admin'] },
  { id: 'inventario',          label: 'Inventario',              icon: '📦', roles: ['admin', 'mantencion', 'planta', 'externos'] },
  { id: 'analisisMateriales',  label: 'Análisis del Mes',        icon: '📈', roles: ['admin', 'mantencion', 'planta', 'externos'] },

  // ── Pañol — menú propio ───────────────────────────────────────
  { id: 'panolInicio',         label: 'Inicio',                  icon: '🏠', roles: ['panol'] },
  { id: 'inventario',          label: 'Inventario',              icon: '📦', roles: ['panol'] },
  { id: 'panolCompras',        label: 'Gestión de Compras',      icon: '🛒', roles: ['panol'] },
  { id: 'panolRetiros',        label: 'Control de Retiros',      icon: '📤', roles: ['panol'] },
  { id: 'mapaBodega',          label: 'Mapa de Bodega',          icon: '🗺️', roles: ['panol'] },
  { id: 'historial',           label: 'Historial Movimientos',   icon: '📜', roles: ['panol'] },
  { id: 'analisis',            label: 'Análisis del Mes',        icon: '📈', roles: ['panol'] },
  { id: 'gestionUsuarios',     label: 'Gestión de Usuarios',     icon: '👥', roles: ['panol'] },
  { id: 'perfil',              label: 'Mi Perfil',               icon: '👤', roles: ['panol'] },

  // ── Mantencion / Planta / Externos ───────────────────────────
  { id: 'retiroDirecto',       label: 'Retiro',                  icon: '📤', roles: ['mantencion', 'planta', 'externos'] },
  { id: 'reservaMaterial',     label: 'Reserva Urgente',         icon: '🔴', roles: ['mantencion', 'planta', 'externos'] },
  { id: 'solicitudes',         label: 'Mis Retiros',             icon: '📋', roles: ['mantencion', 'planta', 'externos'] },
  { id: 'miConsumo',           label: 'Mi Consumo',              icon: '📊', roles: ['planta', 'externos'] },
  { id: 'solicitudMateriales', label: 'Reportar Faltante',       icon: '🚨', roles: ['mantencion', 'planta', 'externos'] },
  { id: 'crearCompra',         label: 'Solicitar Compra',        icon: '🛒', roles: ['mantencion', 'planta', 'externos'] },
  { id: 'solicitudesCompra',   label: 'Mis Compras',             icon: '📋', roles: ['mantencion', 'planta', 'externos'] },
  { id: 'conteo',              label: 'Conteo Inventario',       icon: '📋', roles: ['mantencion'] },

  // ── Admin (operación) ─────────────────────────────────────────
  { id: 'mapaBodega',          label: 'Mapa de Bodega',          icon: '🗺️', roles: ['admin'] },
  { id: 'conteo',              label: 'Conteo Inventario',       icon: '📋', roles: ['admin'] },
  { id: 'historial',           label: 'Historial Movimientos',   icon: '📜', roles: ['admin'] },
  { id: 'guiaCorreas',         label: 'Guía de Correas',         icon: '⛓️', roles: ['admin', 'mantencion'] },
  { id: 'guiaEscobillas',      label: 'Guía de Escobillas',      icon: '⚡', roles: ['admin', 'mantencion'] },
  { id: 'analisis',            label: 'Dashboard Máquinas',      icon: '📊', roles: ['admin', 'mantencion'] },
  { id: 'analisisConsumo',     label: 'Análisis de Consumo',     icon: '🔬', roles: ['admin'] },
  { id: 'adminEstrategico',    label: 'Inteligencia Jefatura',   icon: '🧠', roles: ['admin'] },
  { id: 'gestionActivos',      label: 'Activos y Herramientas',  icon: '🧰', roles: ['admin'] },
  { id: 'analisisProveedores', label: 'Análisis de Compras',     icon: '🛒', roles: ['admin'] },
  { id: 'gestionUsuarios',     label: 'Gestión de Usuarios',     icon: '👥', roles: ['admin'] },
  { id: 'importar',            label: 'Gestión Masiva',          icon: '📁', roles: ['admin'] },
];

export default function Sidebar({ pagina, setPagina, navegar, onLogout, perfil, sesionInventario }) {
  let rolActual = (perfil?.rol || 'mantencion').toLowerCase();
  if (rolActual === 'administrador') rolActual = 'admin';

  const sesionActiva = sesionInventario?.activa === true;

  const menuFiltrado = MENU.filter(item => {
    if (!item.roles.includes(rolActual)) return false;
    // Conteo para mantención solo visible cuando la sesión está activa
    if (item.id === 'conteo' && rolActual === 'mantencion') return sesionActiva;
    return true;
  });

  return (
    <div style={s.sidebar}>
      {/* Header con Perfil Glass */}
      <div style={s.header}>
        <div style={s.profileGlass}>
          <div style={s.avatar}>
            <span style={s.avatarTxt}>{perfil?.nombre?.charAt(0) || 'P'}</span>
          </div>
          <div style={s.profileInfo}>
            <div style={s.userName}>{perfil?.nombre || 'Usuario'}</div>
            <div style={s.userRole}>{rolActual.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Menú de Navegación */}
      <nav style={s.nav}>
        {menuFiltrado.map(item => {
          const activo = pagina === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navegar ? navegar(item.id) : setPagina(item.id)}
              style={{ ...s.item, ...(activo ? s.itemActivo : {}) }}
              onMouseEnter={e => { if(!activo) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if(!activo) e.currentTarget.style.background = 'none'; }}
            >
              <div style={activo ? s.iconActiveBox : s.iconBox}>
                <span style={s.icon}>{item.icon}</span>
              </div>
              <span style={activo ? s.labelActivo : s.label}>{item.label}</span>
              {activo && <div style={s.activeDot} />}
            </button>
          );
        })}
      </nav>

      {/* Footer / Status */}
      <div style={s.footer}>
        <div style={s.statusBadge}>
          <div style={s.pulse} />
          <span style={s.statusTxt}>Panel En Línea</span>
        </div>
        {onLogout && (
          <button onClick={onLogout} style={s.logoutBtn}>
            <span>Cerrar Sesión</span>
            <span style={{fontSize: 16}}>⏻</span>
          </button>
        )}
      </div>
    </div>
  );
}

const s = {
  sidebar: {
    width: 260,
    minHeight: '100vh',
    background: C.secondary,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    flexShrink: 0,
    zIndex: 100,
    position: 'relative',
    overflow: 'hidden',
  },
  header: { padding: '0 16px 24px' },
  profileGlass: {
    ...G.glassDark,
    padding: '12px',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 12,
    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(244,130,31,0.3)',
  },
  avatarTxt: { color: '#fff', fontWeight: 800, fontSize: 16 },
  profileInfo: { display: 'flex', flexDirection: 'column' },
  userName: { color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 0.3 },
  userRole: { color: C.primary, fontSize: 9, fontWeight: 800, marginTop: 2, letterSpacing: 1 },

  nav: { flex: 1, padding: '0 12px', overflowY: 'auto' },
  item: {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', padding: '10px 12px',
    background: 'none', border: 'none',
    cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    borderRadius: 12, marginBottom: 4,
    position: 'relative',
  },
  itemActivo: { background: 'rgba(255,255,255,0.08)' },
  iconBox: { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  iconActiveBox: { 
    width: 32, height: 32, borderRadius: 8, 
    background: 'rgba(244,130,31,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 16 },
  label: { fontSize: 13, color: '#94A3B8', fontWeight: 500, transition: 'all 0.2s' },
  labelActivo: { fontSize: 13, color: '#fff', fontWeight: 700 },
  activeDot: {
    position: 'absolute', left: 0, width: 3, height: 18,
    background: C.primary, borderRadius: '0 4px 4px 0',
    boxShadow: `0 0 10px ${C.primary}`,
  },

  footer: { padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 },
  statusBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(16,185,129,0.1)', padding: '6px 12px',
    borderRadius: 20, alignSelf: 'flex-start',
  },
  pulse: { width: 6, height: 6, borderRadius: 3, background: C.success },
  statusTxt: { fontSize: 10, color: C.success, fontWeight: 700, letterSpacing: 0.5 },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '10px 16px',
    background: 'rgba(239,68,68,0.1)', border: 'none',
    borderRadius: 12, color: '#FCA5A5', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
  },
};
