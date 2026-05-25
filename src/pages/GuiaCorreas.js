import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';
import { editarMaterial, eliminarMaterial } from '../services/inventarioService';

const CORREA_BASE     = ['Acanalada', 'Lisa'];
const CORREA_PARTE    = ['Superior', 'Inferior', 'Transmisión', 'Motor', 'Otra'];
const CORREA_CATERPIL = ['De tiro', 'De freno', 'Otro'];
const CORREA_COLORES  = ['Negro', 'Gris', 'Blanco', 'Rojo', 'Verde', 'Azul', 'Naranja', 'Amarillo', 'Café', 'Beige'];

function normalizar(str) {
  return (str || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function esCorreaOBanda(m) {
  const tipo = (m.tipoMaterial || m.categoria || '').toLowerCase();
  const desc = normalizar(m.descripcion);
  return tipo === 'correa' || tipo === 'banda' || desc.includes('correa') || desc.includes('banda') || desc.includes('belt');
}

function detectarMaquina(texto, maquinaActual) {
  if (maquinaActual && maquinaActual !== 'N/A' && maquinaActual !== 'Sin máquina asignada') return maquinaActual;
  const match = (texto || '').match(/(?:Maq|Máquina|Maq\.)\s*(\d+)/i);
  if (match) return `Maq ${match[1]}`;
  return 'Sin máquina asignada';
}

export default function GuiaCorreas({ perfil }) {
  const rol         = (perfil?.rol || '').toLowerCase();
  const esAdmin     = rol === 'admin' || rol === 'administrador' || rol === 'panol';
  const puedeEditar = rol === 'panol';

  const [grupos,     setGrupos]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [busqueda,   setBusqueda]   = useState('');
  const [expandidos, setExpandidos] = useState(new Set());
  const [modalEdit,  setModalEdit]  = useState(null);
  const [guardando,  setGuardando]  = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'materiales'), orderBy('descripcion'));
    const unsub = onSnapshot(q, snap => {
      const mats   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const correas = mats.filter(esCorreaOBanda);
      const mapa   = {};
      correas.forEach(c => {
        const maq = detectarMaquina(c.descripcion, c.maquina);
        if (!mapa[maq]) mapa[maq] = [];
        mapa[maq].push(c);
      });
      const listado = Object.entries(mapa)
        .map(([maquina, items]) => ({ maquina, items: items.sort((a, b) => a.descripcion.localeCompare(b.descripcion)) }))
        .sort((a, b) => {
          if (a.maquina === 'Sin máquina asignada') return 1;
          if (b.maquina === 'Sin máquina asignada') return -1;
          const nA = parseInt(a.maquina.replace(/\D/g, '')) || 0;
          const nB = parseInt(b.maquina.replace(/\D/g, '')) || 0;
          if (nA && nB) return nA - nB;
          return a.maquina.localeCompare(b.maquina);
        });
      setGrupos(listado);
      setExpandidos(new Set(listado.map(g => g.maquina)));
      setLoading(false);
    });
    return unsub;
  }, []);

  function toggleGrupo(maquina) {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(maquina) ? next.delete(maquina) : next.add(maquina);
      return next;
    });
  }

  function abrirEditar(correa) {
    const c = correa.caracteristicasCorrea || {};
    setModalEdit({
      id: correa.id, descripcion: correa.descripcion || '',
      codigoSAP: correa.codigoSAP || '',
      maquinas: correa.maquinas?.length ? correa.maquinas : (correa.maquina ? [correa.maquina] : []),
      ubicacion: correa.ubicacion || '',
      desarrollo: c.desarrollo || '', ancho: c.ancho || '', espesor: c.espesor || '',
      base: c.base || '', parte: c.parte || '', caterpilar: c.caterpilar || '',
      colores: c.colores || (c.color ? [c.color] : []),
      detalles: c.detalles || '', maqInput: '',
    });
  }

  async function guardarEdicion() {
    if (!modalEdit.descripcion.trim()) return alert('El nombre es obligatorio.');
    setGuardando(true);
    try {
      await editarMaterial(modalEdit.id, {
        descripcion: modalEdit.descripcion.trim(),
        codigoSAP:   modalEdit.codigoSAP.trim(),
        maquinas:    modalEdit.maquinas,
        maquina:     modalEdit.maquinas[0] || '',
        ubicacion:   modalEdit.ubicacion.trim(),
        caracteristicasCorrea: {
          desarrollo: modalEdit.desarrollo, ancho: modalEdit.ancho,
          espesor: modalEdit.espesor, base: modalEdit.base,
          parte: modalEdit.parte, caterpilar: modalEdit.caterpilar,
          colores: modalEdit.colores, detalles: modalEdit.detalles,
        },
      });
      setModalEdit(null);
    } catch { alert('Error al guardar.'); }
    finally { setGuardando(false); }
  }

  async function handleEliminar(correa) {
    if (!window.confirm(`¿Eliminar "${correa.descripcion}"?`)) return;
    try { await eliminarMaterial(correa.id); } catch { alert('Error al eliminar.'); }
  }

  const q = normalizar(busqueda);
  const filtrados = grupos
    .map(g => ({
      ...g,
      items: g.items.filter(i =>
        !q || normalizar(g.maquina).includes(q) || normalizar(i.descripcion).includes(q) || normalizar(i.codigoSAP || '').includes(q)
      ),
    }))
    .filter(g => g.items.length > 0);

  const totalCorreas  = grupos.reduce((s, g) => s + g.items.length, 0);
  const totalMaquinas = grupos.filter(g => g.maquina !== 'Sin máquina asignada').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>

      {/* Header */}
      <header style={s.header}>
        <div style={{ flex: 1 }}>
          <h1 style={s.titulo}>Guía de Correas</h1>
          <p style={s.sub}>Los cambios se propagan al instante a todos los usuarios.</p>
        </div>
        <div style={s.realtime}>
          <div style={s.dot} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Tiempo real</span>
        </div>
      </header>

      {/* Buscador + contador */}
      <div style={{ padding: '16px 40px 0' }}>
        <div style={s.searchBox}>
          <span style={{ color: '#94a3b8', fontSize: 16 }}>🔍</span>
          <input style={s.search} placeholder="Buscar correa, banda, SAP o máquina..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8, marginBottom: 16 }}>
          {totalMaquinas} máquinas · {totalCorreas} correas
        </div>
      </div>

      {/* Lista de grupos */}
      <div style={{ padding: '0 40px 60px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>Cargando catálogo...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📪</div>
            <div>No hay resultados para "{busqueda}"</div>
          </div>
        ) : filtrados.map(grupo => {
          const abierto = expandidos.has(grupo.maquina);
          const esSinMaq = grupo.maquina === 'Sin máquina asignada';
          return (
            <div key={grupo.maquina} style={s.grupoBox}>
              {/* Cabecera del grupo */}
              <button onClick={() => toggleGrupo(grupo.maquina)} style={s.grupoHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🔧</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.secondary }}>{grupo.maquina}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={s.countBadge}>{grupo.items.length}</span>
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>{abierto ? '∧' : '∨'}</span>
                </div>
              </button>

              {/* Items del grupo */}
              {abierto && (
                <div style={{ padding: '0 16px 16px' }}>
                  {grupo.items.map(correa => (
                    <CorreaCard
                      key={correa.id}
                      correa={correa}
                      esAdmin={puedeEditar}
                      onEdit={() => abrirEditar(correa)}
                      onDelete={() => handleEliminar(correa)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal edición */}
      {modalEdit && (
        <div style={ms.overlay} onClick={() => setModalEdit(null)}>
          <div style={ms.box} onClick={e => e.stopPropagation()}>
            <div style={ms.header}>
              <div>
                <h2 style={ms.titulo}>Editar Correa</h2>
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>Los cambios se verán al instante</div>
              </div>
              <button style={ms.close} onClick={() => setModalEdit(null)}>✕</button>
            </div>
            <div style={ms.body}>
              <FL>Nombre / Descripción *</FL>
              <input style={ms.input} value={modalEdit.descripcion} onChange={e => setModalEdit(p => ({ ...p, descripcion: e.target.value }))} />

              <FL>Código SAP</FL>
              <input style={ms.input} value={modalEdit.codigoSAP} onChange={e => setModalEdit(p => ({ ...p, codigoSAP: e.target.value }))} />

              <FL>Máquinas asignadas</FL>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {modalEdit.maquinas.map((m, i) => (
                  <span key={i} style={ms.maqChip}>
                    {m}
                    <button style={ms.chipX} onClick={() => setModalEdit(p => ({ ...p, maquinas: p.maquinas.filter((_, j) => j !== i) }))}>✕</button>
                  </span>
                ))}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...ms.input, marginBottom: 0, width: 150, fontSize: 12 }} placeholder="Agregar máquina..."
                    value={modalEdit.maqInput || ''} onChange={e => setModalEdit(p => ({ ...p, maqInput: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { const m = (modalEdit.maqInput || '').trim(); if (m && !modalEdit.maquinas.includes(m)) setModalEdit(p => ({ ...p, maquinas: [...p.maquinas, m], maqInput: '' })); }}} />
                  <button style={ms.addBtn} onClick={() => { const m = (modalEdit.maqInput || '').trim(); if (m && !modalEdit.maquinas.includes(m)) setModalEdit(p => ({ ...p, maquinas: [...p.maquinas, m], maqInput: '' })); }}>+</button>
                </div>
              </div>

              <FL>Ubicación en bodega</FL>
              <input style={ms.input} value={modalEdit.ubicacion} onChange={e => setModalEdit(p => ({ ...p, ubicacion: e.target.value }))} />

              <div style={{ fontSize: 13, fontWeight: 800, color: C.secondary, margin: '16px 0 8px' }}>📐 Dimensiones (mm)</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {[['Largo/Desarrollo', 'desarrollo'], ['Ancho', 'ancho'], ['Alto/Espesor', 'espesor']].map(([lbl, key]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{lbl}</div>
                    <input style={{ ...ms.input, marginBottom: 0 }} placeholder="mm" type="number" value={modalEdit[key]} onChange={e => setModalEdit(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <FL>Base</FL>
              <div style={ms.chipRow}>{CORREA_BASE.map(b => <button key={b} style={{ ...ms.chip, ...(modalEdit.base === b ? ms.chipA : {}) }} onClick={() => setModalEdit(p => ({ ...p, base: b }))}>{b}</button>)}</div>
              <FL>Parte</FL>
              <div style={ms.chipRow}>{CORREA_PARTE.map(pt => <button key={pt} style={{ ...ms.chip, ...(modalEdit.parte === pt ? ms.chipA : {}) }} onClick={() => setModalEdit(p => ({ ...p, parte: pt }))}>{pt}</button>)}</div>
              <FL>Caterpilar</FL>
              <div style={ms.chipRow}>{CORREA_CATERPIL.map(ct => <button key={ct} style={{ ...ms.chip, ...(modalEdit.caterpilar === ct ? ms.chipA : {}) }} onClick={() => setModalEdit(p => ({ ...p, caterpilar: ct }))}>{ct}</button>)}</div>
              <FL>Colores</FL>
              <div style={ms.chipRow}>{CORREA_COLORES.map(c => { const sel = modalEdit.colores.includes(c); return <button key={c} style={{ ...ms.chip, ...(sel ? ms.chipA : {}) }} onClick={() => setModalEdit(p => ({ ...p, colores: sel ? p.colores.filter(x => x !== c) : [...p.colores, c] }))}>{c}</button>; })}</div>

              <FL>Detalles adicionales</FL>
              <textarea style={{ ...ms.input, minHeight: 70, resize: 'vertical' }} value={modalEdit.detalles} onChange={e => setModalEdit(p => ({ ...p, detalles: e.target.value }))} placeholder="Observaciones, instrucciones..." />

              <button style={{ ...ms.btnGuardar, opacity: guardando ? 0.6 : 1 }} onClick={guardarEdicion} disabled={guardando}>
                {guardando ? 'Guardando...' : '💾 Guardar y publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FL({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4, marginTop: 10 }}>{children}</div>;
}

// ── Tarjeta de correa ────────────────────────────────────────────────────────
function CorreaCard({ correa, esAdmin, onEdit, onDelete }) {
  const c       = correa.caracteristicasCorrea || {};
  const stock   = Number(correa.stock) || 0;
  const hayStock = stock > 0;

  const dimensiones = [
    c.desarrollo ? `${c.desarrollo}mm` : null,
    c.ancho      ? `${c.ancho}mm ancho` : null,
  ].filter(Boolean).join(' × ');

  const coloresStr = (c.colores?.length > 0 ? c.colores : (c.color ? [c.color] : [])).join(', ');

  const caracteristicas = [
    c.base       ? `Base ${c.base}` : null,
    c.caterpilar ? `Caterpilar: ${c.caterpilar}` : null,
    coloresStr   ? `Color: ${coloresStr}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{ ...sc.card, borderLeftColor: hayStock ? '#16a34a' : '#ef4444' }}>
      {/* Fila superior: nombre + stock + acciones */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.secondary, lineHeight: 1.3 }}>
          {correa.descripcion}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {hayStock ? (
            <span style={sc.badgeOk}>✓ {stock}</span>
          ) : (
            <span style={sc.badgeNo}>✗ Sin stock</span>
          )}
          {esAdmin && (
            <>
              <button onClick={onEdit}   style={sc.iconBtn} title="Editar">✏️</button>
              <button onClick={onDelete} style={sc.iconBtn} title="Eliminar">🗑️</button>
            </>
          )}
        </div>
      </div>

      {/* Detalles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13 }}>
        {dimensiones && (
          <div style={{ color: '#64748b' }}>↗ {dimensiones}</div>
        )}
        {caracteristicas && (
          <div style={{ color: '#64748b' }}>🔩 {caracteristicas}</div>
        )}
        {correa.maquina && correa.maquina !== 'Sin máquina asignada' && (
          <div style={{ color: C.primary }}>🔧 Máquina: {correa.maquina}</div>
        )}
        {correa.ubicacion && (
          <div style={{ color: C.primary }}>📍 Bodega: {correa.ubicacion}</div>
        )}
        {c.detalles && (
          <div style={{ color: '#64748b' }}>📄 {c.detalles}</div>
        )}
      </div>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  header:     { padding: '32px 40px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 16 },
  titulo:     { margin: 0, fontSize: 22, fontWeight: 900, color: C.secondary },
  sub:        { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  realtime:   { display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', borderRadius: 20, padding: '6px 12px', flexShrink: 0 },
  dot:        { width: 7, height: 7, borderRadius: 4, background: '#16a34a' },
  searchBox:  { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14, padding: '0 16px', border: '1px solid #e2e8f0' },
  search:     { flex: 1, border: 'none', background: 'transparent', padding: '13px 0', fontSize: 14, color: C.secondary, outline: 'none' },
  grupoBox:   { background: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  grupoHeader:{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
  countBadge: { background: C.primary, color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 800, minWidth: 24, textAlign: 'center' },
};

const sc = {
  card:     { background: '#f8fafc', borderRadius: 12, padding: '12px 14px', borderLeft: '4px solid', marginBottom: 8 },
  badgeOk:  { background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  badgeNo:  { background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  iconBtn:  { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 3px' },
};

const ms = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  box:       { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  titulo:    { fontSize: 18, fontWeight: 800, color: C.secondary, margin: 0 },
  close:     { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' },
  body:      { padding: '16px 24px', overflowY: 'auto', flex: 1 },
  input:     { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', background: '#f8fafc', color: C.secondary, marginBottom: 4, boxSizing: 'border-box' },
  maqChip:  { display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(244,130,31,0.1)', color: C.primary, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  chipX:    { background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontSize: 12, padding: 0 },
  addBtn:   { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', fontSize: 16, cursor: 'pointer' },
  chipRow:  { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip:     { padding: '5px 12px', borderRadius: 20, background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12, color: '#64748b' },
  chipA:    { background: C.primary, border: `1px solid ${C.primary}`, color: '#fff', fontWeight: 600 },
  btnGuardar:{ width: '100%', background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },
};
