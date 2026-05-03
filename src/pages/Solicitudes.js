import { useEffect, useState } from 'react';
import { C } from '../theme';
import {
  getSolicitudes, escucharSolicitudes, crearSolicitud, editarSolicitud, eliminarSolicitud,
  entregarSolicitud, cancelarSolicitud, aprobarDevolucion, rechazarDevolucion,
  retornarSolicitud, getUsuariosPanel,
} from '../services/solicitudesService';
import { buscarMateriales } from '../services/inventarioService';

const ESTADOS_COLOR = {
  pendiente: '#f59e0b', entregado: '#10b981', cancelado: '#6b7280',
  devuelto: '#6366f1', rechazado: '#ef4444', retornado: '#8b5cf6',
};
const URGENCIA_COLOR = { normal: '#6b7280', urgente: '#f59e0b', critico: '#dc2626' };

const AREAS = [
  'Bodega Producto Terminado', 'Casino', 'Calidad',
  'Planta 1', 'Planta 2', 'Planta 3', 'Planta 4', 'Administración', 'Otros',
];

const MEDIDAS = ['Metros', 'Unidad'];

const MAQUINAS = [
  '26 - Trefiladora FX13', '27 - Trefiladora Niehoff M-85',
  '28 - Trefiladora aluminio Itosin', '29 - Trefiladora aluminio',
  '40 - Trefiladora intermedia C-13', '54 - Trefiladora Multihebra Niehoff 14H',
  '55 - Trefiladora Frigecco', '56 - Trefiladora Multihebra Lesmo 16H',
  '80 - Cableadora Planetaria', '82 - Cableadora Rígida',
  '84 - Cableadora NMC 1250', '85 - Cableadora Buncher Lesmo 1600',
  '86 - Cableadora NOVA 1250', '91 - Buncher LESMO 1-760',
  '92 - Buncher LESMO 1-760', '93 - Buncher NIEHOFF',
  '94 - Buncher LESMO 1-630', '96 - Buncher SAMP 1-630',
  '97 - Buncher SAMP 2-630', '98 - Buncher NIEHOFF 2-630',
  '126 - Agua Industrial', '128 - Osmosis',
  '200 - Extrusora POLYMOLD', '204 - Extrusora 4 1/2" FUERZA',
  '206 - Catenaria CCVL-2', '207 - Catenaria CCVL-1',
  '210 - Extrusora DAVIS 4 1/2" FUERZA', '213 - Extrusora ALCAP',
  '215 - Extrusora MAILLEFER', '217 - Extrusora 4 1/2" BW1',
  '218 - Extrusora DAVIS 4 1/2" FUERZA BW2',
  '231 - Planta Buss', '232 - Planta Elastomero',
  '271 - Cableadora Universal',
  '283 - Tejedora WARDWELL 1', '284 - Tejedora WARDWELL 2', '285 - Tejedora',
  '320 - Fraccionadora Lateral 1', '321 - Fraccionadora Lateral 2',
  '322 - Fraccionadora PS-85', '323 - Fraccionadora WINDAK FC5',
  '325 - Embaladora', '326 - Fraccionadora PS-350',
  '327 - Embaladora SKALTEK', '329 - Embaladora PS-250',
  '340 - Embaladora Rebobinadora', '341 - Embaladora Rebobinadora',
  '342 - Embaladora Rebobinadora', '345 - Rebobinadora 4',
  '346 - Embaladora Rebobinadora', '348 - Aplicadora pantalla KABMAK',
  '350 - Aplicadora pantalla Blindatriz',
  '356 - Fraccionadora', '357 - Fraccionadora',
  '620 - Laboratorio RyD', '671 - Recuperadora de Cobre',
  '672 - Recicladora de Cobre', '673 - Taller de utilaje',
  '674 - Calidad', '675 - Equipos de Carga y Transporte',
  'N/A',
];

const VACIO = {
  producto: '', materialId: '', codigoSAP: '', ubicacion: '', medida: '',
  cantidad: 1, _maxStock: null, maquina: '', area: '', usuario: '',
  tipo: 'retiro', urgencia: 'normal', notas: '',
};

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal, setModal] = useState(false);
  const [modalMode, setModalMode] = useState('crear');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [procesando, setProcesando] = useState(null);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    setLoading(true);
    const unsub = escucharSolicitudes(data => {
      setSolicitudes(data);
      setLoading(false);
    });
    getUsuariosPanel().then(setUsuarios);
    return () => unsub();
  }, []);

  async function cargar() {
    const data = await getSolicitudes(300);
    setSolicitudes(data);
  }

  function abrirCrear() {
    setForm(VACIO); setBusqueda(''); setModalMode('crear'); setEditId(null); setModal(true);
  }

  function abrirEditar(sol) {
    setForm({
      producto: sol.producto || '', materialId: sol.materialId || '',
      codigoSAP: sol.codigoSAP || '', ubicacion: sol.ubicacion || '',
      medida: sol.medida || '', cantidad: sol.cantidad || 1, _maxStock: null,
      maquina: sol.maquina || '', area: sol.area || '',
      usuario: sol.usuario || '', tipo: sol.tipo || 'retiro',
      urgencia: sol.urgencia || 'normal', notas: sol.notas || '',
    });
    setBusqueda(sol.producto || '');
    setEditId(sol.id); setModalMode('editar'); setModal(true);
  }

  function cerrarModal() { setModal(false); setSugerencias([]); }

  async function handleBuscarProducto(txt) {
    setBusqueda(txt);
    setForm(f => ({ ...f, producto: txt, materialId: '', codigoSAP: '', ubicacion: '', _maxStock: null }));
    if (txt.length > 1) {
      const res = await buscarMateriales(txt);
      setSugerencias(res.slice(0, 7));
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
      _maxStock: mat.stock ?? null,
      cantidad: 1,
    }));
    setSugerencias([]);
  }

  function validar() {
    if (!form.producto) return 'Ingresa o busca un producto.';
    if (!form.medida) return 'Selecciona la medida del producto.';
    if (!form.cantidad || Number(form.cantidad) < 1) return 'La cantidad debe ser mayor a 0.';
    if (form._maxStock !== null && form.tipo === 'retiro' && Number(form.cantidad) > form._maxStock)
      return `Stock insuficiente. Máximo disponible: ${form._maxStock} ${form.medida || ''}`;
    if (!form.usuario) return 'Selecciona el usuario solicitante.';
    return null;
  }

  async function guardar() {
    const error = validar();
    if (error) { alert(error); return; }
    setGuardando(true);
    try {
      const { _maxStock, ...datos } = form;
      if (modalMode === 'crear') await crearSolicitud({ ...datos, cantidad: Number(datos.cantidad) });
      else await editarSolicitud(editId, { ...datos, cantidad: Number(datos.cantidad) });
      cerrarModal(); cargar();
    } finally { setGuardando(false); }
  }

  async function eliminar(sol) {
    const warn = sol.estado === 'entregado' ? '\n⚠️ Esta solicitud ya fue entregada. El stock NO se revertirá.' : '';
    if (!window.confirm(`¿Eliminar solicitud de "${sol.producto}"?${warn}`)) return;
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
      } else if (tipo === 'retornar') {
        if (!window.confirm(`¿Retornar "${sol.producto}" al stock? (El stock se reintegrará)`)) return;
        await retornarSolicitud(sol.id, { materialId: sol.materialId, producto: sol.producto, cantidad: sol.cantidad, usuario: sol.usuario });
      }
      cargar();
    } finally { setProcesando(null); }
  }

  const filtradas = filtroEstado === 'todos' ? solicitudes : solicitudes.filter(s => s.estado === filtroEstado);
  const errorValidacion = validar();

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.titulo}>Retiros y Solicitudes</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Gestión de retiros de materiales</div>
        </div>
        <button style={s.btnPrimary} onClick={abrirCrear}>+ Nueva Solicitud</button>
      </div>

      <div style={s.toolbar}>
        {[['todos', 'Todas'], ['pendiente', '⏳ Pendientes'], ['entregado', '✅ Entregadas'],
          ['devuelto', '↩️ Devueltas'], ['retornado', '🔄 Retornadas'],
          ['cancelado', '🚫 Canceladas'], ['rechazado', '❌ Rechazadas'],
        ].map(([val, lbl]) => (
          <button key={val} style={{ ...s.filtroBtn, ...(filtroEstado === val ? s.filtroBtnActivo : {}) }} onClick={() => setFiltroEstado(val)}>{lbl}</button>
        ))}
        <span style={s.total}>{filtradas.length} solicitudes</span>
      </div>

      <div style={s.aviso}>
        ℹ️ El stock <strong>solo se descuenta</strong> al marcar <span style={{ color: '#10b981' }}>Entregado</span>.
        Las <span style={{ color: '#f59e0b' }}>Pendientes</span> son reservas sin efecto en inventario.
        El botón <span style={{ color: '#8b5cf6' }}>🔄 Retornar</span> revierte el stock si fue entrega equivocada.
      </div>

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
                      {sol.ubicacion && <div style={{ fontSize: 11, color: '#4b5563' }}>📍 {sol.ubicacion}</div>}
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
                          <button style={s.btnAct} title="Entregar" disabled={bloq} onClick={() => accion('entregar', sol)}>✅</button>
                          <button style={{ ...s.btnAct, background: C.textSecondary }} title="Cancelar" disabled={bloq} onClick={() => accion('cancelar', sol)}>🚫</button>
                        </>
                      )}
                      {sol.estado === 'pendiente' && sol.tipo === 'devolucion' && (
                        <>
                          <button style={s.btnAct} title="Aprobar devolución" disabled={bloq} onClick={() => accion('aprobar_dev', sol)}>↩️</button>
                          <button style={{ ...s.btnAct, background: C.textSecondary }} title="Rechazar" disabled={bloq} onClick={() => accion('rechazar_dev', sol)}>❌</button>
                        </>
                      )}
                      {sol.estado === 'entregado' && (
                        <button style={{ ...s.btnAct, background: '#7c3aed' }} title="Retornar al stock (producto equivocado)" disabled={bloq} onClick={() => accion('retornar', sol)}>🔄</button>
                      )}
                      {sol.estado === 'pendiente' && (
                        <button style={{ ...s.btnAct, background: '#1d4ed8' }} title="Editar" disabled={bloq} onClick={() => abrirEditar(sol)}>✏️</button>
                      )}
                      <button style={{ ...s.btnAct, background: '#7f1d1d' }} title="Eliminar" disabled={bloq} onClick={() => eliminar(sol)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtradas.length === 0 && <div style={s.empty}>Sin solicitudes</div>}
        </div>
      )}

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div style={s.modalBox}>
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
                      <span style={s.sugerenciaSub}>
                        Stock: <strong style={{ color: m.stock === 0 ? '#ef4444' : m.bajoStock ? '#f59e0b' : '#10b981' }}>{m.stock}</strong> | {m.codigoSAP || 'Sin SAP'} | {m.ubicacion || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {form.materialId && (
                <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
                  ✅ Vinculado — SAP: {form.codigoSAP || 'N/A'} | Ubicación: {form.ubicacion || 'N/A'}
                  {form._maxStock !== null && <span style={{ color: '#f59e0b', marginLeft: 8 }}>Stock disponible: {form._maxStock}</span>}
                </div>
              )}
            </div>

            {/* SAP + Ubicación (readonly si viene del inventario) */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Código SAP</label>
                <input style={{ ...s.input, ...(form.materialId ? s.inputReadonly : {}) }}
                  placeholder="Auto desde inventario" value={form.codigoSAP} readOnly={!!form.materialId}
                  onChange={e => !form.materialId && setForm(f => ({ ...f, codigoSAP: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Ubicación en bodega</label>
                <input style={{ ...s.input, ...(form.materialId ? s.inputReadonly : {}) }}
                  placeholder="Auto desde inventario" value={form.ubicacion} readOnly={!!form.materialId}
                  onChange={e => !form.materialId && setForm(f => ({ ...f, ubicacion: e.target.value }))} />
              </div>
            </div>

            {/* Cantidad + Medida */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>
                  Cantidad *
                  {form._maxStock !== null && form.tipo === 'retiro' && (
                    <span style={{ color: '#f59e0b', marginLeft: 6 }}>máx. {form._maxStock}</span>
                  )}
                </label>
                <input style={s.input} type="number" min="1"
                  max={form._maxStock !== null && form.tipo === 'retiro' ? form._maxStock : undefined}
                  value={form.cantidad}
                  onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
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
                  {MAQUINAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Usuario */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Usuario solicitante *</label>
              {usuarios.length > 0 ? (
                <select style={s.select} value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))}>
                  <option value="">— Seleccionar usuario —</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.nombre || u.email}>{u.nombre || u.email}{u.rol ? ` (${u.rol})` : ''}</option>
                  ))}
                </select>
              ) : (
                <input style={s.input} placeholder="Nombre del solicitante" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
              )}
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Notas / Observaciones</label>
              <textarea style={{ ...s.input, height: 60, resize: 'vertical' }} placeholder="Ej: Para cotización, urgente, etc." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>

            <div style={{ ...s.aviso, borderColor: form.urgencia === 'critico' ? '#dc2626' : form.urgencia === 'urgente' ? '#f59e0b' : C.border, marginBottom: errorValidacion ? 8 : 16 }}>
              {form.tipo === 'retiro'
                ? '⏳ Se creará como Pendiente. El stock se descuenta SOLO al marcar "Entregar".'
                : '↩️ La devolución sube el stock SOLO al ser aprobada.'}
            </div>

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
  container:       { color: C.text },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', background: C.secondary },
  titulo:          { fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 },
  toolbar:         { display: 'flex', gap: 8, alignItems: 'center', padding: '14px 24px 10px', flexWrap: 'wrap' },
  filtroBtn:       { padding: '7px 14px', borderRadius: 20, border: `1px solid ${C.border}`, background: C.surface, color: C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  filtroBtnActivo: { background: C.primary, borderColor: C.primary, color: '#fff' },
  total:           { color: C.textLight, fontSize: 13, marginLeft: 'auto' },
  aviso:           { background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', margin: '0 28px 14px' },
  errorMsg:        { background: C.errorLight, border: `1px solid ${C.error}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.error, marginBottom: 12 },
  loading:         { color: C.textLight, padding: 40, textAlign: 'center' },
  tableWrap:       { overflowX: 'auto', margin: '0 0 16px', background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  table:           { width: '100%', borderCollapse: 'collapse' },
  th:              { textAlign: 'left', color: C.textSecondary, fontSize: 11, fontWeight: 700, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', background: C.background, letterSpacing: 0.5 },
  td:              { padding: '10px 14px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` },
  trPar:           { background: C.background },
  badge:           { padding: '2px 8px', borderRadius: 10, color: '#fff', fontSize: 11, fontWeight: 700 },
  btnAct:          { background: C.success, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, marginRight: 3 },
  btnPrimary:      { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnSecondary:    { background: C.border, color: C.text, border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  overlay:         { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox:        { background: C.surface, borderRadius: 16, padding: 28, width: 560, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo:     { fontSize: 18, fontWeight: 700, margin: 0, color: C.text },
  btnCerrar:       { background: 'none', border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16 },
  label:           { display: 'block', color: C.textSecondary, fontSize: 12, marginBottom: 4, fontWeight: 600 },
  input:           { width: '100%', background: C.background, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 14, boxSizing: 'border-box' },
  inputReadonly:   { background: C.border, color: C.textLight, cursor: 'not-allowed' },
  select:          { width: '100%', background: C.background, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 14, boxSizing: 'border-box' },
  sugerencias:     { position: 'absolute', top: '100%', left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 50, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  sugerencia:      { padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.border}` },
  sugerenciaSub:   { display: 'block', fontSize: 11, color: C.textLight, marginTop: 2 },
  tipoBtn:         { flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  tipoBtnActivo:   { background: `${C.primary}15`, borderColor: C.primary, color: C.primary },
  modalBtns:       { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  empty: { color: '#6b7280', textAlign: 'center', padding: 40 },
};
