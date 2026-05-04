import { C } from '../theme';

const MENU = [
  { id: 'dashboard',         label: 'Inicio',               icon: '📊', roles: ['admin', 'panol', 'mantencion', 'planta', 'externos'] },
  { id: 'solicitudesCompra', label: 'Solicitudes Compra',    icon: '🛒', roles: ['admin', 'panol'] },
  { id: 'solicitudes',       label: 'Solicitudes Móvil',     icon: '📱', roles: ['admin', 'panol'] },
  { id: 'retiroDirecto',     label: 'Retiro Directo',        icon: '📤', roles: ['admin', 'panol'] },
  { id: 'devolucionDirecta', label: 'Devolución Directa',    icon: '↩️', roles: ['admin', 'panol'] },
  { id: 'alertas',           label: 'Alertas',               icon: '🔔', roles: ['admin', 'panol'] },
  { id: 'inventario',        label: 'Inventario',            icon: '📦', roles: ['admin', 'panol', 'mantencion', 'planta', 'externos'] },
  { id: 'conteo',            label: 'Conteo Inventario',     icon: '📋', roles: ['admin', 'panol'] },
  { id: 'historial',         label: 'Historial',             icon: '📜', roles: ['admin', 'panol', 'mantencion'] },
  { id: 'analisis',          label: 'Análisis',              icon: '📈', roles: ['admin', 'panol'] },
  { id: 'importar',          label: 'Importar Excel',        icon: '⬆️', roles: ['admin'] },
];

export default function Sidebar({ pagina, setPagina, onLogout, perfil }) {
  const rolActual = perfil?.rol || 'mantencion';
  const menuFiltrado = MENU.filter(item => item.roles.includes(rolActual));

  return (
    <div style={s.sidebar}>
      {/* Logo / Header */}
      <div style={s.header}>
        <div style={s.logoCircle}>
          <span style={s.logoIcon}>P</span>
        </div>
        <div>
          <div style={s.logoText}>PRYSMIAN</div>
          <div style={s.logoSub}>{perfil?.nombre || 'Usuario'}</div>
          <div style={{ fontSize: 9, color: C.primary, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{rolActual}</div>
        </div>
      </div>

      {/* Menú */}
      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {menuFiltrado.map(item => {
          const activo = pagina === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPagina(item.id)}
              style={{ ...s.item, ...(activo ? s.itemActivo : {}) }}
            >
              <span style={s.icon}>{item.icon}</span>
              <span style={activo ? s.itemLabelActivo : s.itemLabel}>{item.label}</span>
              {activo && <div style={s.indicador} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={s.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={s.footerDot} />
          <span style={s.footerTxt}>Sistema Activo</span>
        </div>
        {onLogout && (
          <button onClick={onLogout} style={s.logoutBtn} title="Cerrar sesión">⏻</button>
        )}
      </div>
    </div>
  );
}

const s = {
  sidebar: {
    width: 230,
    minHeight: '100vh',
    background: C.secondary,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
  },
  header: {
    padding: '24px 16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  logoCircle: {
    width: 40, height: 40, borderRadius: 20,
    background: C.primary,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logoIcon:   { color: '#fff', fontWeight: 900, fontSize: 18 },
  logoText:   { fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: 1.5 },
  logoSub:    { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  item: {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '12px 16px',
    background: 'none', border: 'none',
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.15s',
    borderRadius: 0,
  },
  itemActivo:      { background: 'rgba(244,130,31,0.15)' },
  icon:            { fontSize: 16, width: 20, textAlign: 'center' },
  itemLabel:       { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 },
  itemLabelActivo: { fontSize: 13, color: C.primary, fontWeight: 700 },
  indicador: {
    position: 'absolute', right: 0, top: '20%', bottom: '20%',
    width: 3, borderRadius: '3px 0 0 3px',
    background: C.primary,
  },

  footer: {
    padding: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  footerDot:  { width: 8, height: 8, borderRadius: 4, background: '#4ade80', flexShrink: 0 },
  footerTxt:  { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  logoutBtn:  { background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 16, cursor: 'pointer', padding: '4px', lineHeight: 1 },
};
