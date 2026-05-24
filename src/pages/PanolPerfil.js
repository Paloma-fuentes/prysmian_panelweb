import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';
import { notificarMantencion } from '../services/notificacionesService';

const ROL_LABEL = {
  panol:         'Encargada de Pañol',
  admin:         'Administradora',
  administrador: 'Administradora',
  mantencion:    'Mantenimiento',
  planta:        'Planta',
  externos:      'Externo',
};

export default function PanolPerfil({ perfil, navegar }) {
  const [sesion,    setSesion]    = useState(null);
  const [toggling,  setToggling]  = useState(false);

  const nombre   = perfil?.nombre   || 'Usuario';
  const apellido = perfil?.apellido || '';
  const rol      = (perfil?.rol || 'panol').toLowerCase();
  const ficha    = perfil?.ficha    || perfil?.numeroFicha || '—';
  const email    = perfil?.email    || '—';
  const cargo    = ROL_LABEL[rol]   || rol.toUpperCase();
  const inicial  = nombre.charAt(0).toUpperCase();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'configuracion', 'sesionInventario'), snap => {
      setSesion(snap.exists() ? snap.data() : { activa: false });
    });
    return unsub;
  }, []);

  async function toggleSesion() {
    setToggling(true);
    try {
      const nueva = !sesion?.activa;
      await setDoc(doc(db, 'configuracion', 'sesionInventario'), {
        activa:      nueva,
        activadoPor: nombre,
        activadoEn:  serverTimestamp(),
      });
      if (nueva) {
        await notificarMantencion(
          '📋 Sesión de Inventario Activa',
          'El pañol ha iniciado el conteo de inventario. Ingresa a la app para participar.',
          { pantalla: 'conteo' }
        );
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setToggling(false);
    }
  }

  const sesionActiva = sesion?.activa === true;

  const HERRAMIENTAS = [
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

        {/* Información */}
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

        {/* Sesión de Inventario — tarjeta especial con toggle */}
        <div style={s.secTitle}>Herramientas</div>
        <div style={{ ...s.sesionCard, borderTopColor: sesionActiva ? '#16a34a' : '#94a3b8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>📋</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: C.secondary }}>Sesión de Inventario</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>
                  Activa el modo conteo para mantención
                </div>
              </div>
            </div>
            {/* Toggle pill */}
            <div
              onClick={toggling ? undefined : toggleSesion}
              style={{
                ...s.togglePill,
                background: sesionActiva ? '#16a34a' : '#e2e8f0',
                cursor: toggling ? 'not-allowed' : 'pointer',
                opacity: toggling ? 0.7 : 1,
              }}
            >
              <div style={{
                ...s.toggleBall,
                transform: sesionActiva ? 'translateX(26px)' : 'translateX(2px)',
              }} />
            </div>
          </div>

          {/* Estado actual */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10,
            background: sesionActiva ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${sesionActiva ? '#bbf7d0' : '#e2e8f0'}`,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4,
              background: sesionActiva ? '#16a34a' : '#94a3b8',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: sesionActiva ? '#15803d' : '#64748b' }}>
              {sesionActiva
                ? `Activa · Mantención puede hacer conteo`
                : 'Inactiva · Mantención no tiene acceso al conteo'}
            </span>
          </div>

          {sesionActiva && sesion?.activadoPor && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
              Activada por {sesion.activadoPor}
            </div>
          )}

          <button
            onClick={toggleSesion}
            disabled={toggling}
            style={{
              ...s.sesionBtn,
              background: sesionActiva ? '#fef2f2' : C.primary,
              color: sesionActiva ? '#dc2626' : '#fff',
              marginTop: 14,
              opacity: toggling ? 0.7 : 1,
            }}
          >
            {toggling
              ? 'Guardando...'
              : sesionActiva
                ? '⏹ Finalizar Sesión de Inventario'
                : '▶ Iniciar Sesión de Inventario'}
          </button>
        </div>

        {/* Resto de herramientas */}
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
    padding: '40px 48px', display: 'flex', alignItems: 'center',
    gap: 24, marginBottom: 32, flexWrap: 'wrap',
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 24,
    background: `linear-gradient(135deg, ${C.primary}, #f97316)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 30, fontWeight: 900, color: '#fff',
    boxShadow: `0 8px 20px rgba(244,130,31,0.4)`, flexShrink: 0,
  },
  infoCard:  { background: '#fff', borderRadius: 16, padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 32 },
  secTitle:  { fontSize: 16, fontWeight: 800, color: C.secondary, marginBottom: 16 },
  infoGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  infoRow:   { padding: '12px 16px', background: '#f8fafc', borderRadius: 10 },
  sesionCard: {
    background: '#fff', borderRadius: 16, padding: '24px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 20,
    borderTop: '3px solid',
  },
  togglePill: {
    width: 52, height: 28, borderRadius: 14, flexShrink: 0,
    position: 'relative', transition: 'background 0.25s',
  },
  toggleBall: {
    position: 'absolute', top: 3,
    width: 22, height: 22, borderRadius: 11,
    background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
    transition: 'transform 0.25s',
  },
  sesionBtn: {
    width: '100%', padding: '12px 0', borderRadius: 12,
    border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer',
  },
  toolGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  toolCard: {
    background: '#fff', borderRadius: 16, padding: '24px 20px',
    textAlign: 'left', border: 'none', borderTop: '3px solid',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
};
