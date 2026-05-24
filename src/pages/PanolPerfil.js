import { C } from '../theme';

const ROL_LABEL = {
  panol:         'Encargada de Pañol',
  admin:         'Administradora',
  administrador: 'Administradora',
  mantencion:    'Mantenimiento',
  planta:        'Planta',
  externos:      'Externo',
};

export default function PanolPerfil({ perfil, navegar }) {
  const nombre  = perfil?.nombre  || 'Usuario';
  const apellido= perfil?.apellido|| '';
  const rol     = (perfil?.rol || 'panol').toLowerCase();
  const ficha   = perfil?.ficha   || perfil?.numeroFicha || '—';
  const email   = perfil?.email   || '—';
  const cargo   = ROL_LABEL[rol]  || rol.toUpperCase();
  const inicial = nombre.charAt(0).toUpperCase();

  const HERRAMIENTAS = [
    {
      icon:  '📋',
      title: 'Iniciar Sesión de Inventario',
      desc:  'Activa el modo conteo para mantención. Registra discrepancias y genera reporte.',
      page:  'conteo',
      color: C.primary,
    },
    {
      icon:  '⛓️',
      title: 'Guía de Correas',
      desc:  'Catálogo de correas por máquina, sección y especificaciones técnicas.',
      page:  'guiaCorreas',
      color: '#6366f1',
    },
    {
      icon:  '⚡',
      title: 'Guía de Escobillas',
      desc:  'Especificaciones de escobillas por motor y tipo de aplicación.',
      page:  'guiaEscobillas',
      color: '#f59e0b',
    },
    {
      icon:  '🧰',
      title: 'Control de Herramientas',
      desc:  'Gestionar préstamos y devoluciones del inventario de herramientas.',
      page:  'gestionActivos',
      color: '#10b981',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>

      {/* Header */}
      <div style={s.headerBg}>
        <div style={s.avatarCircle}>{inicial}</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff' }}>{nombre} {apellido}</h1>
          <div style={{ color: C.primary, fontWeight: 700, fontSize: 14, marginTop: 4 }}>{cargo}</div>
        </div>
      </div>

      <div style={{ padding: '0 40px' }}>

        {/* Información personal */}
        <div style={s.infoCard}>
          <div style={s.secTitle}>Información</div>
          <div style={s.infoGrid}>
            {[
              ['👤 Nombre',         `${nombre} ${apellido}`.trim()],
              ['💼 Cargo',          cargo],
              ['🪪 Número de Ficha', ficha],
              ['📧 Email',          email],
            ].map(([lbl, val]) => (
              <div key={lbl} style={s.infoRow}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>{lbl}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.secondary }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Herramientas */}
        <div style={s.secTitle}>Herramientas</div>
        <div style={s.toolGrid}>
          {HERRAMIENTAS.map(h => (
            <button key={h.page} onClick={() => navegar?.(h.page)} style={{ ...s.toolCard, borderTopColor: h.color }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{h.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.secondary, marginBottom: 6 }}>{h.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{h.desc}</div>
              <div style={{ marginTop: 14, color: h.color, fontSize: 12, fontWeight: 700 }}>Abrir →</div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

const s = {
  headerBg: {
    background: `linear-gradient(135deg, ${C.secondary} 0%, #1e293b 100%)`,
    padding: '40px 48px',
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 24,
    background: `linear-gradient(135deg, ${C.primary}, #f97316)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 30, fontWeight: 900, color: '#fff',
    boxShadow: `0 8px 20px rgba(244,130,31,0.4)`,
    flexShrink: 0,
  },
  infoCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '24px 28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: 32,
  },
  secTitle: { fontSize: 16, fontWeight: 800, color: C.secondary, marginBottom: 16 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  infoRow:  { padding: '12px 16px', background: '#f8fafc', borderRadius: 10 },
  toolGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  toolCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '24px 20px',
    textAlign: 'left',
    border: 'none',
    borderTop: '3px solid',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
};
