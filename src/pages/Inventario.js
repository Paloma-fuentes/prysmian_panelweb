import { useEffect, useState } from 'react';
import { C } from '../theme';
import { getMateriales, crearMaterial, actualizarMaterial, eliminarMaterial, buscarMateriales } from '../services/inventarioService';

const VACIO = { descripcion: '', ubicacion: '', stock: 0, puntoReorden: 0, codigoSAP: '', solicitado: false };

export default function Inventario({ filtroInicial = 'todos' }) {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState(filtroInicial);
  const [modal, setModal] = useState(null); // null | 'crear' | 'editar'
  const [form, setForm] = useState(VACIO);
  const [editId, setEditId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [pag, setPag] = useState(0);
  const POR_PAG = 50;

  useEffect(() => { setFiltro(filtroInicial); }, [filtroInicial]);
  useEffect(() => { cargar(); }, [filtro]);

  async function cargar() {
    setLoading(true);
    const filtros =
      filtro === 'bajoStock' ? { bajoStock: true } :
      filtro === 'sinStock' ? { sinStock: true } :
      filtro === 'criticos' ? { criticos: true } :
      filtro === 'conStock' ? { conStock: true } :
      filtro === 'sinRotacion' ? { sinRotacion: true } :
      {};
    const data = await getMateriales(filtros);
    setMateriales(data);
    setLoading(false);
    setPag(0);
  }

  async function handleBuscar(e) {
    const txt = e.target.value;
    setBusqueda(txt);
    if (txt.length > 1) {
      const res = await buscarMateriales(txt);
      setMateriales(res);
    } else if (txt.length === 0) {
      cargar();
    }
  }

  function abrirCrear() { setForm(VACIO); setModal('crear'); }
  function abrirEditar(m) { setForm({ descripcion: m.descripcion, ubicacion: m.ubicacion, stock: m.stock, puntoReorden: m.puntoReorden, codigoSAP: m.codigoSAP || '', solicitado: m.solicitado || false, _stockAnterior: m.stock }); setEditId(m.id); setModal('editar'); }

  async function guardar() {
    setGuardando(true);
    try {
      const { _stockAnterior, ...resto } = form;
      const datos = { ...resto, stock: Number(form.stock), puntoReorden: Number(form.puntoReorden) };
      if (modal === 'crear') await crearMaterial(datos);
      else await actualizarMaterial(editId, datos, { stockAnterior: _stockAnterior, usuario: 'Admin' });
      setModal(null);
      cargar();
    } finally { setGuardando(false); }
  }

  async function eliminar(id, desc) {
    if (!window.confirm(`¿Eliminar "${desc}"?`)) return;
    await eliminarMaterial(id, { descripcion: desc, usuario: 'Admin' });
    cargar();
  }

  const paginados = materiales.slice(pag * POR_PAG, (pag + 1) * POR_PAG);
  const totalPags = Math.ceil(materiales.length / POR_PAG);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.titulo}>Inventario de Materiales</div>
          <div style={s.tituloSub}>Catálogo completo de repuestos</div>
        </div>
        <button style={s.btnPrimary} onClick={abrirCrear}>+ Nuevo Material</button>
      </div>

      {/* Filtros y búsqueda */}
      <div style={s.toolbar}>
        <input style={s.search} placeholder="Buscar descripción, código SAP, ubicación..." value={busqueda} onChange={handleBuscar} />
        <div style={s.filtros}>
          {[
            ['todos', 'Todos'],
            ['conStock', '✅ Con stock'],
            ['bajoStock', '⚠️ Bajo stock'],
            ['sinStock', '❌ Sin stock'],
            ['criticos', '🚨 Críticos'],
            ['sinRotacion', '🔒 Sin rotación'],
          ].map(([val, lbl]) => (
            <button key={val} style={{ ...s.filtroBtn, ...(filtro === val ? s.filtroBtnActivo : {}) }} onClick={() => setFiltro(val)}>{lbl}</button>
          ))}
        </div>
        <span style={s.total}>{materiales.length} productos</span>
      </div>

      {/* Tabla */}
      {loading ? <div style={s.loading}>Cargando...</div> : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Descripción', 'Ubicación', 'Stock', 'Pto. Reorden', 'Cód. SAP', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginados.map((m, i) => (
                  <tr key={m.id} style={i % 2 === 0 ? s.trPar : {}}>
                    <td style={s.td}>{m.descripcion}</td>
                    <td style={s.td}>{m.ubicacion}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: m.stock === 0 ? '#ef4444' : m.bajoStock ? '#f59e0b' : '#10b981' }}>{m.stock}</td>
                    <td style={s.td}>{m.puntoReorden || '—'}</td>
                    <td style={s.td}>{m.codigoSAP || '—'}</td>
                    <td style={s.td}>
                      {m.esCritico ? <span style={{ ...s.badge, background: '#dc2626' }}>CRÍTICO</span>
                        : m.bajoStock ? <span style={{ ...s.badge, background: '#f59e0b' }}>BAJO STOCK</span>
                        : m.stock === 0 ? <span style={{ ...s.badge, background: '#6b7280' }}>SIN STOCK</span>
                        : <span style={{ ...s.badge, background: '#10b981' }}>OK</span>}
                    </td>
                    <td style={s.td}>
                      <button style={s.btnEdit} onClick={() => abrirEditar(m)}>✏️</button>
                      <button style={s.btnDel} onClick={() => eliminar(m.id, m.descripcion)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={s.pag}>
            <button style={s.pagBtn} disabled={pag === 0} onClick={() => setPag(p => p - 1)}>← Anterior</button>
            <span style={s.pagInfo}>Pág {pag + 1} de {totalPags}</span>
            <button style={s.pagBtn} disabled={pag >= totalPags - 1} onClick={() => setPag(p => p + 1)}>Siguiente →</button>
          </div>
        </>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitulo}>{modal === 'crear' ? 'Nuevo Material' : 'Editar Material'}</h2>
            <Campo label="Descripción *" value={form.descripcion} onChange={v => setForm(f => ({ ...f, descripcion: v }))} />
            <Campo label="Ubicación" value={form.ubicacion} onChange={v => setForm(f => ({ ...f, ubicacion: v }))} />
            <div style={s.row2}>
              <Campo label="Stock" value={form.stock} onChange={v => setForm(f => ({ ...f, stock: v }))} type="number" />
              <Campo label="Punto de Reorden" value={form.puntoReorden} onChange={v => setForm(f => ({ ...f, puntoReorden: v }))} type="number" />
            </div>
            <Campo label="Código SAP" value={form.codigoSAP} onChange={v => setForm(f => ({ ...f, codigoSAP: v }))} />
            <label style={s.checkRow}>
              <input type="checkbox" checked={form.solicitado} onChange={e => setForm(f => ({ ...f, solicitado: e.target.checked }))} />
              <span style={{ color: '#d1d5db', marginLeft: 8 }}>Solicitado / Crítico</span>
            </label>
            <div style={s.modalBtns}>
              <button style={s.btnSecondary} onClick={() => setModal(null)}>Cancelar</button>
              <button style={s.btnPrimary} onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', color: C.textSecondary, fontSize: 12, marginBottom: 4, fontWeight: 600 }}>{label}</label>
      <input style={{ width: '100%', background: C.background, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
        type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const s = {
  container:       { color: C.text },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px 16px', background: C.secondary },
  titulo:          { fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 },
  tituloSub:       { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  toolbar:         { display: 'flex', gap: 12, alignItems: 'center', padding: '14px 28px 10px', flexWrap: 'wrap' },
  search:          { flex: 1, minWidth: 200, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '9px 14px', color: C.text, fontSize: 14, outline: 'none' },
  filtros:         { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filtroBtn:       { padding: '7px 14px', borderRadius: 20, border: `1px solid ${C.border}`, background: C.surface, color: C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  filtroBtnActivo: { background: C.primary, borderColor: C.primary, color: '#fff' },
  total:           { color: C.textLight, fontSize: 13 },
  loading:         { color: C.textLight, padding: 40, textAlign: 'center' },
  tableWrap:       { overflowX: 'auto', margin: '0 28px', background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  table:           { width: '100%', borderCollapse: 'collapse' },
  th:              { textAlign: 'left', color: C.textSecondary, fontSize: 11, fontWeight: 700, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', background: C.background, letterSpacing: 0.5 },
  td:              { padding: '10px 14px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` },
  trPar:           { background: C.background },
  badge:           { padding: '2px 8px', borderRadius: 10, color: '#fff', fontSize: 11, fontWeight: 700 },
  btnEdit:         { background: 'none', border: 'none', cursor: 'pointer', marginRight: 6, fontSize: 15 },
  btnDel:          { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 },
  btnPrimary:      { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  btnSecondary:    { background: C.border, color: C.text, border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  pag:             { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, margin: '16px 0 8px' },
  pagBtn:          { background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 13 },
  pagInfo:         { color: C.textLight, fontSize: 13 },
  overlay:         { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox:        { background: C.surface, borderRadius: 16, padding: 28, width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalTitulo:     { fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: C.text },
  row2:            { display: 'flex', gap: 12 },
  checkRow:        { display: 'flex', alignItems: 'center', marginBottom: 16, cursor: 'pointer' },
  modalBtns:       { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
};
