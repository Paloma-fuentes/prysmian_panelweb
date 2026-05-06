import { useEffect, useState } from 'react';
import { C, G } from '../theme';
import { 
  escucharSolicitudesCompra, 
  eliminarSolicitudCompra, 
  borrarTodasMisSolicitudesCompra,
  editarSolicitudCompra 
} from '../services/solicitudesCompraService';

const ESTADOS_STYLE = {
  'en espera':    { bg: '#F97316', co: '#fff', label: 'EN ESPERA' },
  'en revision':  { bg: '#6366F1', co: '#fff', label: 'EN REVISION' },
  'pr realizada': { bg: '#F59E0B', co: '#fff', label: 'PR REALIZADA' },
  'completado':   { bg: '#10B981', co: '#fff', label: 'COMPLETADO' },
  'rechazado':    { bg: '#EF4444', co: '#fff', label: 'RECHAZADO' },
};

export default function SolicitudesCompra({ perfil }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edición
  const [editando, setEditando] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

  const esAdmin = perfil?.rol === 'admin' || perfil?.rol === 'panol';

  useEffect(() => {
    setLoading(true);
    const unsub = escucharSolicitudesCompra(data => {
      // PRIVACIDAD: Si no es admin, filtrar solo las propias
      const filtradas = esAdmin ? data : data.filter(s => s.usuario === perfil?.nombre);
      setSolicitudes(filtradas);
      setLoading(false);
    });
    return unsub;
  }, [esAdmin, perfil]);

  async function handleBorrarTodo() {
    if (!window.confirm('¿Seguro que quieres borrar TODAS tus solicitudes de compra? Esta acción no se puede deshacer.')) return;
    try {
      await borrarTodasMisSolicitudesCompra(perfil.nombre);
      alert('✅ Historial vaciado');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta solicitud?')) return;
    await eliminarSolicitudCompra(id);
  }

  async function handleGuardarEdicion() {
    if (!nuevoNombre) return;
    await editarSolicitudCompra(editando.id, { nombre: nuevoNombre });
    setEditando(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      <header style={{ padding: '40px 40px 20px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0 }}>Historial de Compras</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Mis solicitudes de compra recientes.</p>
        </div>
        <button onClick={handleBorrarTodo} style={s.clearBtn}>
          🗑️ Borrar Todo
        </button>
      </header>

      <main style={{ padding: '40px', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textSecondary }}>Cargando historial...</div>
        ) : solicitudes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textLight, background: '#fff', borderRadius: 28 }}>
            <div style={{ fontSize: 50, marginBottom: 15 }}>🛒</div>
            <p>No tienes solicitudes de compra registradas.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
            {solicitudes.map(sol => (
              <div key={sol.id} style={{ ...G.glass, background: '#fff', borderRadius: 24, padding: '25px', boxShadow: G.cardShadow, position: 'relative' }}>
                
                {/* Header Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                  <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700 }}>
                    {sol.creadoEn?.toDate ? sol.creadoEn.toDate().toLocaleString('es-CL') : 'Pendiente...'}
                  </div>
                  <div style={{ ...s.badge, background: ESTADOS_STYLE[sol.estado?.toLowerCase()]?.bg || '#94a3b8', color: '#fff' }}>
                    {ESTADOS_STYLE[sol.estado?.toLowerCase()]?.label || 'DESCONOCIDO'}
                  </div>
                </div>

                <h3 style={{ fontSize: 20, fontWeight: 900, color: C.secondary, margin: '0 0 12px' }}>{sol.nombre}</h3>

                {/* Info Bar */}
                <div style={{ display: 'flex', gap: 20, padding: '12px 0', borderTop: `1px solid #f1f5f9`, borderBottom: `1px solid #f1f5f9`, marginBottom: 15 }}>
                  <div style={s.miniInfo}>⚙️ {sol.maquina || 'N/A'}</div>
                  <div style={s.miniInfo}>🔧 {sol.parteMaquina || 'N/A'}</div>
                </div>

                {/* Footer Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', gap: 15 }}>
                      <button onClick={() => { setEditando(sol); setNuevoNombre(sol.nombre); }} style={s.iconBtn}>✏️</button>
                      <button onClick={() => handleEliminar(sol.id)} style={{ ...s.iconBtn, color: C.error }}>🗑️</button>
                   </div>
                   <div style={s.catBadge}>{sol.categoria || 'Otros'}</div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Edición */}
      {editando && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
            <h3 style={{ margin: '0 0 20px' }}>Editar Solicitud</h3>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>NOMBRE DEL PRODUCTO</label>
            <input style={s.input} value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <button onClick={handleGuardarEdicion} style={{ ...s.btn, background: C.primary, color: '#fff' }}>Guardar</button>
              <button onClick={() => setEditando(null)} style={{ ...s.btn, background: '#F1F5F9', color: C.textSecondary }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  badge: { padding: '5px 12px', borderRadius: 10, fontSize: 10, fontWeight: 900, letterSpacing: 0.5 },
  miniInfo: { fontSize: 12, color: C.textSecondary, display: 'flex', alignItems: 'center', gap: 5 },
  catBadge: { fontSize: 11, fontWeight: 800, color: C.primary, background: 'rgba(244,130,31,0.1)', padding: '5px 12px', borderRadius: 20 },
  iconBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', opacity: 0.7, transition: '0.2s' },
  clearBtn: { padding: '10px 20px', borderRadius: 12, border: 'none', background: '#FEE2E2', color: C.error, fontWeight: 800, fontSize: 13, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', padding: 40, borderRadius: 28, width: 400, boxShadow: G.cardShadowLg },
  input: { width: '100%', padding: 15, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 16, outline: 'none' },
  btn: { flex: 1, padding: 15, borderRadius: 14, border: 'none', fontWeight: 800, cursor: 'pointer' }
};
