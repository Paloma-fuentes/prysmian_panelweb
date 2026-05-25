import { useEffect, useRef, useState } from 'react';
import { C } from '../theme';
import {
  suscribirHerramientas, tomarHerramienta, devolverHerramienta,
  agregarHerramienta, editarHerramienta, eliminarHerramienta,
} from '../services/herramientasService';

const CATEGORIAS = ['Eléctrica', 'Mecánica', 'Medición', 'Seguridad', 'Otra'];
const FORM_VACIO = { nombre: '', descripcion: '', categoria: 'Otra', ubicacion: '', cantidadTotal: '1' };

export default function GestionActivos({ perfil, user }) {
  const rol         = (perfil?.rol || '').toLowerCase();
  const esAdmin     = rol === 'admin' || rol === 'administrador' || rol === 'panol';
  const puedeEditar = rol === 'panol';

  const [herramientas,  setHerramientas]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [busqueda,      setBusqueda]      = useState('');
  const [modal,         setModal]         = useState(false);
  const [form,          setForm]          = useState(FORM_VACIO);
  const [editId,        setEditId]        = useState(null);
  const [guardando,     setGuardando]     = useState(false);
  const [modalCantidad, setModalCantidad] = useState(null); // { herramienta, cantidad, max }

  const busqTimerRef = useRef(null);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  useEffect(() => {
    return suscribirHerramientas(lista => {
      setHerramientas(lista);
      setLoading(false);
    });
  }, []);

  const filtradas = herramientas.filter(h => {
    if (!filtroBusqueda.trim()) return true;
    const q = filtroBusqueda.toLowerCase();
    return h.nombre?.toLowerCase().includes(q) ||
           h.categoria?.toLowerCase().includes(q) ||
           h.ubicacion?.toLowerCase().includes(q);
  });

  const totalDisponibles = filtradas.filter(h => (h.cantidadDisponible ?? h.cantidadTotal ?? 1) > 0).length;
  const totalEnUso       = filtradas.filter(h => (h.prestamos?.length ?? 0) > 0).length;

  // ── Tomar ────────────────────────────────────────────────────────────────
  function handleTomar(h) {
    const disponible = h.cantidadDisponible ?? h.cantidadTotal ?? 1;
    if (disponible <= 0) { alert('No hay unidades disponibles.'); return; }
    setModalCantidad({ herramienta: h, cantidad: 1, max: disponible });
  }

  async function confirmarTomar() {
    const { herramienta, cantidad } = modalCantidad;
    setModalCantidad(null);
    const nombreOp = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || user?.email || 'Usuario';
    try {
      await tomarHerramienta(herramienta.id, { uid: user?.uid || '', nombre: nombreOp }, cantidad);
    } catch (e) {
      alert(e.message === 'sin_stock' ? 'No hay suficientes unidades disponibles.' : 'No se pudo registrar. Intenta de nuevo.');
    }
  }

  // ── Devolver ─────────────────────────────────────────────────────────────
  async function handleDevolver(h) {
    const mio = h.prestamos?.find(p => p.uid === user?.uid);
    const cant = mio?.cantidad ?? 1;
    if (!window.confirm(`¿Estás devolviendo ${cant} unidad${cant !== 1 ? 'es' : ''} de "${h.nombre}"?`)) return;
    try {
      await devolverHerramienta(h.id, user?.uid);
    } catch {
      alert('No se pudo registrar la devolución.');
    }
  }

  // ── Formulario admin ──────────────────────────────────────────────────────
  function abrirAgregar() { setEditId(null); setForm(FORM_VACIO); setModal(true); }

  function abrirEditar(h) {
    setEditId(h.id);
    setForm({
      nombre:        h.nombre       || '',
      descripcion:   h.descripcion  || '',
      categoria:     h.categoria    || 'Otra',
      ubicacion:     h.ubicacion    || '',
      cantidadTotal: String(h.cantidadTotal ?? 1),
    });
    setModal(true);
  }

  async function guardar() {
    if (!form.nombre.trim()) { alert('El nombre es obligatorio.'); return; }
    setGuardando(true);
    try {
      if (editId) await editarHerramienta(editId, form);
      else        await agregarHerramienta(form);
      setModal(false);
    } catch { alert('Error al guardar.'); }
    finally   { setGuardando(false); }
  }

  async function handleEliminar(h) {
    if (!window.confirm(`¿Eliminar "${h.nombre}"?`)) return;
    try { await eliminarHerramienta(h.id); } catch { alert('Error al eliminar.'); }
  }

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando herramientas...</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.background, paddingBottom: 60 }}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Activos y Herramientas</h1>
          <p style={s.sub}>Préstamo y control de herramientas en bodega</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ ...s.kpiChip, background: '#dcfce7', color: '#16a34a' }}>
            ✓ {totalDisponibles} con stock
          </div>
          <div style={{ ...s.kpiChip, background: '#fee2e2', color: '#dc2626' }}>
            ⟳ {totalEnUso} en uso
          </div>
          {puedeEditar && (
            <button style={s.btnAdd} onClick={abrirAgregar}>+ Agregar herramienta</button>
          )}
        </div>
      </header>

      {/* Buscador */}
      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          placeholder="Buscar herramienta, categoría o ubicación..."
          value={busqueda}
          onChange={e => {
            setBusqueda(e.target.value);
            clearTimeout(busqTimerRef.current);
            busqTimerRef.current = setTimeout(() => setFiltroBusqueda(e.target.value), 250);
          }}
        />
        {busqueda && (
          <button style={s.clearBtn} onClick={() => { setBusqueda(''); setFiltroBusqueda(''); }}>✕</button>
        )}
      </div>

      {/* Lista */}
      <div style={s.lista}>
        {filtradas.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40 }}>🧰</div>
            <div>{busqueda ? 'Sin resultados.' : 'No hay herramientas registradas aún.'}</div>
            {puedeEditar && !busqueda && (
              <button style={s.btnAdd} onClick={abrirAgregar}>+ Agregar la primera</button>
            )}
          </div>
        ) : (
          filtradas.map(h => {
            const disponible  = h.cantidadDisponible ?? h.cantidadTotal ?? 1;
            const total       = h.cantidadTotal ?? 1;
            const prestamos   = h.prestamos ?? [];
            const miPrestamo  = prestamos.find(p => p.uid === user?.uid);
            const hayDisp     = disponible > 0;
            const agotada     = prestamos.length > 0 && !hayDisp;

            return (
              <div key={h.id} style={{ ...s.card, ...(agotada ? s.cardAgotada : {}) }}>
                <div style={s.cardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={s.nombre}>{h.nombre}</div>
                    {h.descripcion && <div style={s.desc}>{h.descripcion}</div>}
                    {h.ubicacion && (
                      <div style={s.metaRow}>
                        <span style={{ fontSize: 11, color: '#f97316' }}>📍 {h.ubicacion}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={s.catBadge}>{h.categoria || 'Otra'}</span>
                    <span style={{ ...s.stockBadge, background: hayDisp ? '#dcfce7' : '#fee2e2', color: hayDisp ? '#16a34a' : '#dc2626' }}>
                      {disponible}/{total}
                    </span>
                  </div>
                </div>

                {/* Préstamos activos */}
                {prestamos.length > 0 && (
                  <div style={s.prestamosBox}>
                    {prestamos.map((p, i) => {
                      const td = p.tomadaEn?.toDate ? p.tomadaEn.toDate() : (p.tomadaEn instanceof Date ? p.tomadaEn : null);
                      return (
                        <div key={i} style={s.prestamoRow}>
                          <span style={{ color: p.uid === user?.uid ? '#d97706' : '#dc2626', fontSize: 13 }}>●</span>
                          <span style={s.prestamoTxt}>
                            {p.nombre} · {p.cantidad} ud.
                            {td ? ` · desde ${td.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botones de acción */}
                <div style={s.accionRow}>
                  {hayDisp && !miPrestamo && (
                    <button style={s.btnTomar} onClick={() => handleTomar(h)}>
                      ✋ Tomar
                    </button>
                  )}
                  {miPrestamo && (
                    <button style={s.btnDevolver} onClick={() => handleDevolver(h)}>
                      ↩ Devolver ({miPrestamo.cantidad})
                    </button>
                  )}
                  {!hayDisp && !miPrestamo && (
                    <span style={s.btnOcupado}>🔒 Todas las unidades en uso</span>
                  )}
                  {puedeEditar && (
                    <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                      <button style={s.btnEdit} onClick={() => abrirEditar(h)}>✏️</button>
                      <button style={s.btnDel}  onClick={() => handleEliminar(h)}>🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal cantidad al tomar ─────────────────────────────────────────── */}
      {modalCantidad && (
        <div style={s.overlay} onClick={() => setModalCantidad(null)}>
          <div style={s.cantModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: C.secondary, margin: '0 0 6px' }}>
              ¿Cuántas unidades necesitas?
            </h3>
            <div style={{ fontSize: 14, color: C.primary, fontWeight: 700, marginBottom: 4 }}>
              {modalCantidad.herramienta.nombre}
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 20 }}>
              Disponibles: {modalCantidad.max}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
              <button style={s.cantBtn} onClick={() => setModalCantidad(p => p && p.cantidad > 1 ? { ...p, cantidad: p.cantidad - 1 } : p)}>−</button>
              <span style={{ fontSize: 36, fontWeight: 900, color: C.secondary, minWidth: 50, textAlign: 'center' }}>{modalCantidad.cantidad}</span>
              <button style={s.cantBtn} onClick={() => setModalCantidad(p => p && p.cantidad < p.max ? { ...p, cantidad: p.cantidad + 1 } : p)}>+</button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.cantCancel} onClick={() => setModalCantidad(null)}>Cancelar</button>
              <button style={s.cantConfirm} onClick={confirmarTomar}>Tomar {modalCantidad.cantidad}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal formulario admin ──────────────────────────────────────────── */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitulo}>{editId ? 'Editar herramienta' : 'Agregar herramienta'}</h2>
              <button style={s.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <FL>Nombre *</FL>
              <input style={s.input} placeholder="Ej: Torquímetro 1/2" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />

              <FL>Ubicación en bodega</FL>
              <input style={s.input} placeholder="Ej: Estante A-3, Caja azul..." value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} />

              <FL>Cantidad total de unidades</FL>
              <input style={s.input} type="number" min="1" placeholder="1" value={form.cantidadTotal} onChange={e => setForm(p => ({ ...p, cantidadTotal: e.target.value }))} />

              <FL>Descripción (opcional)</FL>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }} placeholder="Detalles, capacidad, modelo..." value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />

              <FL>Categoría</FL>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {CATEGORIAS.map(cat => (
                  <button key={cat}
                    style={{ ...s.chip, ...(form.categoria === cat ? s.chipActive : {}) }}
                    onClick={() => setForm(p => ({ ...p, categoria: cat }))}>
                    {cat}
                  </button>
                ))}
              </div>

              <button style={{ ...s.btnGuardar, opacity: guardando ? 0.6 : 1 }} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Agregar herramienta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FL({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 4, marginTop: 12 }}>{children}</div>;
}

const s = {
  header:     { padding: '36px 48px 24px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  titulo:     { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:        { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  kpiChip:    { padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  btnAdd:     { background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },

  searchBar:  { padding: '14px 48px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', position: 'relative' },
  searchInput:{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 16px', fontSize: 14, outline: 'none', background: C.background },
  clearBtn:   { position: 'absolute', right: 60, background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, fontSize: 16 },

  lista:      { padding: '24px 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  empty:      { gridColumn: '1/-1', textAlign: 'center', padding: 80, color: C.textSecondary, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },

  card:       { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
  cardAgotada:{ borderLeft: '4px solid #ef4444' },
  cardTop:    { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  nombre:     { fontSize: 16, fontWeight: 800, color: C.secondary },
  desc:       { fontSize: 12, color: C.textSecondary, marginTop: 3 },
  metaRow:    { marginTop: 4 },
  catBadge:   { background: `${C.primary}18`, color: C.primary, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  stockBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800 },

  prestamosBox:{ background: '#fef3c7', borderRadius: 10, padding: 10, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  prestamoRow: { display: 'flex', alignItems: 'center', gap: 6 },
  prestamoTxt: { fontSize: 12, color: '#92400e' },

  accionRow:  { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  btnTomar:   { display: 'flex', alignItems: 'center', gap: 5, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnDevolver:{ display: 'flex', alignItems: 'center', gap: 5, background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnOcupado: { fontSize: 12, color: C.textLight, fontStyle: 'italic' },
  btnEdit:    { background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14 },
  btnDel:     { background: 'none', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14 },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },

  cantModal:  { background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360 },
  cantBtn:    { width: 44, height: 44, borderRadius: 22, background: `${C.primary}18`, border: 'none', fontSize: 22, fontWeight: 700, color: C.primary, cursor: 'pointer' },
  cantCancel: { flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#f8fafc', color: C.textSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cantConfirm:{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },

  modalBox:   { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${C.border}` },
  modalTitulo:{ fontSize: 18, fontWeight: 800, color: C.secondary, margin: 0 },
  closeBtn:   { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textLight },
  modalBody:  { padding: '16px 24px 24px', overflowY: 'auto' },

  input:      { width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', background: C.background, color: C.text, boxSizing: 'border-box', marginBottom: 0 },
  chip:       { padding: '7px 16px', borderRadius: 20, background: C.background, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13, color: C.textSecondary },
  chipActive: { background: C.primary, border: `1px solid ${C.primary}`, color: '#fff', fontWeight: 600 },
  btnGuardar: { width: '100%', background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 20 },
};
