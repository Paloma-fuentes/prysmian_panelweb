import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';

const FILTROS = [
  { id: 'hoy',   label: 'Hoy',    ms: 86_400_000   },
  { id: '7d',    label: '7 días', ms: 604_800_000  },
  { id: '30d',   label: '30 días',ms: 2_592_000_000 },
  { id: 'todos', label: 'Todos',  ms: Infinity      },
];

function normStr(v) { return (v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

function exportCSV(lista) {
  const header = 'Fecha;Hora;Repuesto;Solicitante;Área;Cantidad;Máquina;Ubicación;Entregado';
  const rows = lista.map(h => {
    const f = h.fecha?.toDate ? h.fecha.toDate() : new Date();
    return [
      f.toLocaleDateString('es-CL'),
      f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      (h.producto || '').replace(/;/g, ','),
      (h.usuario || '').replace(/;/g, ','),
      (h.area || '').replace(/;/g, ','),
      h.cantidad || 1,
      (h.maquina || 'N/A').replace(/;/g, ','),
      (h.ubicacion || '').replace(/;/g, ','),
      h.entregaConfirmada ? 'SI' : 'NO',
    ].join(';');
  });
  const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `retiros_${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

function imprimirPDF(h) {
  const f = h.fecha?.toDate ? h.fecha.toDate() : new Date();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Retiro</title>
  <style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto}h2{color:#0f172a;border-bottom:2px solid #f4821f;padding-bottom:8px}
  table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:10px 14px;border:1px solid #e2e8f0;font-size:14px}
  td:first-child{font-weight:700;color:#64748b;width:40%;background:#f8fafc}.footer{margin-top:30px;text-align:center;color:#94a3b8;font-size:11px}</style>
  </head><body>
  <h2>Comprobante de Retiro — Pañol Prysmian</h2>
  <table>
    <tr><td>Repuesto</td><td>${h.producto || 'Sin nombre'}</td></tr>
    <tr><td>Solicitante</td><td>${h.usuario || '—'}</td></tr>
    <tr><td>Fecha</td><td>${f.toLocaleDateString('es-CL')}</td></tr>
    <tr><td>Hora</td><td>${f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td></tr>
    <tr><td>Cantidad</td><td>${h.cantidad || 1} ${h.unidad || 'UND'}</td></tr>
    <tr><td>Máquina</td><td>${h.maquina || 'N/A'}</td></tr>
    <tr><td>Área</td><td>${h.area || '—'}</td></tr>
    <tr><td>Ubicación</td><td>${h.ubicacion || '—'}</td></tr>
    <tr><td>Estado Entrega</td><td>${h.entregaConfirmada ? '✅ Entregado' : '⏳ Pendiente'}</td></tr>
  </table>
  <div class="footer">Generado el ${new Date().toLocaleString('es-CL')}</div>
  </body></html>`;
  const win = window.open('', '_blank', 'width=700,height=800');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export default function PanolRetiros({ perfil }) {
  const [historial,   setHistorial]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filtro,      setFiltro]      = useState('7d');
  const [busqueda,    setBusqueda]    = useState('');
  const [editando,    setEditando]    = useState(null);
  const [guardando,   setGuardando]   = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(2000));
    const unsub = onSnapshot(q,
      snap => { setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const ahora = Date.now();

  const retirosFiltrados = useMemo(() => {
    const cfg = FILTROS.find(f => f.id === filtro);
    const cutoff = cfg?.ms === Infinity ? 0 : ahora - cfg.ms;
    const busq = normStr(busqueda);
    return historial.filter(h => {
      if (h.tipo !== 'retiro') return false;
      const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
      if (f < cutoff) return false;
      if (busq && !normStr(h.producto || '').includes(busq) && !normStr(h.usuario || '').includes(busq) && !normStr(h.maquina || '').includes(busq)) return false;
      return true;
    });
  }, [historial, filtro, busqueda, ahora]);

  async function confirmarEntrega(id) {
    if (!window.confirm('¿Confirmar la entrega de este material?')) return;
    await updateDoc(doc(db, 'historial', id), { entregaConfirmada: true, fechaEntrega: serverTimestamp() });
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este registro de retiro?')) return;
    await deleteDoc(doc(db, 'historial', id));
  }

  async function guardarEdicion() {
    if (!editando) return;
    setGuardando(true);
    try {
      const { id, ...data } = editando;
      await updateDoc(doc(db, 'historial', id), { ...data });
      setEditando(null);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setGuardando(false); }
  }

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: C.textSecondary }}>Cargando retiros...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>

      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Control de Retiros</h1>
          <p style={s.sub}>{retirosFiltrados.length} retiros · historial en tiempo real</p>
        </div>
        <button onClick={() => exportCSV(retirosFiltrados)} style={s.excelBtn}>⬇ Excel</button>
      </header>

      {/* Barra de herramientas */}
      <div style={s.toolbar}>
        <div style={s.searchBox}>
          <span>🔍</span>
          <input style={s.search} placeholder="Buscar repuesto, solicitante o máquina..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTROS.map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)} style={{ ...s.filtroBtn, ...(filtro === f.id ? s.filtroBtnActive : {}) }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ padding: '20px 40px' }}>
        {retirosFiltrados.length === 0 ? (
          <div style={s.empty}><div style={{ fontSize: 40 }}>📤</div><div>No hay retiros en este período.</div></div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['REPUESTO', 'SOLICITANTE', 'FECHA/HORA', 'ÁREA', 'CANT.', 'MÁQUINA', 'UBICACIÓN', 'ESTADO', 'ACCIONES'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {retirosFiltrados.map(h => {
                  const f = h.fecha?.toDate ? h.fecha.toDate() : null;
                  const fechaStr = f ? f.toLocaleDateString('es-CL') : '—';
                  const horaStr  = f ? f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—';
                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ ...s.td, fontWeight: 700, color: C.secondary }}>{h.producto || 'Sin nombre'}</td>
                      <td style={s.td}>{h.usuario || '—'}</td>
                      <td style={{ ...s.td, fontSize: 11 }}><div>{fechaStr}</div><div style={{ color: '#94a3b8' }}>{horaStr}</div></td>
                      <td style={s.td}>{h.area || '—'}</td>
                      <td style={{ ...s.td, fontWeight: 800, color: C.primary }}>{h.cantidad || 1}</td>
                      <td style={s.td}>{h.maquina || 'N/A'}</td>
                      <td style={s.td}>{h.ubicacion || '—'}</td>
                      <td style={s.td}>
                        {h.entregaConfirmada
                          ? <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 800 }}>✅ ENTREGADO</span>
                          : <span style={{ background: '#fff7ed', color: '#d97706', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 800 }}>⏳ PENDIENTE</span>
                        }
                      </td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!h.entregaConfirmada && (
                            <button onClick={() => confirmarEntrega(h.id)} title="Confirmar entrega" style={s.actionBtn}>✅</button>
                          )}
                          <button onClick={() => imprimirPDF(h)} title="Imprimir PDF" style={s.actionBtn}>🖨️</button>
                          <button onClick={() => setEditando({ ...h })} title="Editar" style={s.actionBtn}>✏️</button>
                          <button onClick={() => eliminar(h.id)} title="Eliminar" style={s.actionBtn}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal edición */}
      {editando && (
        <div style={s.overlay} onClick={() => setEditando(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 900, color: C.secondary }}>Editar Retiro</h3>
              <button onClick={() => setEditando(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['producto',  'Repuesto',  'text'],
                ['usuario',   'Solicitante','text'],
                ['cantidad',  'Cantidad',  'number'],
                ['maquina',   'Máquina',   'text'],
                ['area',      'Área',      'text'],
                ['ubicacion', 'Ubicación', 'text'],
              ].map(([k, lbl, t]) => (
                <div key={k}>
                  <label style={s.label}>{lbl.toUpperCase()}</label>
                  <input type={t} style={s.input} value={editando[k] || ''} onChange={e => setEditando({ ...editando, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            <button onClick={guardarEdicion} disabled={guardando} style={{ ...s.saveBtn, opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header:  { padding: '32px 40px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  titulo:  { margin: 0, fontSize: 24, fontWeight: 900, color: C.secondary },
  sub:     { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  excelBtn:{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  toolbar: { padding: '16px 40px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  searchBox:{ flex: 1, minWidth: 280, background: '#f1f5f9', borderRadius: 12, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10 },
  search:  { flex: 1, border: 'none', padding: '12px 0', background: 'transparent', fontSize: 13, outline: 'none', color: C.secondary },
  filtroBtn: { padding: '7px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  filtroBtnActive: { background: C.secondary, color: '#fff', borderColor: C.secondary },
  empty:   { textAlign: 'center', padding: 60, color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, fontSize: 15 },
  th:      { textAlign: 'left', padding: '12px 16px', fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5 },
  td:      { padding: '12px 16px', fontSize: 13, color: C.secondary },
  actionBtn:{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '3px 5px', borderRadius: 6 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal:   { background: '#fff', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 520 },
  closeBtn:{ background: '#f1f5f9', border: 'none', width: 34, height: 34, borderRadius: 17, cursor: 'pointer', fontSize: 15, color: '#475569', fontWeight: 800 },
  label:   { display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 6, letterSpacing: 0.5 },
  input:   { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' },
  saveBtn: { width: '100%', marginTop: 20, padding: 14, borderRadius: 12, border: 'none', background: C.secondary, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' },
};
