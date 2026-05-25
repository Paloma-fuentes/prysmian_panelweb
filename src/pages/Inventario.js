import { useEffect, useMemo, useState } from 'react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';
import {
  escucharMateriales, buscarMateriales, getMateriales,
  editarMaterial, eliminarMaterial, crearMaterial,
} from '../services/inventarioService';

const TIPOS   = ['Correa', 'Banda', 'Rodamiento', 'Aceite / Lubricante', 'Filtro', 'Rep. Mecánico', 'Rep. Eléctrico', 'Herramienta', 'Otro'];
const UNIDADES = ['UND', 'KG', 'MTS', 'LTS'];
const COLORES  = ['Negro', 'Gris', 'Blanco', 'Rojo', 'Verde', 'Azul', 'Naranja', 'Amarillo', 'Café', 'Beige'];

const FORM_VACIO = {
  descripcion: '', codigoSAP: '', categoria: '', maquina: '',
  ubicacion: '', stock: '', puntoReorden: '', unidad: 'UND', fechaIngreso: '',
  correa_desarrollo: '', correa_ancho: '', correa_alturaNum: '',
  correa_alturaUnidad: 'mm', correa_base: '', correa_posicion: '',
  correa_caterpilar: '', correa_colores: [], correa_otroColor: '', correa_detalles: '',
};

function exportarExcel(lista) {
  const header = 'DESCRIPCIÓN;CÓDIGO SAP;CATEGORÍA;UBICACIÓN;STOCK;PUNTO REORDEN;ESTADO';
  const rows = lista.map(m => [
    (m.descripcion || '').replace(/;/g, ','),
    m.codigoSAP || '',
    m.categoria || '',
    (m.ubicacion || '').replace(/;/g, ','),
    m.stock || 0,
    m.puntoReorden || 0,
    (m.stock || 0) === 0 ? 'AGOTADO' : (m.stock || 0) <= (m.puntoReorden || 0) ? 'BAJO' : 'DISPONIBLE',
  ].join(';'));
  const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `inventario_${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Formulario reutilizable (agregar + editar) ───────────────────────────────
function FormRepuesto({ inicial = {}, onGuardar, onCancel, guardando, esEdicion }) {
  const [form, setForm] = useState({ ...FORM_VACIO, ...inicial });
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleColor(c) {
    const arr = form.correa_colores || [];
    set('correa_colores', arr.includes(c) ? arr.filter(x => x !== c) : [...arr, c]);
  }
  const esCorrea = form.categoria === 'Correa';

  return (
    <div>
      {/* Nombre */}
      <div style={sf.row}>
        <label style={sf.label}>Nombre del Repuesto *</label>
        <input style={sf.input} placeholder="Ej: Rodamiento 6205 2RS" value={form.descripcion}
          onChange={e => set('descripcion', e.target.value)} />
      </div>

      {/* Código SAP (solo en edición) */}
      {esEdicion && (
        <div style={sf.row}>
          <label style={sf.label}>Código SAP</label>
          <input style={sf.input} value={form.codigoSAP || ''} onChange={e => set('codigoSAP', e.target.value)} />
        </div>
      )}

      {/* Tipo de material */}
      <div style={sf.row}>
        <label style={sf.label}>Tipo de material</label>
        <div style={sf.chipWrap}>
          {TIPOS.map(t => (
            <button key={t} onClick={() => set('categoria', form.categoria === t ? '' : t)}
              style={{ ...sf.chip, ...(form.categoria === t ? sf.chipActive : {}) }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Características de Correa */}
      {esCorrea && (
        <div style={sf.correaBox}>
          <div style={sf.correaTitle}>⛓ Características de Correa</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={sf.label}>Desarrollo (largo total)</label>
              <input style={sf.input} placeholder="Desarrollo (largo t..." value={form.correa_desarrollo}
                onChange={e => set('correa_desarrollo', e.target.value)} />
            </div>
            <div>
              <label style={sf.label}>Ancho</label>
              <input style={sf.input} placeholder="Ancho" value={form.correa_ancho}
                onChange={e => set('correa_ancho', e.target.value)} />
            </div>
          </div>

          <div style={sf.row}>
            <label style={sf.label}>Altura / Espesor</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...sf.input, flex: 1 }} placeholder="Ej: 12" value={form.correa_alturaNum}
                onChange={e => set('correa_alturaNum', e.target.value)} />
              {['mm', 'pulgadas'].map(u => (
                <button key={u} onClick={() => set('correa_alturaUnidad', u)}
                  style={{ ...sf.unitBtn, ...(form.correa_alturaUnidad === u ? sf.unitBtnActive : {}) }}>{u}</button>
              ))}
            </div>
          </div>

          <div style={sf.row}>
            <label style={sf.label}>Base</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Acanalada', 'Lisa'].map(b => (
                <button key={b} onClick={() => set('correa_base', form.correa_base === b ? '' : b)}
                  style={{ ...sf.optBtn, flex: 1, ...(form.correa_base === b ? sf.optBtnActive : {}) }}>{b}</button>
              ))}
            </div>
          </div>

          <div style={sf.row}>
            <label style={sf.label}>Posición en máquina</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Inferior', 'Superior', 'Transmisión'].map(p => (
                <button key={p} onClick={() => set('correa_posicion', form.correa_posicion === p ? '' : p)}
                  style={{ ...sf.optBtn, flex: 1, ...(form.correa_posicion === p ? sf.optBtnActive : {}) }}>{p}</button>
              ))}
            </div>
          </div>

          <div style={sf.row}>
            <label style={sf.label}>Caterpilar</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['De tiro', 'De freno', 'Otro'].map(c => (
                <button key={c} onClick={() => set('correa_caterpilar', form.correa_caterpilar === c ? '' : c)}
                  style={{ ...sf.optBtn, flex: 1, ...(form.correa_caterpilar === c ? sf.optBtnActive : {}) }}>{c}</button>
              ))}
            </div>
          </div>

          <div style={sf.row}>
            <label style={sf.label}>Color</label>
            <div style={sf.chipWrap}>
              {COLORES.map(c => (
                <button key={c} onClick={() => toggleColor(c)}
                  style={{ ...sf.chip, ...((form.correa_colores || []).includes(c) ? sf.chipActive : {}) }}>{c}</button>
              ))}
            </div>
            <input style={{ ...sf.input, marginTop: 8 }} placeholder="Otro color (ej: Terracota)..."
              value={form.correa_otroColor} onChange={e => set('correa_otroColor', e.target.value)} />
          </div>

          <div style={sf.row}>
            <label style={sf.label}>Detalles / Observaciones</label>
            <textarea style={{ ...sf.input, height: 80, resize: 'vertical' }}
              placeholder="Instrucciones de instalación, observaciones importantes..."
              value={form.correa_detalles} onChange={e => set('correa_detalles', e.target.value)} />
          </div>
        </div>
      )}

      {/* Máquina */}
      <div style={sf.row}>
        <label style={sf.label}>Máquina</label>
        <input style={sf.input} placeholder="Seleccionar máquina..." value={form.maquina || ''}
          onChange={e => set('maquina', e.target.value)} />
      </div>

      {/* Ubicación */}
      <div style={sf.row}>
        <label style={sf.label}>Ubicación en bodega</label>
        <input style={sf.input} placeholder="Ej: ESTANTE A-3, RACK B..." value={form.ubicacion || ''}
          onChange={e => set('ubicacion', e.target.value)} />
      </div>

      {/* Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={sf.label}>Stock actual</label>
          <input type="number" style={sf.input} placeholder="Stock actual" value={form.stock}
            onChange={e => set('stock', e.target.value)} />
        </div>
        <div>
          <label style={sf.label}>Stock mínimo</label>
          <input type="number" style={sf.input} placeholder="Stock mínimo" value={form.puntoReorden}
            onChange={e => set('puntoReorden', e.target.value)} />
        </div>
      </div>

      {/* Unidad */}
      <div style={sf.row}>
        <label style={sf.label}>Unidad</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {UNIDADES.map(u => (
            <button key={u} onClick={() => set('unidad', u)}
              style={{ ...sf.unitBtn, flex: 1, ...(form.unidad === u ? sf.unitBtnActive : {}) }}>{u}</button>
          ))}
        </div>
      </div>

      {/* Fecha */}
      <div style={sf.row}>
        <label style={sf.label}>Fecha de ingreso (DD/MM/AAAA)</label>
        <input style={sf.input} placeholder={`Ej: ${new Date().toLocaleDateString('es-CL')}`}
          value={form.fechaIngreso || ''} onChange={e => set('fechaIngreso', e.target.value)} />
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {onCancel && (
          <button onClick={onCancel} style={sf.cancelBtn}>Cancelar</button>
        )}
        <button
          onClick={() => onGuardar(form)}
          disabled={guardando || !form.descripcion.trim()}
          style={{ ...sf.saveBtn, flex: 1, opacity: (guardando || !form.descripcion.trim()) ? 0.6 : 1 }}
        >
          {guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : '🛡 Validar y Guardar'}
        </button>
      </div>
    </div>
  );
}

// ── Tarjeta de material ──────────────────────────────────────────────────────
function MaterialCard({ m, esAdmin, onEdit, onDelete }) {
  const stock = m.stock || 0;
  const min   = m.puntoReorden || 0;
  const stockColor = stock === 0 ? '#ef4444' : stock <= min ? '#f97316' : '#16a34a';

  return (
    <div style={sc.card}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={sc.nombre}>{m.descripcion}</div>
        {m.codigoSAP && <div style={sc.sap}>SAP: {m.codigoSAP}</div>}
        <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: stockColor, fontWeight: 700 }}>
            🗄 Stock: {stock} {m.unidad || 'UND'}
          </span>
          {m.ubicacion && (
            <span style={{ fontSize: 13, color: '#64748b' }}>
              📍 Ubicación: <span style={{ color: C.primary, fontWeight: 700 }}>{m.ubicacion}</span>
            </span>
          )}
        </div>
      </div>
      {esAdmin && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
          <button onClick={() => onEdit({ ...m })} style={sc.editBtn} title="Editar">✏️</button>
          <button onClick={() => onDelete(m)} style={sc.deleteBtn} title="Eliminar">🗑️</button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Inventario({ filtroInicial = 'todos', perfil }) {
  const [materiales,     setMateriales]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [busqueda,       setBusqueda]       = useState('');
  const [filtro,         setFiltro]         = useState(filtroInicial);
  const [pag,            setPag]            = useState(0);
  const [tab,            setTab]            = useState('inventario');
  const [editando,       setEditando]       = useState(null);
  const [cargandoUpdate, setCargandoUpdate] = useState(false);
  const [showAdd,        setShowAdd]        = useState(false);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  const rolActual   = (perfil?.rol || '').toLowerCase();
  const esAdmin     = rolActual === 'admin' || rolActual === 'panol' || rolActual === 'administrador';
  const puedeEditar = rolActual === 'panol';
  const POR_PAG     = 50;

  useEffect(() => { setFiltro(filtroInicial); }, [filtroInicial]);

  useEffect(() => {
    if (filtro === 'todos' && !busqueda) {
      setLoading(true);
      const unsub = escucharMateriales(data => { setMateriales(data); setLoading(false); setPag(0); });
      return () => unsub();
    } else {
      cargar();
    }
  }, [filtro, busqueda]);

  async function cargar() {
    if (!busqueda) setLoading(true);
    const filtros =
      filtro === 'bajoStock' ? { bajoStock: true } :
      filtro === 'conStock'  ? { conStock: true }  :
      filtro === 'sinStock'  ? { sinStock: true }  : {};
    const data = busqueda ? await buscarMateriales(busqueda) : await getMateriales(filtros);
    setMateriales(data); setLoading(false); setPag(0);
  }

  const recientes = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    return materiales.filter(m => {
      const t = m.creadoEn?.toDate ? m.creadoEn.toDate().getTime() : 0;
      return t >= cutoff;
    });
  }, [materiales]);

  async function handleGuardar(form) {
    setCargandoUpdate(true);
    try {
      const { id, ...data } = form;
      await editarMaterial(id, {
        ...data,
        stock: Number(data.stock) || 0,
        puntoReorden: Number(data.puntoReorden) || 0,
        bajoStock: (Number(data.stock) || 0) <= (Number(data.puntoReorden) || 0),
      });
      setEditando(null);
      if (!(filtro === 'todos' && !busqueda)) cargar();
    } catch (e) { alert('Error al actualizar: ' + e.message); }
    finally { setCargandoUpdate(false); }
  }

  async function handleCrear(form) {
    if (!form.descripcion.trim()) return;
    setGuardandoNuevo(true);
    try {
      const matRef = await crearMaterial(form);
      const batch  = writeBatch(db);
      batch.set(doc(collection(db, 'historial')), {
        tipo:        'ingreso',
        solicitudId: '',
        materialId:  matRef.id,
        producto:    form.descripcion.trim(),
        cantidad:    Number(form.stock) || 0,
        maquina:     form.maquina      || 'N/A',
        parteMaquina:'',
        usuario:     perfil?.nombre    || 'Pañol',
        estado:      'ingresado',
        fecha:       serverTimestamp(),
      });
      await batch.commit();
      setShowAdd(false);
    } catch (e) { alert('Error al guardar: ' + e.message); }
    finally { setGuardandoNuevo(false); }
  }

  async function handleEliminar(m) {
    if (!window.confirm(`¿Eliminar "${m.descripcion}"?`)) return;
    try { await eliminarMaterial(m.id); } catch (e) { alert(e.message); }
  }

  const paginados = materiales.slice(pag * POR_PAG, (pag + 1) * POR_PAG);
  const totalPags = Math.ceil(materiales.length / POR_PAG);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Header */}
      <header style={s.header}>
        <h1 style={s.titulo}>Gestión de Inventario</h1>
        {esAdmin && (
          <button onClick={() => exportarExcel(materiales)} style={s.excelBtn}>⬇ Excel</button>
        )}
      </header>

      {/* Tabs */}
      <div style={s.tabBar}>
        {[['inventario', 'Inventario'], ['recientes', 'Recientes (7d)']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...s.tabBtn, ...(tab === id ? s.tabBtnActive : {}) }}>{lbl}</button>
        ))}
      </div>

      {/* ═══ Tab Inventario ══════════════════════════════════════════════════ */}
      {tab === 'inventario' && (
        <div style={s.content}>
          {/* Buscador */}
          <div style={s.searchBox}>
            <span style={{ fontSize: 16, color: '#94a3b8' }}>🔍</span>
            <input style={s.search} placeholder="Buscar por nombre, SAP o ubicación..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>

          {/* Count + Filtros */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 14, color: '#64748b' }}>{materiales.length} repuestos en inventario</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['todos', 'Todos'], ['conStock', 'Con Stock'], ['bajoStock', 'Bajo Stock'], ['sinStock', 'Sin Stock']].map(([val, lbl]) => (
                <button key={val} onClick={() => setFiltro(val)}
                  style={{ ...s.filtroBtn, ...(filtro === val ? s.filtroBtnActive : {}) }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>Cargando inventario...</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {paginados.map(m => (
                  <MaterialCard key={m.id} m={m} esAdmin={puedeEditar} onEdit={setEditando} onDelete={handleEliminar} />
                ))}
                {paginados.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <div>No hay repuestos que coincidan.</div>
                  </div>
                )}
              </div>
              {totalPags > 1 && (
                <div style={s.pagination}>
                  <button style={s.pagBtn} disabled={pag === 0} onClick={() => setPag(p => p - 1)}>Anterior</button>
                  <span style={s.pagInfo}>Página {pag + 1} de {totalPags}</span>
                  <button style={s.pagBtn} disabled={pag >= totalPags - 1} onClick={() => setPag(p => p + 1)}>Siguiente</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ Tab Recientes ═══════════════════════════════════════════════════ */}
      {tab === 'recientes' && (
        <div style={s.content}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            {recientes.length === 0
              ? 'Sin repuestos agregados en los últimos 7 días'
              : `${recientes.length} repuesto${recientes.length !== 1 ? 's' : ''} agregado${recientes.length !== 1 ? 's' : ''} en los últimos 7 días`}
          </div>

          {/* Agregar nuevo repuesto */}
          {puedeEditar && (
            <div style={s.addBox}>
              <button onClick={() => setShowAdd(v => !v)} style={s.addHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: C.primary, fontSize: 20, lineHeight: 1 }}>{showAdd ? '⊖' : '⊕'}</span>
                  <span style={{ color: C.primary, fontWeight: 700, fontSize: 15 }}>Agregar nuevo repuesto</span>
                </div>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{showAdd ? '∧' : '∨'}</span>
              </button>
              {showAdd && (
                <div style={{ padding: '0 20px 24px' }}>
                  <FormRepuesto inicial={{}} onGuardar={handleCrear} onCancel={() => setShowAdd(false)} guardando={guardandoNuevo} esEdicion={false} />
                </div>
              )}
            </div>
          )}

          {/* Lista recientes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {recientes.map(m => (
              <MaterialCard key={m.id} m={m} esAdmin={puedeEditar} onEdit={setEditando} onDelete={handleEliminar} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Modal Edición ═══════════════════════════════════════════════════ */}
      {editando && (
        <div style={s.overlay} onClick={() => setEditando(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.secondary }}>Editar Repuesto</div>
                <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>Los cambios se ven al instante</div>
              </div>
              <button onClick={() => setEditando(null)} style={s.closeBtn}>✕</button>
            </div>
            <FormRepuesto inicial={editando} onGuardar={handleGuardar} guardando={cargandoUpdate} esEdicion={true} />
          </div>
        </div>
      )}

    </div>
  );
}

// ── Estilos página ───────────────────────────────────────────────────────────
const s = {
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 40px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' },
  titulo:       { margin: 0, fontSize: 22, fontWeight: 900, color: C.secondary },
  excelBtn:     { padding: '9px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  tabBar:       { display: 'flex', background: '#fff', borderBottom: '2px solid #e2e8f0', padding: '0 40px' },
  tabBtn:       { padding: '14px 20px', background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: '#64748b', cursor: 'pointer', borderBottom: '3px solid transparent', marginBottom: -2 },
  tabBtnActive: { color: C.primary, borderBottomColor: C.primary },
  content:      { padding: '24px 40px' },
  searchBox:    { display: 'flex', alignItems: 'center', gap: 10, background: '#f1f5f9', borderRadius: 14, padding: '0 16px', marginBottom: 20 },
  search:       { flex: 1, border: 'none', background: 'transparent', padding: '14px 0', fontSize: 14, color: C.secondary, outline: 'none' },
  filtroBtn:    { padding: '7px 16px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  filtroBtnActive: { background: C.secondary, color: '#fff', borderColor: C.secondary },
  pagination:   { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 24, paddingBottom: 40 },
  pagBtn:       { background: '#fff', color: C.secondary, border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 22px', cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  pagInfo:      { color: '#64748b', fontSize: 13 },
  addBox:       { background: '#fff', borderRadius: 16, border: `1px solid #e2e8f0`, overflow: 'hidden' },
  addHeader:    { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal:        { background: '#fff', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' },
  closeBtn:     { width: 34, height: 34, borderRadius: 17, background: '#f1f5f9', border: 'none', fontSize: 16, fontWeight: 700, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};

// ── Estilos tarjeta ──────────────────────────────────────────────────────────
const sc = {
  card:      { background: '#fff', borderRadius: 14, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', gap: 12 },
  nombre:    { fontSize: 15, fontWeight: 800, color: C.secondary, lineHeight: 1.3 },
  sap:       { fontSize: 11, color: '#94a3b8', marginTop: 3, fontFamily: 'monospace' },
  editBtn:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 5px', color: C.primary, opacity: 0.85 },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 5px', color: '#ef4444', opacity: 0.85 },
};

// ── Estilos formulario ───────────────────────────────────────────────────────
const sf = {
  row:         { marginBottom: 16 },
  label:       { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 },
  input:       { width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, color: C.secondary, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' },
  chipWrap:    { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip:        { padding: '7px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  chipActive:  { background: C.secondary, borderColor: C.secondary, color: '#fff', fontWeight: 700 },
  unitBtn:     { padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  unitBtnActive: { background: C.primary, borderColor: C.primary, color: '#fff', fontWeight: 800 },
  optBtn:      { padding: '12px 8px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  optBtnActive: { background: C.secondary, borderColor: C.secondary, color: '#fff', fontWeight: 700 },
  correaBox:   { background: '#f5f3ff', borderRadius: 16, padding: '18px 16px', marginBottom: 16, border: '1px solid #ede9fe' },
  correaTitle: { fontSize: 14, fontWeight: 800, color: '#7c3aed', marginBottom: 16 },
  saveBtn:     { padding: 15, borderRadius: 14, border: 'none', background: C.primary, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', textAlign: 'center' },
  cancelBtn:   { padding: '15px 20px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};
