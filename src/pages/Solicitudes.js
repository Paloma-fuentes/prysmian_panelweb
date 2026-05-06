import { useEffect, useState } from 'react';
import { C, G } from '../theme';
import {
  escucharSolicitudes,
  eliminarSolicitudConStock,
  editarSolicitudConStock,
  entregarSolicitud,
  cancelarSolicitud,
} from '../services/solicitudesService';
import { imprimirValeRetiro } from '../services/impresionService';

const ESTADOS_STYLE = {
  pendiente_entrega: { bg: '#FEF3C7', co: '#D97706', ic: '⏳', label: 'PENDIENTE' },
  entregado:         { bg: '#DCFCE7', co: '#10B981', ic: '✅', label: 'ENTREGADO' },
  cancelado:         { bg: '#F3F4F6', co: '#6B7280', ic: '🚫', label: 'CANCELADO' },
  devuelto:          { bg: '#EEF2FF', co: '#6366F1', ic: '↩️', label: 'DEVUELTO' },
};

export default function Solicitudes({ perfil }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTiempo, setFiltroTiempo] = useState(7);
  
  // Estado para edición
  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({ producto: '', cantidad: '', maquina: '', parteMaquina: '' });

  const esAdmin = perfil?.rol === 'admin' || perfil?.rol === 'panol';

  useEffect(() => {
    setLoading(true);
    const unsub = escucharSolicitudes(data => {
      const filtradasPorUsuario = esAdmin ? data : data.filter(s => s.usuario === perfil?.nombre);
      setSolicitudes(filtradasPorUsuario);
      setLoading(false);
    });
    return unsub;
  }, [esAdmin, perfil]);

  const filtradas = solicitudes.filter(s => {
    const cumpleEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
    const fecha = s.creadoEn?.toDate ? s.creadoEn.toDate() : new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() - filtroTiempo);
    return cumpleEstado && (fecha >= limite);
  });

  function abrirEdicion(sol) {
    setEditando(sol);
    setFormEdit({
      producto: sol.producto,
      cantidad: sol.cantidad,
      maquina: sol.maquina,
      parteMaquina: sol.parteMaquina || ''
    });
  }

  async function handleGuardarEdicion() {
    if (!editando || !formEdit.cantidad) return;
    try {
      const nuevosDatos = {
        producto: formEdit.producto,
        cantidad: Number(formEdit.cantidad),
        maquina: formEdit.maquina,
        parteMaquina: formEdit.parteMaquina
      };
      await editarSolicitudConStock(editando.id, nuevosDatos, editando);
      alert('✅ Registro actualizado correctamente.');
      setEditando(null);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  async function handleEliminar(sol) {
    if (sol.estado === 'entregado') {
      alert('🚫 No se puede eliminar un registro que ya ha sido entregado.');
      return;
    }
    
    if (!window.confirm('¿Seguro que quieres eliminar esta solicitud pendiente?')) return;

    try {
      await eliminarSolicitudConStock(sol);
      alert('✅ Eliminado correctamente.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  function handleImprimir(sol) {
    imprimirValeRetiro(sol);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}`, width: '100%', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0, letterSpacing: -0.5 }}>Mis Retiros</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Historial y gestión de materiales solicitados</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ d: 7, l: '1 semana' }, { d: 30, l: '1 mes' }, { d: 90, l: '90 días' }].map(f => (
            <button key={f.d} onClick={() => setFiltroTiempo(f.d)} style={{ ...s.filterBtn, ...(filtroTiempo === f.d ? s.filterBtnActive : {}) }}>{f.l}</button>
          ))}
        </div>
      </header>

      <div style={{ ...s.toolbar, width: '100%', boxSizing: 'border-box' }}>
        <div style={s.tabsBox}>
          {[['todos', 'Todos'], ['pendiente_entrega', '⏳ Pendientes'], ['entregado', '✅ Entregados']].map(([val, lbl]) => (
            <button key={val} style={{ ...s.tabBtn, ...(filtroEstado === val ? s.tabBtnActivo : {}) }} onClick={() => setFiltroEstado(val)}>{lbl}</button>
          ))}
        </div>
      </div>

      <main style={{ padding: '0 40px 40px', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={s.loading}>Sincronizando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
            {filtradas.map(sol => (
              <div key={sol.id} style={{ ...G.glass, background: '#fff', borderRadius: 24, padding: '25px', boxShadow: G.cardShadow, borderLeft: `6px solid ${ESTADOS_STYLE[sol.estado]?.co || C.border}`, position: 'relative', display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.textLight, marginBottom: 5 }}>{sol.creadoEn?.toDate ? sol.creadoEn.toDate().toLocaleString('es-CL') : '—'}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: C.secondary }}>{sol.cantidad}x "{sol.producto.toUpperCase()}"</div>
                  </div>
                  <div style={{ ...s.badge, background: ESTADOS_STYLE[sol.estado]?.bg, color: ESTADOS_STYLE[sol.estado]?.co }}>{ESTADOS_STYLE[sol.estado]?.ic} {ESTADOS_STYLE[sol.estado]?.label}</div>
                </div>

                <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: 12, fontSize: 12 }}>
                  <div><b>📍 Máquina:</b> {sol.maquina}</div>
                  <div><b>🔧 Parte:</b> {sol.parteMaquina || 'General'}</div>
                  {esAdmin && <div style={{ marginTop: 4, color: C.primary }}><b>👤 Usuario:</b> {sol.usuario}</div>}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                  <button onClick={() => handleImprimir(sol)} style={{ ...s.actionBtn, background: '#10B981', color: '#fff' }}>🖨️ Imprimir</button>
                  
                  {sol.estado !== 'entregado' && (
                    <>
                      <button onClick={() => abrirEdicion(sol)} style={{ ...s.actionBtn, background: '#F1F5F9', color: C.textSecondary }}>✏️ Editar</button>
                      <button onClick={() => handleEliminar(sol)} style={{ ...s.actionBtn, background: '#FEE2E2', color: C.error }}>🗑️ Eliminar</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE EDICIÓN */}
      {editando && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
            <h3 style={{ margin: '0 0 5px' }}>Editar Registro</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>Modifica la información de la solicitud</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={s.label}>PRODUCTO</label>
                <input style={s.modalInput} value={formEdit.producto} onChange={e => setFormEdit({...formEdit, producto: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>CANTIDAD</label>
                  <input type="number" style={s.modalInput} value={formEdit.cantidad} onChange={e => setFormEdit({...formEdit, cantidad: e.target.value})} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={s.label}>MÁQUINA</label>
                  <input style={s.modalInput} value={formEdit.maquina} onChange={e => setFormEdit({...formEdit, maquina: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={s.label}>PARTE DE LA MÁQUINA</label>
                <input style={s.modalInput} value={formEdit.parteMaquina} onChange={e => setFormEdit({...formEdit, parteMaquina: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
              <button onClick={handleGuardarEdicion} style={{ ...s.modalBtn, background: C.primary, color: '#fff' }}>Guardar Cambios</button>
              <button onClick={() => setEditando(null)} style={{ ...s.modalBtn, background: '#F1F5F9', color: C.textSecondary }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', gap: 20, alignItems: 'center', padding: '24px 40px' },
  tabsBox: { display: 'flex', background: '#fff', padding: '6px', borderRadius: 16, border: `1px solid ${C.border}` },
  tabBtn: { padding: '10px 20px', borderRadius: 12, border: 'none', background: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  tabBtnActivo: { background: C.secondary, color: '#fff' },
  loading: { textAlign: 'center', padding: 100, color: C.textSecondary },
  filterBtn: { padding: '8px 16px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary, fontSize: 13, fontWeight: 700 },
  filterBtnActive: { background: C.primary, color: '#fff' },
  badge: { padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 900 },
  actionBtn: { flex: 1, padding: '12px', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', padding: '35px', borderRadius: 28, width: 450, boxShadow: G.cardShadowLg, boxSizing: 'border-box' },
  label: { display: 'block', fontSize: 10, fontWeight: 800, color: C.textLight, marginBottom: 5 },
  modalInput: { width: '100%', padding: '12px 15px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box' },
  modalBtn: { flex: 1, padding: 15, borderRadius: 14, border: 'none', fontWeight: 800, cursor: 'pointer' }
};
