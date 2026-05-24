import { useEffect, useState } from 'react';
import { C, G } from '../theme';
import { escucharMateriales, buscarMateriales, getMateriales, editarMaterial, eliminarMaterial } from '../services/inventarioService';

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

export default function Inventario({ filtroInicial = 'todos', perfil }) {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState(filtroInicial);
  const [pag, setPag] = useState(0);
  const [editando, setEditando] = useState(null);
  const [cargandoUpdate, setCargandoUpdate] = useState(false);

  const rolActual = (perfil?.rol || '').toLowerCase();
  const esAdmin = rolActual === 'admin' || rolActual === 'panol' || rolActual === 'administrador';
  const POR_PAG = 50;

  useEffect(() => { setFiltro(filtroInicial); }, [filtroInicial]);

  useEffect(() => {
    if (filtro === 'todos' && !busqueda) {
      setLoading(true);
      const unsub = escucharMateriales(data => {
        setMateriales(data);
        setLoading(false);
        setPag(0);
      });
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
    
    let data;
    if (busqueda) {
      data = await buscarMateriales(busqueda);
    } else {
      data = await getMateriales(filtros);
    }
    
    setMateriales(data);
    setLoading(false);
    setPag(0);
  }

  async function handleGuardar() {
    if (!editando) return;
    setCargandoUpdate(true);
    try {
      const { id, ...data } = editando;
      const finalData = {
        ...data,
        stock: Number(data.stock) || 0,
        puntoReorden: Number(data.puntoReorden) || 0,
        precio: Number(data.precio) || 0,
        bajoStock: (Number(data.stock) || 0) <= (Number(data.puntoReorden) || 0)
      };
      await editarMaterial(id, finalData);
      setEditando(null);
      // No hace falta cargar() si usamos el snapshot en tiempo real, 
      // pero si es manual, llamamos a cargar()
      if (!(filtro === 'todos' && !busqueda)) cargar();
    } catch (e) {
      alert("Error al actualizar: " + e.message);
    } finally {
      setCargandoUpdate(false);
    }
  }

  const paginados = materiales.slice(pag * POR_PAG, (pag + 1) * POR_PAG);
  const totalPags = Math.ceil(materiales.length / POR_PAG);

  return (
    <div style={s.container}>
      {/* ── Header Premium ── */}
      <header style={{ ...s.header, width: '100%', boxSizing: 'border-box' }}>
        <div>
          <h1 style={s.titulo}>Catálogo de Inventario</h1>
          <p style={s.tituloSub}>Consulta de stock y ubicaciones en tiempo real</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={s.countBadge}>{materiales.length} artículos registrados</div>
          {esAdmin && (
            <button onClick={() => exportarExcel(materiales)} style={{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ⬇ Excel
            </button>
          )}
        </div>
      </header>

      {/* ── Barra de Herramientas simplificada ── */}
      <div style={{ ...s.toolbar, width: '100%', boxSizing: 'border-box' }}>
        <div style={s.searchBox}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input 
            style={s.search} 
            placeholder="Buscar por SAP, descripción o ubicación..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
          />
        </div>
        <div style={s.filtros}>
          {[
            ['todos', '📦 Todos'],
            ['conStock', '✅ Disponible'],
            ['bajoStock', '⚠️ Bajo Stock'],
            ['sinStock', '❌ Sin Stock'],
          ].map(([val, lbl]) => (
            <button 
              key={val} 
              style={{ ...s.filtroBtn, ...(filtro === val ? s.filtroBtnActivo : {}) }} 
              onClick={() => setFiltro(val)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabla de Contenido ── */}
      <main style={{ padding: '0 40px 40px' }}>
        {loading ? (
          <div style={s.loading}>Sincronizando inventario...</div>
        ) : (
          <div style={s.tableContainer}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['DESCRIPCIÓN', 'CATEGORÍA', 'UBICACIÓN', 'STOCK', 'PUNTO REORDEN', 'SAP', 'ESTADO', ...(esAdmin ? ['ACCIONES'] : [])].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginados.map((m, i) => (
                  <tr key={m.id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 600, color: C.secondary, width: '25%' }}>{m.descripcion}</td>
                    <td style={{ ...s.td, fontSize: 11, fontWeight: 700, color: C.primary }}>{m.categoria || 'SIN CAT.'}</td>
                    <td style={{ ...s.td, color: C.textSecondary, fontSize: 12 }}>{m.ubicacion || '—'}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: (m.stock||0) === 0 ? C.error : (m.stock||0) <= (m.puntoReorden||0) ? C.warning : C.success }}>
                          {m.stock || 0}
                        </span>
                      </div>
                    </td>
                    <td style={s.td}>{m.puntoReorden || 0}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>{m.codigoSAP || 'N/A'}</td>
                    <td style={s.td}>
                      {(m.stock||0) === 0 ? <span style={s.badgeError}>AGOTADO</span>
                        : (m.stock||0) <= (m.puntoReorden||0) ? <span style={s.badgeWarning}>BAJO</span>
                        : <span style={s.badgeSuccess}>DISP.</span>}
                    </td>
                    {esAdmin && (
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                        <button onClick={() => setEditando({ ...m })} style={s.editBtn} title="Editar">✏️</button>
                        <button onClick={async () => { if (window.confirm(`¿Eliminar "${m.descripcion}"?`)) { try { await eliminarMaterial(m.id); } catch(e) { alert(e.message); } } }} style={s.editBtn} title="Eliminar">🗑️</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPags > 1 && (
          <div style={s.pagination}>
            <button style={s.pagBtn} disabled={pag === 0} onClick={() => setPag(p => p - 1)}>Anterior</button>
            <div style={s.pagInfo}>Página <b>{pag + 1}</b> de {totalPags}</div>
            <button style={s.pagBtn} disabled={pag >= totalPags - 1} onClick={() => setPag(p => p + 1)}>Siguiente</button>
          </div>
        )}
      </main>

      {/* ── Modal de Edición ── */}
      {editando && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25 }}>
              <h3 style={{ margin: 0, fontWeight: 900, color: C.secondary }}>Editar Material</h3>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={s.label}>DESCRIPCIÓN</label>
                <input style={s.input} value={editando.descripcion} onChange={e => setEditando({...editando, descripcion: e.target.value})} />
              </div>
              <div>
                <label style={s.label}>CATEGORÍA</label>
                <select style={s.input} value={editando.categoria || ''} onChange={e => setEditando({...editando, categoria: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  <option value="Mecánica">Mecánica</option>
                  <option value="Eléctrica">Eléctrica</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Neumática">Neumática</option>
                  <option value="Seguridad">Seguridad</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div>
                <label style={s.label}>UBICACIÓN</label>
                <input style={s.input} value={editando.ubicacion || ''} onChange={e => setEditando({...editando, ubicacion: e.target.value})} />
              </div>
              <div>
                <label style={s.label}>PRECIO ($)</label>
                <input type="number" style={s.input} value={editando.precio || ''} onChange={e => setEditando({...editando, precio: e.target.value})} />
              </div>
              <div>
                <label style={s.label}>PUNTO REORDEN</label>
                <input type="number" style={s.input} value={editando.puntoReorden || ''} onChange={e => setEditando({...editando, puntoReorden: e.target.value})} />
              </div>
            </div>

            <button 
              onClick={handleGuardar} 
              disabled={cargandoUpdate}
              style={{ ...s.saveBtn, opacity: cargandoUpdate ? 0.7 : 1 }}
            >
              {cargandoUpdate ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container:       { minHeight: '100vh', background: '#F8FAFC' },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 20px', background: '#fff', borderBottom: `1px solid ${C.border}` },
  titulo:          { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  tituloSub:       { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  countBadge:      { background: '#F1F5F9', color: C.textSecondary, padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700 },
  
  toolbar:         { display: 'flex', gap: 20, alignItems: 'center', padding: '24px 40px', flexWrap: 'wrap', background: '#fff', borderBottom: `1px solid ${C.border}` },
  searchBox:       { flex: 1, minWidth: 350, background: '#F1F5F9', borderRadius: 16, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 12 },
  search:          { flex: 1, border: 'none', padding: '14px 0', color: C.text, fontSize: 15, outline: 'none', background: 'transparent', fontWeight: 500 },
  
  filtros:         { display: 'flex', gap: 10 },
  filtroBtn:       { padding: '12px 20px', borderRadius: 14, border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary, cursor: 'pointer', fontSize: 14, fontWeight: 700, transition: 'all 0.2s' },
  filtroBtnActivo: { background: C.secondary, borderColor: C.secondary, color: '#fff', boxShadow: '0 4px 12px rgba(15,23,42,0.15)' },
  
  tableContainer:  { ...G.glass, background: '#fff', borderRadius: 28, boxShadow: G.cardShadow, overflow: 'hidden', margin: '0 0 20px' },
  table:           { width: '100%', borderCollapse: 'collapse' },
  th:              { textAlign: 'left', color: C.textLight, fontSize: 10, fontWeight: 800, padding: '18px 24px', borderBottom: `1px solid ${C.border}`, letterSpacing: 1 },
  td:              { padding: '18px 24px', fontSize: 14, color: C.text, borderBottom: `1px solid ${C.border}` },
  tr:              { transition: 'background 0.2s' },
  
  badgeWarning:    { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF7ED', color: '#C2410C', padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800, border: '1px solid #FFEDD5', whiteSpace: 'nowrap' },
  badgeError:      { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF2F2', color: '#B91C1C', padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800, border: '1px solid #FEE2E2', whiteSpace: 'nowrap' },
  badgeSuccess:    { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F0FDF4', color: '#15803D', padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800, border: '1px solid #DCFCE7', whiteSpace: 'nowrap' },
  
  pagination:      { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 20, paddingBottom: 40 },
  pagBtn:          { background: '#fff', color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  pagInfo:         { color: C.textSecondary, fontSize: 14 },
  loading:         { textAlign: 'center', padding: 100, color: C.textSecondary, fontWeight: 700, fontSize: 18 },

  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', padding: 40, borderRadius: 32, width: 500, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' },
  label: { display: 'block', fontSize: 10, fontWeight: 800, color: C.textLight, marginBottom: 8, letterSpacing: 0.5 },
  input: { width: '100%', padding: '14px', borderRadius: 14, border: `1px solid ${C.border}`, fontSize: 14, background: '#F8FAFC', color: C.secondary, fontWeight: 600, outline: 'none', boxSizing: 'border-box' },
  saveBtn: { width: '100%', marginTop: 30, padding: 18, borderRadius: 16, border: 'none', background: C.secondary, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' },
  editBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', opacity: 0.8, padding: 5 },
};
