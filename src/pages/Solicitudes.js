import React, { useEffect, useState } from 'react';
import { getSolicitudes, crearSolicitud, entregarSolicitud, cancelarSolicitud, aprobarDevolucion, rechazarDevolucion } from '../services/solicitudesService';
import { buscarMateriales } from '../services/inventarioService';

const ESTADOS_COLOR = {
  pendiente: '#f59e0b',
  entregado: '#10b981',
  cancelado: '#6b7280',
  devuelto: '#6366f1',
  rechazado: '#ef4444',
};

const VACIO = { producto: '', materialId: '', cantidad: 1, maquina: '', usuario: '', tipo: 'retiro', notas: '' };

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [procesando, setProcesando] = useState(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const data = await getSolicitudes(300);
    setSolicitudes(data);
    setLoading(false);
  }

  async function handleBuscarProducto(txt) {
    setBusqueda(txt);
    setForm(f => ({ ...f, producto: txt, materialId: '' }));
    if (txt.length > 1) {
      const res = await buscarMateriales(txt);
      setSugerencias(res.slice(0, 6));
    } else {
      setSugerencias([]);
    }
  }

  function seleccionarProducto(mat) {
    setBusqueda(mat.descripcion);
    setForm(f => ({ ...f, producto: mat.descripcion, materialId: mat.id }));
    setSugerencias([]);
  }

  async function guardar() {
    if (!form.producto || !form.cantidad) return;
    setGuardando(true);
    try {
      await crearSolicitud({ ...form });
      setModal(false);
      setForm(VACIO);
      setBusqueda('');
      cargar();
    } finally { setGuardando(false); }
  }

  async function accion(tipo, s) {
    setProcesando(s.id);
    try {
      if (tipo === 'entregar') {
        await entregarSolicitud(s.id, { materialId: s.materialId, producto: s.producto, cantidad: s.cantidad, maquina: s.maquina, usuario: s.usuario });
      } else if (tipo === 'cancelar') {
        if (!window.confirm('¿Cancelar esta solicitud?')) return;
        await cancelarSolicitud(s.id);
      } else if (tipo === 'aprobar_dev') {
        await aprobarDevolucion(s.id, { materialId: s.materialId, producto: s.producto, cantidad: s.cantidad, usuario: s.usuario });
      } else if (tipo === 'rechazar_dev') {
        if (!window.confirm('¿Rechazar esta devolución?')) return;
        await rechazarDevolucion(s.id);
      }
      cargar();
    } finally { setProcesando(null); }
  }

  const filtradas = filtroEstado === 'todos' ? solicitudes : solicitudes.filter(s => s.estado === filtroEstado);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.titulo}>Solicitudes de Material</h1>
        <button style={s.btnPrimary} onClick={() => { setForm(VACIO); setBusqueda(''); setModal(true); }}>+ Nueva Solicitud</button>
      </div>

      {/* Filtros */}
      <div style={s.toolbar}>
        {[['todos', 'Todas'], ['pendiente', '⏳ Pendientes'], ['entregado', '✅ Entregadas'], ['devuelto', '↩️ Devueltas'], ['cancelado', '🚫 Canceladas'], ['rechazado', '❌ Rechazadas']].map(([val, lbl]) => (
          <button key={val} style={{ ...s.filtroBtn, ...(filtroEstado === val ? s.filtroBtnActivo : {}) }} onClick={() => setFiltroEstado(val)}>{lbl}</button>
        ))}
        <span style={s.total}>{filtradas.length} solicitudes</span>
      </div>

      {/* Aviso */}
      <div style={s.aviso}>
        ℹ️ El stock <strong>solo se descuenta</strong> cuando una solicitud cambia a <span style={{ color: '#10b981' }}>Entregado</span>. Las solicitudes <span style={{ color: '#f59e0b' }}>Pendientes</span> son solo reservas o cotizaciones.
      </div>

      {/* Tabla */}
      {loading ? <div style={s.loading}>Cargando...</div> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Fecha', 'Tipo', 'Producto', 'Cant.', 'Máquina', 'Usuario', 'Notas', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((sol, i) => {
                const fecha = sol.fechaCreacion?.toDate ? sol.fechaCreacion.toDate().toLocaleString('es-CL') : '—';
                const bloqueado = procesando === sol.id;
                return (
                  <tr key={sol.id} style={i % 2 === 0 ? s.trPar : {}}>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{fecha}</td>
                    <td style={s.td}><span style={{ ...s.badge, background: sol.tipo === 'retiro' ? '#dc2626' : '#6366f1' }}>{sol.tipo}</span></td>
                    <td style={{ ...s.td, maxWidth: 240 }}>{sol.producto}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{sol.cantidad}</td>
                    <td style={s.td}>{sol.maquina || '—'}</td>
                    <td style={s.td}>{sol.usuario || '—'}</td>
                    <td style={{ ...s.td, color: '#6b7280', maxWidth: 180 }}>{sol.notas || '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: ESTADOS_COLOR[sol.estado] || '#6b7280' }}>{sol.estado}</span>
                    </td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                      {sol.estado === 'pendiente' && sol.tipo === 'retiro' && (
                        <>
                          <button style={s.btnAction} disabled={bloqueado} onClick={() => accion('entregar', sol)}>✅ Entregar</button>
                          <button style={{ ...s.btnAction, ...s.btnCancelar }} disabled={bloqueado} onClick={() => accion('cancelar', sol)}>🚫 Cancelar</button>
                        </>
                      )}
                      {sol.estado === 'pendiente' && sol.tipo === 'devolucion' && (
                        <>
                          <button style={s.btnAction} disabled={bloqueado} onClick={() => accion('aprobar_dev', sol)}>↩️ Aprobar</button>
                          <button style={{ ...s.btnAction, ...s.btnCancelar }} disabled={bloqueado} onClick={() => accion('rechazar_dev', sol)}>❌ Rechazar</button>
                        </>
                      )}
                      {!['pendiente'].includes(sol.estado) && <span style={s.finalizado}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtradas.length === 0 && <div style={s.empty}>Sin solicitudes</div>}
        </div>
      )}

      {/* Modal nueva solicitud */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitulo}>Nueva Solicitud</h2>

            {/* Tipo */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Tipo de movimiento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['retiro', '📤 Retiro / Salida'], ['devolucion', '↩️ Devolución']].map(([val, lbl]) => (
                  <button key={val}
                    style={{ ...s.tipoBtn, ...(form.tipo === val ? s.tipoBtnActivo : {}) }}
                    onClick={() => setForm(f => ({ ...f, tipo: val }))}
                  >{lbl}</button>
                ))}
              </div>
            </div>

            {/* Buscar producto */}
            <div style={{ marginBottom: 14, position: 'relative' }}>
              <label style={s.label}>Producto *</label>
              <input
                style={s.input}
                placeholder="Buscar por nombre o código SAP..."
                value={busqueda}
                onChange={e => handleBuscarProducto(e.target.value)}
              />
              {sugerencias.length > 0 && (
                <div style={s.sugerencias}>
                  {sugerencias.map(m => (
                    <div key={m.id} style={s.sugerencia} onClick={() => seleccionarProducto(m)}>
                      <span>{m.descripcion}</span>
                      <span style={s.sugerenciaSub}>Stock: {m.stock} | {m.codigoSAP || 'Sin SAP'}</span>
                    </div>
                  ))}
                </div>
              )}
              {form.materialId && <div style={s.materialSeleccionado}>✅ Material vinculado al inventario</div>}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Cantidad *</label>
                <input style={s.input} type="number" min="1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Máquina / Área</label>
                <input style={s.input} placeholder="Ej: Máquina 3" value={form.maquina} onChange={e => setForm(f => ({ ...f, maquina: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Usuario solicitante</label>
              <input style={s.input} placeholder="Nombre del solicitante" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Notas / Observaciones</label>
              <textarea style={{ ...s.input, height: 70, resize: 'vertical' }} placeholder="Ej: Para cotización, urgente, etc." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>

            <div style={s.aviso}>
              {form.tipo === 'retiro'
                ? '⏳ Se creará como Pendiente. El stock se descuenta solo al marcar "Entregar".'
                : '↩️ La devolución sube el stock solo al ser aprobada.'}
            </div>

            <div style={s.modalBtns}>
              <button style={s.btnSecondary} onClick={() => setModal(false)}>Cancelar</button>
              <button style={s.btnPrimary} onClick={guardar} disabled={guardando || !form.producto}>
                {guardando ? 'Guardando...' : 'Crear Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { padding: 28, color: '#f9fafb', background: '#0f172a', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 24, fontWeight: 800, margin: 0 },
  toolbar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  filtroBtn: { padding: '7px 14px', borderRadius: 6, border: '1px solid #374151', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 },
  filtroBtnActivo: { background: '#F4821F', borderColor: '#F4821F', color: '#fff' },
  total: { color: '#6b7280', fontSize: 13, marginLeft: 'auto' },
  aviso: { background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  loading: { color: '#9ca3af', padding: 40, textAlign: 'center' },
  tableWrap: { overflowX: 'auto', background: '#0f172a', borderRadius: 8 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#0f172a' },
  th: { textAlign: 'left', color: '#6b7280', fontSize: 12, fontWeight: 600, padding: '10px 12px', borderBottom: '1px solid #374151', whiteSpace: 'nowrap', background: '#0f172a' },
  td: { padding: '9px 12px', fontSize: 13, color: '#d1d5db', borderBottom: '1px solid #1f2937', background: '#0f172a' },
  trPar: { background: '#111827' },
  badge: { padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 700 },
  btnAction: { background: '#10b981', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginRight: 4, fontWeight: 600 },
  btnCancelar: { background: '#374151' },
  finalizado: { color: '#4b5563', fontSize: 12 },
  btnPrimary: { background: '#F4821F', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnSecondary: { background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox: { background: '#1f2937', borderRadius: 12, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
  modalTitulo: { fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: '#f9fafb' },
  label: { display: 'block', color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  input: { width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '8px 10px', color: '#f9fafb', fontSize: 14, boxSizing: 'border-box' },
  sugerencias: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #374151', borderRadius: 6, zIndex: 50, maxHeight: 200, overflowY: 'auto' },
  sugerencia: { padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sugerenciaSub: { fontSize: 11, color: '#6b7280' },
  materialSeleccionado: { fontSize: 11, color: '#10b981', marginTop: 4 },
  tipoBtn: { flex: 1, padding: '9px 14px', borderRadius: 6, border: '1px solid #374151', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tipoBtnActivo: { background: '#1f2937', borderColor: '#F4821F', color: '#F4821F' },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  empty: { color: '#6b7280', textAlign: 'center', padding: 40 },
};
