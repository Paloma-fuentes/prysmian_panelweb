import { useEffect, useRef, useState } from 'react';
import { C } from '../theme';
import { escucharEscobillas, agregarEscobilla, editarEscobilla, eliminarEscobilla } from '../services/escobillasService';

const MATERIALES = ['Grafito', 'Grafito-Cobre', 'Grafito-Plata', 'Electrografito', 'Otro'];
const PARTES     = ['Motor principal', 'Alternador', 'Motor auxiliar', 'Compresor', 'Otro'];
const FORM_VACIO = {
  descripcion: '', codigoSAP: '', maquinas: [], material: 'Grafito',
  ancho: '', alto: '', largo: '', voltaje: '', amperaje: '',
  parte: '', stock: '', ubicacion: '', detalles: '',
};

function normalizar(str) {
  return (str || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function GuiaEscobillas({ perfil }) {
  const rol         = (perfil?.rol || '').toLowerCase();
  const esAdmin     = rol === 'admin' || rol === 'administrador' || rol === 'panol';
  const puedeEditar = rol === 'panol';

  const [grupos,      setGrupos]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [busqueda,    setBusqueda]    = useState('');
  const [expandidas,  setExpandidas]  = useState({});
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState(FORM_VACIO);
  const [editId,      setEditId]      = useState(null);
  const [guardando,   setGuardando]   = useState(false);
  const [maquinaInput, setMaquinaInput] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    return escucharEscobillas(lista => {
      setGrupos(construirGrupos(lista));
      setLoading(false);
    });
  }, []);

  function construirGrupos(lista) {
    const porMaquina = {};
    lista.forEach(e => {
      const mqs = e.maquinas?.length ? e.maquinas : ['Sin máquina asignada'];
      mqs.forEach(maq => {
        if (!porMaquina[maq]) porMaquina[maq] = [];
        porMaquina[maq].push(e);
      });
    });
    return Object.entries(porMaquina)
      .map(([maquina, items]) => ({
        maquina,
        sinMaquina: maquina === 'Sin máquina asignada',
        items: items.sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || '')),
      }))
      .sort((a, b) => {
        if (a.sinMaquina) return 1;
        if (b.sinMaquina) return -1;
        return a.maquina.localeCompare(b.maquina);
      });
  }

  const gruposFiltrados = grupos.filter(g => {
    if (!busqueda.trim()) return true;
    const q = normalizar(busqueda);
    return normalizar(g.maquina).includes(q) ||
      g.items.some(e => normalizar(e.descripcion).includes(q) || normalizar(e.codigoSAP || '').includes(q));
  });

  function toggleMaquina(maq) {
    setExpandidas(p => ({ ...p, [maq]: !p[maq] }));
  }

  function abrirAgregar() { setEditId(null); setForm(FORM_VACIO); setModal(true); }

  function abrirEditar(e) {
    setEditId(e.id);
    setForm({
      descripcion: e.descripcion || '',
      codigoSAP:   e.codigoSAP  || '',
      maquinas:    e.maquinas   || [],
      material:    e.material   || 'Grafito',
      ancho:       e.dimensiones?.ancho || '',
      alto:        e.dimensiones?.alto  || '',
      largo:       e.dimensiones?.largo || '',
      voltaje:     e.voltaje    || '',
      amperaje:    e.amperaje   || '',
      parte:       e.parte      || '',
      stock:       String(e.stock ?? ''),
      ubicacion:   e.ubicacion  || '',
      detalles:    e.detalles   || '',
    });
    setModal(true);
  }

  async function guardar() {
    if (!form.descripcion.trim()) return alert('La descripción es obligatoria.');
    setGuardando(true);
    try {
      if (editId) await editarEscobilla(editId, form);
      else        await agregarEscobilla(form);
      setModal(false);
    } catch { alert('Error al guardar.'); }
    finally   { setGuardando(false); }
  }

  async function handleEliminar(e) {
    if (!window.confirm(`¿Eliminar "${e.descripcion}"?`)) return;
    try { await eliminarEscobilla(e.id); } catch { alert('Error al eliminar.'); }
  }

  function agregarMaquinaForm(maq) {
    const m = maq.trim();
    if (!m || form.maquinas.includes(m)) return;
    setForm(p => ({ ...p, maquinas: [...p.maquinas, m] }));
    setMaquinaInput('');
  }

  const totalEscobillas = gruposFiltrados.reduce((s, g) => s + g.items.length, 0);

  if (loading) return <div style={s.loading}>Cargando guía de escobillas...</div>;

  return (
    <div style={s.container}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Guía de Escobillas de Grafito</h1>
          <p style={s.sub}>Catálogo técnico agrupado por máquina</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={s.badge}>{gruposFiltrados.length} máquinas · {totalEscobillas} escobillas</div>
          {puedeEditar && (
            <button style={s.btnAdd} onClick={abrirAgregar}>+ Agregar escobilla</button>
          )}
        </div>
      </header>

      {/* Buscador */}
      <div style={s.searchWrap}>
        <input
          style={s.search}
          placeholder="Buscar por máquina, descripción o SAP..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button style={s.clearBtn} onClick={() => setBusqueda('')}>✕</button>
        )}
      </div>

      {/* Lista de grupos */}
      <div style={s.listWrap}>
        {gruposFiltrados.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40 }}>⚡</div>
            <div>{busqueda ? 'Sin resultados.' : 'No hay escobillas registradas aún.'}</div>
          </div>
        ) : (
          gruposFiltrados.map(g => {
            const abierto = expandidas[g.maquina] !== false;
            return (
              <div key={g.maquina} style={{ ...s.grupoCard, ...(g.sinMaquina ? s.grupoSinMaq : {}) }}>
                <button
                  style={s.grupoHeader}
                  onClick={() => toggleMaquina(g.maquina)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{g.sinMaquina ? '⚠️' : '⚡'}</span>
                    <span style={{ ...s.grupoNombre, ...(g.sinMaquina ? { color: C.warning } : {}) }}>{g.maquina}</span>
                    <span style={{ ...s.grupoBadge, ...(g.sinMaquina ? { background: C.warning } : {}) }}>{g.items.length}</span>
                  </div>
                  <span style={{ color: C.textLight }}>{abierto ? '▲' : '▼'}</span>
                </button>

                {abierto && (
                  <div style={s.grupoItems}>
                    {g.items.map(item => {
                      const hayStock = (item.stock ?? 0) > 0;
                      const d = item.dimensiones || {};
                      const dims = [d.largo && `${d.largo}mm L`, d.ancho && `${d.ancho}mm A`, d.alto && `${d.alto}mm H`].filter(Boolean).join(' × ');
                      return (
                        <div key={item.id} style={{ ...s.card, borderLeftColor: hayStock ? C.success : C.error }}>
                          <div style={s.cardTop}>
                            <div style={{ flex: 1 }}>
                              <div style={s.cardNombre}>{item.descripcion}</div>
                              {item.codigoSAP && <div style={s.cardSap}>SAP: {item.codigoSAP}</div>}
                            </div>
                            <span style={{ ...s.stockBadge, background: hayStock ? '#dcfce7' : '#fee2e2', color: hayStock ? '#16a34a' : '#dc2626' }}>
                              {hayStock ? `${item.stock} en stock` : 'Sin stock'}
                            </span>
                          </div>
                          {item.material && <DetRow icon="🔮" text={`Material: ${item.material}`} color="#8b5cf6" />}
                          {dims && <DetRow icon="📐" text={dims} />}
                          {item.parte && <DetRow icon="⚙️" text={item.parte} color={C.primary} bold />}
                          {(item.voltaje || item.amperaje) && <DetRow icon="🔋" text={[item.voltaje && `${item.voltaje}V`, item.amperaje && `${item.amperaje}A`].filter(Boolean).join(' · ')} />}
                          {item.ubicacion && <DetRow icon="📍" text={`Bodega: ${item.ubicacion}`} color="#f97316" />}
                          {item.detalles && <DetRow icon="📄" text={item.detalles} />}
                          {puedeEditar && (
                            <div style={s.adminRow}>
                              <button style={s.btnEdit} onClick={() => abrirEditar(item)}>✏️ Editar</button>
                              <button style={s.btnDel}  onClick={() => handleEliminar(item)}>🗑️ Eliminar</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal agregar/editar */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitulo}>{editId ? 'Editar escobilla' : 'Agregar escobilla'}</h2>
              <button style={s.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>

            <div style={s.modalBody}>
              <FL>Descripción *</FL>
              <input style={s.input} placeholder="Ej: Escobilla grafito motor 8x10x25mm" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />

              <FL>Código SAP</FL>
              <input style={s.input} placeholder="Opcional" value={form.codigoSAP} onChange={e => setForm(p => ({ ...p, codigoSAP: e.target.value }))} />

              <FL>Máquinas asignadas</FL>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {form.maquinas.map((m, i) => (
                  <span key={i} style={s.maqChip}>
                    {m}
                    <button style={s.chipX} onClick={() => setForm(p => ({ ...p, maquinas: p.maquinas.filter((_, j) => j !== i) }))}>✕</button>
                  </span>
                ))}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    style={{ ...s.input, marginBottom: 0, width: 160, fontSize: 12 }}
                    placeholder="Nombre de máquina..."
                    value={maquinaInput}
                    onChange={e => setMaquinaInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') agregarMaquinaForm(maquinaInput); }}
                  />
                  <button style={s.btnAdd} onClick={() => agregarMaquinaForm(maquinaInput)}>+</button>
                </div>
              </div>

              <FL>Material</FL>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {MATERIALES.map(m => (
                  <button key={m} style={{ ...s.chip, ...(form.material === m ? s.chipActive : {}) }} onClick={() => setForm(p => ({ ...p, material: m }))}>{m}</button>
                ))}
              </div>

              <FL>Dimensiones (mm)</FL>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[['Largo', 'largo'], ['Ancho', 'ancho'], ['Alto', 'alto']].map(([lbl, key]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <div style={s.dimLbl}>{lbl}</div>
                    <input style={{ ...s.input, marginBottom: 0 }} placeholder="mm" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} type="number" />
                  </div>
                ))}
              </div>

              <FL>Parte de la máquina</FL>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {PARTES.map(pt => (
                  <button key={pt} style={{ ...s.chip, ...(form.parte === pt ? s.chipActive : {}) }} onClick={() => setForm(p => ({ ...p, parte: pt }))}>{pt}</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}><FL>Voltaje</FL><input style={s.input} placeholder="Ej: 220V" value={form.voltaje} onChange={e => setForm(p => ({ ...p, voltaje: e.target.value }))} /></div>
                <div style={{ flex: 1 }}><FL>Amperaje</FL><input style={s.input} placeholder="Ej: 15A" value={form.amperaje} onChange={e => setForm(p => ({ ...p, amperaje: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}><FL>Stock</FL><input style={s.input} placeholder="0" type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} /></div>
                <div style={{ flex: 1 }}><FL>Ubicación bodega</FL><input style={s.input} placeholder="Estante..." value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} /></div>
              </div>

              <FL>Detalles adicionales</FL>
              <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} placeholder="Notas, instrucciones, observaciones..." value={form.detalles} onChange={e => setForm(p => ({ ...p, detalles: e.target.value }))} />

              <button style={{ ...s.btnGuardar, opacity: guardando ? 0.6 : 1 }} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Agregar escobilla')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetRow({ icon, text, color, bold }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: color || C.textSecondary, fontWeight: bold ? 600 : 400 }}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function FL({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 4, marginTop: 12 }}>{children}</div>;
}

const s = {
  container: { minHeight: '100vh', background: C.background, paddingBottom: 60 },
  loading:   { padding: 100, textAlign: 'center', fontSize: 16, color: C.textSecondary },
  header:    { padding: '36px 48px 28px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titulo:    { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:       { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  badge:     { background: 'rgba(139,92,246,0.1)', color: '#7c3aed', padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800 },
  btnAdd:    { background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },

  searchWrap: { padding: '16px 48px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', position: 'relative' },
  search:     { flex: 1, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 16px', fontSize: 14, outline: 'none', background: C.background },
  clearBtn:   { position: 'absolute', right: 60, background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, fontSize: 16 },

  listWrap:   { padding: '24px 48px' },
  empty:      { textAlign: 'center', padding: 80, color: C.textSecondary, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },

  grupoCard:    { background: '#fff', borderRadius: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' },
  grupoSinMaq:  { border: `2px dashed ${C.warning}` },
  grupoHeader:  { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${C.border}` },
  grupoNombre:  { fontSize: 16, fontWeight: 800, color: C.secondary },
  grupoBadge:   { background: '#8b5cf6', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  grupoItems:   { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 },

  card:       { background: '#f8fafc', borderRadius: 12, padding: 16, borderLeft: '4px solid' },
  cardTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 },
  cardNombre: { fontSize: 14, fontWeight: 800, color: C.secondary },
  cardSap:    { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  stockBadge: { padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  adminRow:   { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' },
  btnEdit:    { background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: C.primary },
  btnDel:     { background: 'none', border: `1px solid #fca5a5`, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: C.error },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalBox:   { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${C.border}` },
  modalTitulo:{ fontSize: 18, fontWeight: 800, color: C.secondary, margin: 0 },
  closeBtn:   { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textLight },
  modalBody:  { padding: '16px 24px', overflowY: 'auto', flex: 1 },

  input:     { width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', background: C.background, color: C.text, marginBottom: 0, boxSizing: 'border-box' },
  dimLbl:    { fontSize: 11, color: C.textLight, marginBottom: 4 },
  maqChip:   { display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(244,130,31,0.1)', color: C.primary, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  chipX:     { background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontSize: 12, padding: 0, lineHeight: 1 },
  chip:      { padding: '6px 14px', borderRadius: 20, background: C.background, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, color: C.textSecondary },
  chipActive:{ background: '#8b5cf6', border: '1px solid #8b5cf6', color: '#fff', fontWeight: 600 },
  btnGuardar:{ width: '100%', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },
};
