import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { registrarUsuario, verificarFichaExistente } from '../services/authService';
import { C } from '../theme';

const ROLES = [
  { value: 'mantencion', label: 'Mantención',   color: '#3b82f6', bg: '#dbeafe', icon: '🛠️' },
  { value: 'planta',     label: 'Planta',        color: '#10b981', bg: '#d1fae5', icon: '🏭' },
  { value: 'externos',   label: 'Externos',      color: '#8b5cf6', bg: '#ede9fe', icon: '👷' },
  { value: 'admin',      label: 'Admin',         color: C.primary, bg: '#fff7ed', icon: '💼' },
  { value: 'panol',      label: 'Pañol',         color: '#f59e0b', bg: '#fef3c7', icon: '📦' },
];

const ROL_CFG = Object.fromEntries(ROLES.map(r => [r.value, r]));

const FORM_VACIO = { nombre: '', apellido: '', ficha: '', telefono: '', rol: 'mantencion' };

function RolBadge({ rol }) {
  const cfg = ROL_CFG[rol] || { label: rol, color: '#64748b', bg: '#f1f5f9' };
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.icon} {cfg.label.toUpperCase()}
    </span>
  );
}

function Avatar({ nombre, rol }) {
  const cfg = ROL_CFG[rol] || { color: '#64748b', bg: '#f1f5f9' };
  return (
    <div style={{ width: 44, height: 44, borderRadius: 14, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
      {cfg.icon}
    </div>
  );
}

function FormUsuario({ inicial = FORM_VACIO, onGuardar, onCancelar, guardando, esEdicion }) {
  const [form, setForm] = useState({ ...FORM_VACIO, ...inicial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Rol */}
      <div>
        <div style={sf.label}>ROL</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ROLES.map(r => (
            <button key={r.value} type="button"
              onClick={() => set('rol', r.value)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `2px solid ${form.rol === r.value ? r.color : '#e2e8f0'}`, background: form.rol === r.value ? r.bg : '#fff', color: form.rol === r.value ? r.color : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nombre / Apellido */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={sf.label}>NOMBRE</div>
          <input style={sf.input} placeholder="Ej: Juan" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
        </div>
        <div>
          <div style={sf.label}>APELLIDO</div>
          <input style={sf.input} placeholder="Ej: Pérez" value={form.apellido} onChange={e => set('apellido', e.target.value)} />
        </div>
      </div>

      {/* Ficha */}
      <div>
        <div style={sf.label}>NÚMERO DE FICHA</div>
        <input style={sf.input} placeholder="4 dígitos" value={form.ficha}
          onChange={e => set('ficha', e.target.value.replace(/\D/g, ''))} maxLength={4}
          disabled={esEdicion} />
        {esEdicion && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>La ficha no se puede modificar</div>}
      </div>

      {/* Teléfono */}
      <div>
        <div style={sf.label}>TELÉFONO (sin 569)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRight: 'none', borderRadius: '10px 0 0 10px', padding: '10px 12px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>+569</span>
          <input style={{ ...sf.input, borderRadius: '0 10px 10px 0', borderLeft: 'none' }} placeholder="XXXXXXXX"
            value={form.telefono} onChange={e => set('telefono', e.target.value.replace(/\D/g, ''))} maxLength={8} />
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={onCancelar} style={sf.cancelBtn}>Cancelar</button>
        <button
          onClick={() => onGuardar(form)}
          disabled={guardando || !form.nombre.trim() || !form.apellido.trim() || !form.ficha.trim()}
          style={{ ...sf.saveBtn, opacity: (guardando || !form.nombre.trim() || !form.apellido.trim() || !form.ficha.trim()) ? 0.6 : 1 }}
        >
          {guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
        </button>
      </div>
    </div>
  );
}

export default function GestionUsuarios() {
  const [usuarios,    setUsuarios]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filtroRol,   setFiltroRol]   = useState('todos');
  const [busqueda,    setBusqueda]    = useState('');
  const [showAdd,     setShowAdd]     = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [guardando,   setGuardando]   = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), orderBy('nombre'));
    const unsub = onSnapshot(q, snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtrados = usuarios
    .filter(u => filtroRol === 'todos' || (u.rol || '').toLowerCase() === filtroRol)
    .filter(u => {
      if (!busqueda) return true;
      const b = busqueda.toLowerCase();
      return (u.nombre + ' ' + u.apellido).toLowerCase().includes(b) || String(u.ficha).includes(b);
    });

  const conteos = ROLES.reduce((acc, r) => {
    acc[r.value] = usuarios.filter(u => (u.rol || '').toLowerCase() === r.value).length;
    return acc;
  }, {});

  async function handleCrear(form) {
    setGuardando(true);
    try {
      const fichaExiste = await verificarFichaExistente(form.ficha);
      if (fichaExiste) { alert('Esa ficha ya está registrada.'); return; }
      const email    = `ficha_${form.ficha}@prysmian.app`;
      const password = `prysmian_${form.ficha}`;
      await registrarUsuario(email, password, {
        rol:      form.rol,
        nombre:   form.nombre.trim(),
        apellido: form.apellido.trim(),
        ficha:    form.ficha,
        telefono: form.telefono ? `569${form.telefono}` : '',
        creadoDesde: 'Web Panel',
      });
      setShowAdd(false);
      alert(`✅ Usuario creado. Ficha: ${form.ficha} / Clave: prysmian_${form.ficha}`);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setGuardando(false); }
  }

  async function handleEditar(form) {
    if (!editando) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, 'usuarios', editando.id), {
        nombre:   form.nombre.trim(),
        apellido: form.apellido.trim(),
        rol:      form.rol,
        telefono: form.telefono ? `569${form.telefono}` : editando.telefono || '',
      });
      setEditando(null);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setGuardando(false); }
  }

  async function handleEliminar(u) {
    if (!window.confirm(`¿Eliminar a ${u.nombre} ${u.apellido} (ficha ${u.ficha})?\nEsto elimina su perfil del sistema.`)) return;
    try { await deleteDoc(doc(db, 'usuarios', u.id)); }
    catch (e) { alert('Error: ' + e.message); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Gestión de Usuarios</h1>
          <p style={s.subtitulo}>Administra los perfiles del equipo Prysmian</p>
        </div>
        <button onClick={() => { setShowAdd(v => !v); setEditando(null); }} style={s.addBtn}>
          {showAdd ? '✕ Cancelar' : '+ Nuevo Usuario'}
        </button>
      </header>

      {/* Formulario Nuevo */}
      {showAdd && (
        <div style={s.formBox}>
          <div style={s.formTitle}>Crear nuevo usuario</div>
          <FormUsuario onGuardar={handleCrear} onCancelar={() => setShowAdd(false)} guardando={guardando} esEdicion={false} />
        </div>
      )}

      {/* Contadores por rol */}
      <div style={s.counters}>
        <button onClick={() => setFiltroRol('todos')} style={{ ...s.counterChip, ...(filtroRol === 'todos' ? s.counterChipActive : {}) }}>
          Todos ({usuarios.length})
        </button>
        {ROLES.map(r => (
          <button key={r.value} onClick={() => setFiltroRol(r.value)}
            style={{ ...s.counterChip, ...(filtroRol === r.value ? { ...s.counterChipActive, background: r.bg, color: r.color, borderColor: r.color } : {}) }}>
            {r.icon} {r.label} ({conteos[r.value] || 0})
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ padding: '0 40px 20px' }}>
        <div style={s.searchBox}>
          <span style={{ fontSize: 16, color: '#94a3b8' }}>🔍</span>
          <input style={s.searchInput} placeholder="Buscar por nombre o ficha..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* Lista */}
      <div style={{ padding: '0 40px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>Cargando usuarios...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div>No hay usuarios que coincidan.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtrados.map(u => (
              <div key={u.id} style={s.card}>
                <Avatar nombre={u.nombre} rol={(u.rol || '').toLowerCase()} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.cardNombre}>{u.nombre} {u.apellido}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <RolBadge rol={(u.rol || '').toLowerCase()} />
                    <span style={s.cardDato}>📋 Ficha: <b>{u.ficha}</b></span>
                    {u.telefono && <span style={s.cardDato}>📱 {u.telefono}</span>}
                    {u.email && <span style={s.cardDato}>✉️ {u.email}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => { setEditando(u); setShowAdd(false); }} style={s.editBtn}>✏️ Editar</button>
                  <button onClick={() => handleEliminar(u)} style={s.deleteBtn}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Edición */}
      {editando && (
        <div style={s.overlay} onClick={() => setEditando(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.secondary }}>Editar Usuario</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{editando.nombre} {editando.apellido}</div>
              </div>
              <button onClick={() => setEditando(null)} style={s.closeBtn}>✕</button>
            </div>
            <FormUsuario
              inicial={{
                nombre:   editando.nombre   || '',
                apellido: editando.apellido || '',
                ficha:    editando.ficha    || '',
                telefono: (editando.telefono || '').replace(/^569/, ''),
                rol:      (editando.rol     || 'mantencion').toLowerCase(),
              }}
              onGuardar={handleEditar}
              onCancelar={() => setEditando(null)}
              guardando={guardando}
              esEdicion={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 40px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' },
  titulo:      { margin: 0, fontSize: 22, fontWeight: 900, color: C.secondary },
  subtitulo:   { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  addBtn:      { padding: '10px 22px', background: C.primary, color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  formBox:     { margin: '20px 40px', background: '#fff', borderRadius: 20, padding: 28, border: '2px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
  formTitle:   { fontSize: 15, fontWeight: 800, color: C.secondary, marginBottom: 20 },
  counters:    { display: 'flex', gap: 8, padding: '16px 40px', flexWrap: 'wrap' },
  counterChip: { padding: '7px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' },
  counterChipActive: { background: C.secondary, color: '#fff', borderColor: C.secondary },
  searchBox:   { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '0 16px' },
  searchInput: { flex: 1, border: 'none', padding: '12px 0', color: '#1e293b', fontSize: 14, outline: 'none', background: 'transparent' },
  card:        { background: '#fff', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  cardNombre:  { fontSize: 15, fontWeight: 800, color: C.secondary },
  cardDato:    { fontSize: 12, color: '#64748b' },
  editBtn:     { padding: '7px 14px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#1e293b', cursor: 'pointer' },
  deleteBtn:   { padding: '7px 10px', background: '#fee2e2', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  closeBtn:    { background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, fontSize: 14, cursor: 'pointer', color: '#64748b', fontWeight: 700 },
};

const sf = {
  label:     { fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 1, marginBottom: 6 },
  input:     { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' },
  cancelBtn: { flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' },
  saveBtn:   { flex: 2, padding: '11px', background: C.primary, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' },
};
