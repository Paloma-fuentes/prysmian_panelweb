import React, { useEffect, useState } from 'react';
import {
  getSolicitudes, crearSolicitud, editarSolicitud, eliminarSolicitud,
  entregarSolicitud, cancelarSolicitud, aprobarDevolucion, rechazarDevolucion,
  getMaquinas, getUsuariosPanel,
} from '../services/solicitudesService';
import { buscarMateriales } from '../services/inventarioService';

const ESTADOS_COLOR = {
  pendiente: '#f59e0b', entregado: '#10b981', cancelado: '#6b7280',
  devuelto: '#6366f1', rechazado: '#ef4444',
};
const URGENCIA_COLOR = { normal: '#6b7280', urgente: '#f59e0b', critico: '#dc2626' };
const AREAS = ['Bodega Producto Terminado', 'Casino', 'Calidad', 'Planta 1', 'Planta 2', 'Planta 4', 'Administración'];
const MEDIDAS = ['Unidades', 'Metros', 'Kilogramos', 'Litros', 'Rollo', 'Caja', 'Par', 'Juego', 'Otro'];

const VACIO = {
  producto: '', materialId: '', codigoSAP: '', ubicacion: '', medida: '',
  cantidad: 1, maquina: '', area: '', usuario: '', tipo: 'retiro',
  urgencia: 'normal', notas: '',
};

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal, setModal] = useState(false);
  const [modalMode, setModalMode] = useState('crear'); // 'crear' | 'editar'
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [procesando, setProcesando] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    cargar();
    getMaquinas().then(setMaquinas);
    getUsuariosPanel().then(setUsuarios);
  }, []);

  async function cargar() {
    setLoading(true);
    const data = await getSolicitudes(300);
    setSolicitudes(data);
    setLoading(false);
  }

  function abrirCrear() {
    setForm(VACIO); setBusqueda(''); setModalMode('crear'); setEditId(null); setModal(true);
  }

  function abrirEditar(sol) {
    setForm({
      producto: sol.producto || '', materialId: sol.materialId || '',
      codigoSAP: sol.codigoSAP || '', ubicacion: sol.ubicacion || '',
      medida: sol.medida || '', cantidad: sol.cantidad || 1,
      maquina: sol.maquina || '', area: sol.area || '',
      usuario: sol.usuario || '', tipo: sol.tipo || 'retiro',
      urgencia: sol.urgencia || 'normal', notas: sol.notas || '',
    });
    setBusqueda(sol.producto || '');
    setEditId(sol.id);
    setModalMode('editar');
    setModal(true);
  }

  function cerrarModal() { setModal(false); setSugerencias([]); }

  async function handleBuscarProducto(txt) {
    setBusqueda(txt);
    setForm(f => ({ ...f, producto: txt, materialId: '', codigoSAP: '', ubicacion: '' }));
    if (txt.length > 1) {
      const res = await buscarMateriales(txt);
      setSugerencias(res.slice(0, 6));
    } else {
      setSugerencias([]);
    }
  }

  function seleccionarProducto(mat) {
    setBusqueda(mat.descripcion);
    setForm(f => ({
      ...f,
      producto: mat.descripcion,
      materialId: mat.id,
      codigoSAP: mat.codigoSAP || '',
      ubicacion: mat.ubicacion || '',
    }));
    setSugerencias([]);
  }

  function validar() {
    if (!form.producto) return 'Ingresa o busca un producto.';
    if (!form.medida) return 'Selecciona la medida del producto.';
    if (!form.cantidad || Number(form.cantidad) < 1) return 'La cantidad debe ser mayor a 0.';
    if (!form.usuario) return 'Selecciona el usuario solicitante.';
    return null;
  }

  async function guardar() {
    const error = validar();
    if (error) { alert(error); return; }
    setGuardando(true);
    try {
      const datos = { ...form, cantidad: Number(form.cantidad) };
      if (modalMode === 'crear') {
        await crearSolicitud(datos);
      } else {
        await editarSolicitud(editId, datos);
      }
      cerrarModal();
      cargar();
    } finally { setGuardando(false); }
  }

  async function eliminar(sol) {
    const warn = sol.estado === 'entregado' ? '\n⚠️ Esta solicitud ya fue entregada. El stock NO se revertirá.' : '';
    if (!window.confirm(`¿Eliminar esta solicitud de "${sol.producto}"?${warn}`)) return;
    setProcesando(sol.id);
    try { await eliminarSolicitud(sol.id); cargar(); }
    finally { setProcesando(null); }
  }

  async function accion(tipo, sol) {
    setProcesando(sol.id);
    try {
      if (tipo === 'entregar') {
        await entregarSolicitud(sol.id, { materialId: sol.materialId, producto: sol.producto, cantidad: sol.cantidad, maquina: sol.maquina, usuario: sol.usuario });
      } else if (tipo === 'cancelar') {
        if (!window.confirm('¿Cancelar esta solicitud?')) return;
        await cancelarSolicitud(sol.id);
      } else if (tipo === 'aprobar_dev') {
        await aprobarDevolucion(sol.id, { materialId: sol.materialId, producto: sol.producto, cantidad: sol.cantidad, usuario: sol.usuario });
      } else if (tipo === 'rechazar_dev') {
        if (!window.confirm('¿Rechazar esta devolución?')) return;
        await rechazarDevolucion(sol.id);
      }
      cargar();
    } finally { setProcesando(null); }
  }

  const filtradas = filtroEstado === 'todos' ? solicitudes : solicitudes.filter(s => s.estado === filtroEstado);
  const errorValidacion = validar();

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.titulo}>Solicitudes de Material</h1>
        <button style={s.btnPrimary} onClick={abrirCrear}>+ Nueva Solicitud</button>
      </div>

      {/* Filtros */}
      <div style={s.toolbar}>
        {[['todos', 'Todas'], ['pendiente', '⏳ Pendientes'], ['entregado', '✅ Entregadas'],
          ['devuelto', '↩️ Devueltas'], ['cancelado', '🚫 Canceladas'], ['rechazado', '❌ Rechazadas']
        ].map(([val, lbl]) => (
          <button key={val} style={{ ...s.filtroBtn, ...(filtroEstado === val ? s.filtroBtnActivo : {}) }} onClick={() => setFiltroEstado(val)}>{lbl}</button>
        ))}
        <span style={s.total}>{filtradas.length} solicitudes</span>
      </div>

      <div style={s.aviso}>
        ℹ️ El stock <strong>solo se descuenta</strong> al marcar <span style={{ color: '#10b981' }}>Entregado</span>. Las solicitudes <span style={{ color: '#f59e0b' }}>Pendientes</span> son reservas o cotizaciones sin efecto en el inventario.
      </div>

      {/* Tabla */}
      {loading ? <div style={s.loading}>Cargando...</div> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Fecha', 'Urgencia', 'Tipo', 'Producto / SAP', 'Cant.', 'Área / Máquina', 'Usuario', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((sol, i) => {
                const fecha = sol.fechaCreacion?.toDate ? sol.fechaCreacion.toDate().toLocaleString('es-CL') : '—';
                const bloq = procesando === sol.id;
                return (
                  <tr key={sol.id} style={i % 2 === 0 ? s.trPar : {}}>
                    <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 12 }}>{fecha}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: URGENCIA_COLOR[sol.urgencia] || '#6b7280' }}>
                        {sol.urgencia === 'critico' ? '🚨' : sol.urgencia === 'urgente' ? '⚠️' : '•'} {sol.urgencia || 'normal'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: sol.tipo === 'retiro' ? '#dc2626' : '#6366f1' }}>{sol.tipo}</span>
                    </td>
                    <td style={{ ...s.td, maxWidth: 220 }}>
                      <div>{sol.producto}</div>
                      {sol.codigoSAP && <div style={{ fontSize: 11, color: '#6b7280' }}>SAP: {sol.codigoSAP}</div>}
                      {sol.medida && <div style={{ fontSize: 11, color: '#6b7280' }}>{sol.medida}</div>}
                    </td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{sol.cantidad}</td>
                    <td style={s.td}>
                      {sol.area && <div style={{ fontSize: 12 }}>{sol.area}</div>}
                      {sol.maquina && <div style={{ fontSize: 11, color: '#6b7280' }}>{sol.maquina}</div>}
                      {!sol.area && !sol.maquina && '—'}
                    </td>
                    <td style={s.td}>{sol.usuario || '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: ESTADOS_COLOR[sol.estado] || '#6b7280' }}>{sol.estado}</span>
                      {sol.notas && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{sol.notas}</div>}
                    </td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                      {sol.estado === 'pendiente' && sol.tipo === 'retiro' && (
                        <>
                          <button style={s.btnAction} disabled={bloq} onClick={() => accion('entregar', sol)}>✅</button>
                          <button style={{ ...s.btnAction, background: '#374151' }} disabled={bloq} onClick={() => accion('cancelar', sol)}>🚫</button>
                        </>
                      )}
                      {sol.estado === 'pendiente' && sol.tipo === 'devolucion' && (
                        <>
                          <button style={s.btnAction} disabled={bloq} onClick={() => accion('aprobar_dev', sol)}>↩️</button>
                          <button style={{ ...s.btnAction, background: '#374151' }} disabled={bloq} onClick={() => accion('rechazar_dev', sol)}>❌</button>
                        </>
                      )}
                      {sol.estado === 'pendiente' && (
                        <button style={{ ...s.btnAction, background: '#1d4ed8' }} disabled={bloq} onClick={() => abrirEditar(sol)}>✏️</button>
                      )}
                      <button style={{ ...s.btnAction, background: '#7f1d1d' }} disabled={bloq} onClick={() => eliminar(sol)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtradas.length === 0 && <div style={s.empty}>Sin solicitudes</div>}
        </div>
      )}

      {/* Modal crear / editar */}
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div style={s.modalBox}>

            {/* Header modal */}
            <div style={s.modalHeader}>
              <h2 style={s.modalTitulo}>{modalMode === 'crear' ? 'Nueva Solicitud' : 'Editar Solicitud'}</h2>
              <button style={s.btnCerrar} onClick={cerrarModal} title="Cerrar">✕</button>
            </div>

            {/* Tipo + Urgencia */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Tipo de movimiento</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['retiro', '📤 Retiro'], ['devolucion', '↩️ Devolución']].map(([val, lbl]) => (
                    <button key={val} style={{ ...s.tipoBtn, ...(form.tipo === val ? s.tipoBtnActivo : {}) }}
                      onClick={() => setForm(f => ({ ...f, tipo: val }))}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Urgencia</label>
                <select style={s.select} value={form.urgencia} onChange={e => setForm(f => ({ ...f, urgencia: e.target.value }))}>
                  <option value="normal">• Normal</option>
                  <option value="urgente">⚠️ Urgente</option>
                  <option value="critico">🚨 Crítico</option>
                </select>
              </div>
            </div>

            {/* Buscar producto */}
            <div style={{ marginBottom: 14, position: 'relative' }}>
              <label style={s.label}>Producto * <span style={{ color: '#6b7280', fontWeight: 400 }}>(busca por nombre o código SAP)</span></label>
              <input style={s.input} placeholder="Ej: CABLE, RODAMIENTO, SAP-12345..." value={busqueda} onChange={e => handleBuscarProducto(e.target.value)} />
              {sugerencias.length > 0 && (
                <div style={s.sugerencias}>
                  {sugerencias.map(m => (
                    <div key={m.id} style={s.sugerencia} onClick={() => seleccionarProducto(m)}>
                      <span style={{ fontSize: 13 }}>{m.descripcion}</span>
                      <span style={s.sugerenciaSub}>Stock: {m.stock} | {m.codigoSAP || 'Sin SAP'} | {m.ubicacion || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
              {form.materialId && (
                <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
                  ✅ Vinculado — SAP: {form.codigoSAP || 'N/A'} | Ubicación: {form.ubicacion || 'N/A'}
                </div>
              )}
            </div>

            {/* Código SAP + Ubicación (readonly si viene del inventario) */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Código SAP</label>
                <input style={{ ...s.input, background: form.materialId ? '#0f172a' : '#111827', color: form.materialId ? '#6b7280' : '#f9fafb' }}
                  placeholder="Auto desde inventario" value={form.codigoSAP}
                  readOnly={!!form.materialId}
                  onChange={e => !form.materialId && setForm(f => ({ ...f, codigoSAP: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Ubicación en bodega</label>
                <input style={{ ...s.input, background: form.materialId ? '#0f172a' : '#111827', color: form.materialId ? '#6b7280' : '#f9fafb' }}
                  placeholder="Auto desde inventario" value={form.ubicacion}
                  readOnly={!!form.materialId}
                  onChange={e => !form.materialId && setForm(f => ({ ...f, ubicacion: e.target.value }))} />
              </div>
            </div>

            {/* Cantidad + Medida */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Cantidad *</label>
                <input style={s.input} type="number" min="1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Medida *</label>
                <select style={s.select} value={form.medida} onChange={e => setForm(f => ({ ...f, medida: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {MEDIDAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Área + Máquina */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Área <span style={{ color: '#6b7280', fontWeight: 400 }}>(opcional)</span></label>
                <select style={s.select} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}>
                  <option value="">— Seleccionar área —</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Máquina <span style={{ color: '#6b7280', fontWeight: 400 }}>(opcional)</span></label>
                <select style={s.select} value={form.maquina} onChange={e => setForm(f => ({ ...f, maquina: e.target.value }))}>
                  <option value="">— Seleccionar máquina —</option>
                  {maquinas.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="__otro__">Otra (escribir)</option>
                </select>
                {form.maquina === '__otro__' && (
                  <input style={{ ...s.input, marginTop: 6 }} placeholder="Nombre de la máquina" onChange={e => setForm(f => ({ ...f, maquina: e.target.value }))} />
                )}
              </div>
            </div>

            {/* Usuario */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Usuario solicitante *</label>
              {usuarios.length > 0 ? (
                <select style={s.select} value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))}>
                  <option value="">— Seleccionar usuario —</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.nombre || u.email}>{u.nombre || u.email} {u.rol ? `(${u.rol})` : ''}</option>
                  ))}
                </select>
              ) : (
                <input style={s.input} placeholder="Nombre del solicitante" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
              )}
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Notas / Observaciones</label>
              <textarea style={{ ...s.input, height: 64, resize: 'vertical' }} placeholder="Ej: Para cotización, detalle adicional..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>

            {/* Aviso estado */}
            <div style={{ ...s.aviso, borderColor: form.urgencia === 'critico' ? '#dc2626' : form.urgencia === 'urgente' ? '#f59e0b' : '#374151' }}>
              {form.tipo === 'retiro'
                ? '⏳ Se creará como Pendiente. El stock se descuenta SOLO al marcar "Entregar".'
                : '↩️ La devolución sube el stock SOLO al ser aprobada.'}
            </div>

            {/* Error validación */}
            {errorValidacion && <div style={s.errorMsg}>⚠️ {errorValidacion}</div>}

            <div style={s.modalBtns}>
              <button style={s.btnSecondary} onClick={cerrarModal}>Cancelar</button>
              <button style={s.btnPrimary} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : modalMode === 'crear' ? 'Crear Solicitud' : 'Guardar Cambios'}
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
  aviso: { background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#9ca3af', marginBottom: 14 },
  errorMsg: { background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#fca5a5', marginBottom: 12 },
  loading: { color: '#9ca3af', padding: 40, textAlign: 'center' },
  tableWrap: { overflowX: 'auto', background: '#0f172a', borderRadius: 8 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#0f172a' },
  th: { textAlign: 'left', color: '#6b7280', fontSize: 12, fontWeight: 600, padding: '10px 12px', borderBottom: '1px solid #374151', whiteSpace: 'nowrap', background: '#0f172a' },
  td: { padding: '9px 12px', fontSize: 13, color: '#d1d5db', borderBottom: '1px solid #1f2937', background: '#0f172a' },
  trPar: { background: '#111827' },
  badge: { padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 700 },
  btnAction: { background: '#10b981', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 13, marginRight: 3, fontWeight: 600 },
  btnPrimary: { background: '#F4821F', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnSecondary: { background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox: { background: '#1f2937', borderRadius: 12, padding: 28, width: 560, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 18, fontWeight: 700, margin: 0, color: '#f9fafb' },
  btnCerrar: { background: 'none', border: '1px solid #374151', color: '#9ca3af', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  label: { display: 'block', color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  input: { width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '8px 10px', color: '#f9fafb', fontSize: 14, boxSizing: 'border-box' },
  select: { width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '8px 10px', color: '#f9fafb', fontSize: 14, boxSizing: 'border-box' },
  sugerencias: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #374151', borderRadius: 6, zIndex: 50, maxHeight: 200, overflowY: 'auto' },
  sugerencia: { padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1f2937' },
  sugerenciaSub: { display: 'block', fontSize: 11, color: '#6b7280', marginTop: 2 },
  tipoBtn: { flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #374151', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tipoBtnActivo: { background: '#1f2937', borderColor: '#F4821F', color: '#F4821F' },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  empty: { color: '#6b7280', textAlign: 'center', padding: 40 },
};
