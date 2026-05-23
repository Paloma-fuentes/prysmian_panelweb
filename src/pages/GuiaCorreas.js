import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C, G } from '../theme';
import { editarMaterial, eliminarMaterial } from '../services/inventarioService';

const CORREA_BASE     = ['Acanalada', 'Lisa'];
const CORREA_PARTE    = ['Superior', 'Inferior', 'Transmisión', 'Motor', 'Otra'];
const CORREA_CATERPIL = ['De tiro', 'De freno', 'Otro'];
const CORREA_COLORES  = ['Negro', 'Gris', 'Blanco', 'Rojo', 'Verde', 'Azul', 'Naranja', 'Amarillo', 'Café', 'Beige'];

function normalizar(str) {
  return (str || '').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function esCorreaOBanda(m) {
  const tipo = (m.tipoMaterial || '').toLowerCase();
  const desc = normalizar(m.descripcion);
  return tipo === 'correa' || desc.includes('correa') || desc.includes('banda') || desc.includes('belt');
}

// Lógica Inteligente para detectar máquinas en el nombre
function detectarMaquinaEnTexto(texto, maquinaActual) {
  if (maquinaActual && maquinaActual !== 'N/A' && maquinaActual !== 'Sin Máquina Asignada') return maquinaActual;
  
  const raw = (texto || '');
  // Buscar patrones como "Maq 54", "MAQ 54", "Maquina 54", "Maq. 54"
  const match = raw.match(/(?:Maq|Máquina|Maq\.)\s*(\d+)/i);
  if (match) {
    return `Maq ${match[1]}`;
  }
  return 'Sin Máquina Asignada';
}

export default function GuiaCorreas({ perfil }) {
  const rol = (perfil?.rol || '').toLowerCase();
  const esAdmin = rol === 'admin' || rol === 'administrador' || rol === 'panol';

  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMaquina, setFiltroMaquina] = useState('Todas');
  const [soloSinStock, setSoloSinStock]   = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [guardando,  setGuardando] = useState(false);

  function abrirEditar(correa) {
    const c = correa.caracteristicasCorrea || {};
    setModalEdit({
      id:          correa.id,
      descripcion: correa.descripcion || '',
      codigoSAP:   correa.codigoSAP   || '',
      maquinas:    correa.maquinas?.length ? correa.maquinas : (correa.maquina ? [correa.maquina] : []),
      ubicacion:   correa.ubicacion   || '',
      desarrollo:  c.desarrollo    || '',
      ancho:       c.ancho         || '',
      espesor:     c.espesor       || '',
      base:        c.base          || '',
      parte:       c.parte         || '',
      caterpilar:  c.caterpilar    || '',
      colores:     c.colores       || (c.color ? [c.color] : []),
      detalles:    c.detalles      || '',
      maqInput:    '',
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
    finally  { setGuardando(false); }
  }

  async function handleEliminar(correa) {
    if (!window.confirm(`¿Eliminar "${correa.descripcion}" del catálogo?`)) return;
    try { await eliminarMaterial(correa.id); } catch { alert('Error al eliminar.'); }
  }

  useEffect(() => {
    const q = query(collection(db, 'materiales'), orderBy('descripcion'));
    const unsub = onSnapshot(q, (snap) => {
      const mats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const correas = mats.filter(esCorreaOBanda);
      const mapa = {};
      
      correas.forEach(c => {
        // DESIGNACIÓN INTELIGENTE: Si no tiene máquina, la buscamos en el nombre
        let maq = detectarMaquinaEnTexto(c.descripcion, c.maquina);
        
        if (!mapa[maq]) mapa[maq] = [];
        mapa[maq].push(c);
      });

      const listado = Object.entries(mapa)
        .map(([maquina, items]) => ({ 
          maquina, 
          items: items.sort((a, b) => a.descripcion.localeCompare(b.descripcion)) 
        }))
        .sort((a, b) => {
          if (a.maquina === 'Sin Máquina Asignada') return 1;
          if (b.maquina === 'Sin Máquina Asignada') return -1;
          // Ordenar numéricamente si son "Maq X"
          const numA = parseInt(a.maquina.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.maquina.replace(/\D/g, '')) || 0;
          if (numA && numB) return numA - numB;
          return a.maquina.localeCompare(b.maquina);
        });

      setGrupos(listado);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtrados = grupos
    .filter(g => filtroMaquina === 'Todas' || g.maquina === filtroMaquina)
    .map(g => ({
      ...g,
      items: g.items.filter(i => {
        const q = normalizar(busqueda);
        const cumpleBusqueda = !q || normalizar(g.maquina).includes(q) || normalizar(i.descripcion).includes(q) || normalizar(i.codigoSAP).includes(q);
        const cumpleStock = !soloSinStock || (Number(i.stock) || 0) === 0;
        return cumpleBusqueda && cumpleStock;
      })
    }))
    .filter(g => g.items.length > 0);

  const listaMaquinas = ['Todas', ...grupos.map(g => g.maquina)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F4F7FA' }}>
      <header style={{ padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0 }}>Guía Maestra de Correas</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Auto-organización inteligente por número de máquina</p>
        </div>
        <div style={{ display: 'flex', gap: 15 }}>
          <div style={s.statCard}>
            <div style={s.statVal}>{grupos.filter(g => g.maquina !== 'Sin Máquina Asignada').length}</div>
            <div style={s.statLab}>EQUIPOS</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statVal, color: C.error }}>{grupos.reduce((acc, g) => acc + g.items.filter(i => (Number(i.stock)||0)===0).length, 0)}</div>
            <div style={s.statLab}>SIN STOCK</div>
          </div>
        </div>
      </header>

      <div style={{ 
        padding: '24px 40px', 
        background: '#fff', 
        borderBottom: `1px solid ${C.border}`, 
        display: 'grid', 
        gridTemplateColumns: '1fr 280px 220px',
        gap: '24px', 
        alignItems: 'end',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <label style={s.miniLabel}>BÚSQUEDA RÁPIDA</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 18, pointerEvents: 'none', zIndex: 5 }}>🔍</span>
            <input 
              style={{ ...s.filterInput, width: '100%', boxSizing: 'border-box' }} 
              placeholder="Buscar por nombre o SAP..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ minWidth: 0 }}>
          <label style={s.miniLabel}>SALTAR A MÁQUINA</label>
          <select style={{ ...s.select, width: '100%', boxSizing: 'border-box' }} value={filtroMaquina} onChange={e => setFiltroMaquina(e.target.value)}>
            {listaMaquinas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ minWidth: 0 }}>
          <button onClick={() => setSoloSinStock(!soloSinStock)} style={{ ...s.toggleBtn, ...(soloSinStock ? s.toggleBtnAct : {}), width: '100%', margin: 0, boxSizing: 'border-box' }}>
            {soloSinStock ? '🚩 Solo sin stock' : '📦 Mostrar todas'}
          </button>
        </div>
      </div>

      <main style={{ padding: '30px 40px 60px', width: '100%', boxSizing: 'border-box' }}>


        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textSecondary }}>Analizando catálogo...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textLight }}>
             <div style={{fontSize: 60, marginBottom: 20}}>📪</div>
             <p style={{fontSize: 18, fontWeight: 600}}>No hay resultados.</p>
             <button onClick={() => { setFiltroMaquina('Todas'); setSoloSinStock(false); setBusqueda(''); }} style={{ color: C.primary, background: 'none', border: 'none', fontWeight: 800, cursor: 'pointer', marginTop: 10 }}>Limpiar filtros</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {filtrados.map(grupo => (
              <section key={grupo.maquina}>
                <div style={s.sectionHeader}>
                  <div style={{ ...s.maqBadge, background: C.secondary }}>EQUIPO</div>
                  <h2 style={s.maqTitle}>{grupo.maquina}</h2>
                  <div style={s.line} />
                  <div style={s.countBadge}>{grupo.items.length} repuestos</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
                  {grupo.items.map(c => (
                    <CorreaCard key={c.id} correa={c} esAdmin={esAdmin} onEdit={() => abrirEditar(c)} onDelete={() => handleEliminar(c)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* ── Modal edición correa ── */}
      {modalEdit && (
        <div style={ms.overlay} onClick={() => setModalEdit(null)}>
          <div style={ms.box} onClick={e => e.stopPropagation()}>
            <div style={ms.header}>
              <div>
                <h2 style={ms.titulo}>Editar Correa</h2>
                <div style={{ fontSize: 11, color: C.success, marginTop: 2 }}>Los cambios se verán al instante para todos los usuarios</div>
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
                  <input style={{ ...ms.input, marginBottom: 0, width: 150, fontSize: 12 }} placeholder="Agregar máquina..." value={modalEdit.maqInput || ''} onChange={e => setModalEdit(p => ({ ...p, maqInput: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { const m = (modalEdit.maqInput || '').trim(); if (m && !modalEdit.maquinas.includes(m)) setModalEdit(p => ({ ...p, maquinas: [...p.maquinas, m], maqInput: '' })); }}} />
                  <button style={ms.addBtn} onClick={() => { const m = (modalEdit.maqInput || '').trim(); if (m && !modalEdit.maquinas.includes(m)) setModalEdit(p => ({ ...p, maquinas: [...p.maquinas, m], maqInput: '' })); }}>+</button>
                </div>
              </div>

              <FL>Ubicación en bodega</FL>
              <input style={ms.input} value={modalEdit.ubicacion} onChange={e => setModalEdit(p => ({ ...p, ubicacion: e.target.value }))} />

              <div style={{ fontSize: 13, fontWeight: 800, color: C.secondary, margin: '16px 0 8px' }}>📐 Dimensiones (mm)</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {[['Largo/Desarrollo', 'desarrollo'], ['Ancho', 'ancho'], ['Alto/Espesor', 'espesor']].map(([lbl, key]) => (
                  <div key={key} style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: C.textLight, marginBottom: 4 }}>{lbl}</div>
                    <input style={{ ...ms.input, marginBottom: 0 }} placeholder="mm" type="number" value={modalEdit[key]} onChange={e => setModalEdit(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, color: C.secondary, margin: '4px 0 8px' }}>🔩 Características</div>
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
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 4, marginTop: 10 }}>{children}</div>;
}

function CorreaCard({ correa, esAdmin, onEdit, onDelete }) {
  const c = correa.caracteristicasCorrea || {};
  const stock = Number(correa.stock) || 0;
  const hayStock = stock > 0;
  
  return (
    <div style={{ ...G.glass, background: '#fff', borderRadius: 24, padding: '25px', boxShadow: G.cardShadow, borderLeft: `6px solid ${hayStock ? C.success : C.error}`, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: C.secondary, lineHeight: 1.2 }}>{correa.descripcion}</div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 4, fontWeight: 800 }}>SAP: {correa.codigoSAP || 'N/A'}</div>
        </div>
        <div style={{ ...s.stockBadge, background: hayStock ? '#DCFCE7' : '#FEE2E2', color: hayStock ? '#16A34A' : '#DC2626' }}>
          {hayStock ? `${stock} en stock` : 'Sin stock'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={s.infoRow}>
          <div style={s.iconCircle}>📏</div>
          <div style={{ flex: 1 }}>
            <div style={s.infoLab}>DIMENSIONES</div>
            <div style={s.infoVal}>
              {c.desarrollo ? `${c.desarrollo}mm` : '—'} × {c.ancho ? `${c.ancho}mm` : '—'} × {c.espesor ? `${c.espesor}mm` : '—'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
           <div style={s.infoRow}>
              <div style={{ ...s.iconCircle, background: '#F0F9FF' }}>⚙️</div>
              <div>
                <div style={s.infoLab}>PARTE</div>
                <div style={{ ...s.infoVal, color: C.primary }}>{c.parte || 'General'}</div>
              </div>
           </div>
           <div style={s.infoRow}>
              <div style={{ ...s.iconCircle, background: '#FFF7ED' }}>📍</div>
              <div>
                <div style={s.infoLab}>BODEGA</div>
                <div style={s.infoVal}>{correa.ubicacion || '—'}</div>
              </div>
           </div>
        </div>

        {(c.base || c.caterpilar || c.color) && (
          <div style={s.techBox}>
            {c.base && <div style={s.techItem}><b>Base:</b> {c.base}</div>}
            {c.caterpilar && <div style={s.techItem}><b>Caterpilar:</b> {c.caterpilar}</div>}
            {c.color && <div style={s.techItem}><b>Color:</b> {c.color}</div>}
          </div>
        )}

        {c.detalles && (
          <div style={s.noteBox}>
             <span style={{fontSize: 14}}>📝</span>
             <span style={s.noteTxt}>{c.detalles}</span>
          </div>
        )}

        {esAdmin && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button style={s.btnEdit} onClick={onEdit}>✏️ Editar</button>
            <button style={s.btnDel}  onClick={onDelete}>🗑️ Eliminar</button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  statCard: { background: '#fff', padding: '12px 24px', borderRadius: 16, border: `1px solid ${C.border}`, textAlign: 'center', minWidth: 100 },
  statVal: { fontSize: 22, fontWeight: 900, color: C.secondary, lineHeight: 1 },
  statLab: { fontSize: 9, fontWeight: 800, color: C.textLight, marginTop: 4, letterSpacing: 1 },
  filterInput: { width: '100%', padding: '15px 15px 15px 45px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#F8FAFC', outline: 'none', fontSize: 14, fontWeight: 500 },
  select: { width: '100%', padding: '14px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#F8FAFC', outline: 'none', fontSize: 14, fontWeight: 700, color: C.secondary, cursor: 'pointer' },
  miniLabel: { display: 'block', fontSize: 9, fontWeight: 800, color: C.textLight, marginBottom: 5, marginLeft: 5 },
  toggleBtn: { padding: '14px 24px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary, fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: '0.2s' },

  toggleBtnAct: { background: C.error, color: '#fff', borderColor: C.error },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20, marginTop: 10 },
  maqBadge: { color: '#fff', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 8 },
  maqTitle: { fontSize: 20, fontWeight: 900, color: C.secondary, margin: 0 },
  line: { flex: 1, height: 1, background: C.border },
  countBadge: { color: C.textLight, fontSize: 12, fontWeight: 700 },
  stockBadge: { padding: '6px 12px', borderRadius: 12, fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' },
  infoRow: { display: 'flex', alignItems: 'center', gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
  infoLab: { fontSize: 9, fontWeight: 800, color: C.textLight, letterSpacing: 0.5 },
  infoVal: { fontSize: 13, fontWeight: 700, color: C.secondary },
  techBox: { display: 'flex', flexWrap: 'wrap', gap: 8, background: '#F8FAFC', padding: '12px', borderRadius: 14 },
  techItem: { fontSize: 11, color: C.textSecondary },
  noteBox: { display: 'flex', gap: 8, padding: '12px', background: '#FFFBEB', borderRadius: 14, border: '1px solid #FEF3C7' },
  noteTxt: { fontSize: 12, color: '#92400E', fontStyle: 'italic', lineHeight: 1.4 },
  btnEdit: { background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: C.primary },
  btnDel:  { background: 'none', border: '1px solid #fca5a5', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: C.error },
};

const ms = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  box:      { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: `1px solid ${C.border}` },
  titulo:   { fontSize: 18, fontWeight: 800, color: C.secondary, margin: 0 },
  close:    { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textLight },
  body:     { padding: '16px 24px', overflowY: 'auto', flex: 1 },
  input:    { width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', background: C.background, color: C.text, marginBottom: 4, boxSizing: 'border-box' },
  maqChip:  { display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(244,130,31,0.1)', color: C.primary, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  chipX:    { background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontSize: 12, padding: 0 },
  addBtn:   { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', fontSize: 16, cursor: 'pointer' },
  chipRow:  { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip:     { padding: '5px 12px', borderRadius: 20, background: C.background, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, color: C.textSecondary },
  chipA:    { background: C.primary, border: `1px solid ${C.primary}`, color: '#fff', fontWeight: 600 },
  btnGuardar:{ width: '100%', background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },
};
