import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C, G } from '../theme';

const TIPOS_CFG = {
  retiro:     { color: C.error,   bg: '#FEE2E2', icono: '📤', label: 'RETIRO' },
  devolucion: { color: C.success, bg: '#DCFCE7', icono: '↩️', label: 'DEVOLUCIÓN' },
  revertido:  { color: '#8B5CF6', bg: '#F5F3FF', icono: '🔄', label: 'REVERSIÓN' },
};

export default function Alertas() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState('todos');

  useEffect(() => {
    async function cargar() {
      const snap = await getDocs(query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(300)));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(todos.filter(h => ['retiro', 'devolucion', 'revertido', 'retornado'].includes(h.tipo)));
      setLoading(false);
    }
    cargar();
  }, []);

  const filtrados = filtro === 'todos' ? items : items.filter(i => i.tipo === filtro);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: C.background }}>
      {/* ── Header Premium ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}`, width: '100%', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0, letterSpacing: -0.5 }}>Auditoría de Movimientos</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Seguimiento en tiempo real de entradas y salidas del pañol</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.primary }}>{items.length}</div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.textLight, letterSpacing: 1 }}>MOVIMIENTOS HOY</div>
        </div>
      </header>

      {/* ── Barra de Filtros Glass ── */}
      <div style={{ padding: '24px 40px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: 10, background: '#fff', padding: '6px', borderRadius: 16, border: `1px solid ${C.border}`, display: 'inline-flex', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          {[
            ['todos', '🔔 Todos'],
            ['retiro', '📤 Retiros'],
            ['devolucion', '↩️ Devoluciones'],
            ['revertido', '🔄 Reversiones'],
          ].map(([val, lbl]) => (
            <button 
              key={val} 
              style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: filtro === val ? C.secondary : 'none', color: filtro === val ? '#fff' : C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }} 
              onClick={() => setFiltro(val)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feed de Actividad Expansivo ── */}
      <main style={{ padding: '0 40px 40px', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textSecondary, fontWeight: 600 }}>Analizando historial...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textLight, background: '#fff', borderRadius: 24, border: `2px dashed ${C.border}` }}>No hay movimientos registrados en este periodo</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {filtrados.map((item, i) => {
              const cfg = TIPOS_CFG[item.tipo] || TIPOS_CFG.revertido;
              const fecha = item.fecha?.toDate?.() || new Date();
              return (
                <div key={item.id || i} style={{ ...G.glass, background: '#fff', display: 'flex', gap: 25, padding: '24px', alignItems: 'center', borderRadius: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ width: 60, height: 60, borderRadius: 18, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{cfg.icono}</div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 12px', borderRadius: 20, background: cfg.bg, color: cfg.color, letterSpacing: 1 }}>{cfg.label}</span>
                      <span style={{ fontSize: 13, color: C.textLight, fontWeight: 600 }}>{fecha.toLocaleString('es-CL')}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginBottom: 15 }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: C.secondary }}>{item.cantidad}x</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{item.producto}</span>
                    </div>
 
                    <div style={{ display: 'flex', gap: 15 }}>
                      <div style={{ fontSize: 12, color: C.textSecondary, background: C.surfaceAlt, padding: '6px 14px', borderRadius: 10, fontWeight: 700 }}>👤 {item.usuario || 'Operario'}</div>
                      {item.maquina && (
                        <div style={{ fontSize: 12, color: C.textSecondary, background: C.surfaceAlt, padding: '6px 14px', borderRadius: 10, fontWeight: 700 }}>⚙️ {item.maquina}</div>
                      )}
                    </div>
                  </div>
 
                  <div style={{ textAlign: 'right', borderLeft: `1px solid ${C.border}`, paddingLeft: 30, flexShrink: 0, minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: C.textLight, fontWeight: 800, letterSpacing: 1, marginBottom: 5 }}>TRACKING ID</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.textSecondary, fontWeight: 700 }}>{item.id.slice(-10).toUpperCase()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  container:       { minHeight: '100vh', background: C.background },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}` },
  titulo:          { fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0, letterSpacing: -0.5 },
  tituloSub:       { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  
  stats:           { display: 'flex', gap: 20 },
  statItem:        { textAlign: 'right' },
  statVal:         { display: 'block', fontSize: 24, fontWeight: 900, color: C.primary },
  statLbl:         { fontSize: 10, fontWeight: 800, color: C.textLight, letterSpacing: 1 },

  toolbar:         { padding: '24px 40px' },
  tabs:            { display: 'flex', gap: 10, background: '#fff', padding: '6px', borderRadius: 16, border: `1px solid ${C.border}`, display: 'inline-flex' },
  tab:             { padding: '10px 20px', borderRadius: 12, border: 'none', background: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s' },
  tabActivo:       { background: C.secondary, color: '#fff', boxShadow: '0 4px 10px rgba(15,23,42,0.2)' },
  
  feed:            { display: 'flex', flexDirection: 'column', gap: 16 },
  card:            { display: 'flex', gap: 20, padding: '20px', alignItems: 'center', transition: 'transform 0.2s', cursor: 'default' },
  iconBox:         { width: 56, height: 56, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  
  cardTop:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge:           { fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 20 },
  fecha:           { fontSize: 12, color: C.textLight, fontWeight: 500 },
  
  cardMid:         { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 },
  cantidad:        { fontSize: 20, fontWeight: 900, color: C.secondary },
  producto:        { fontSize: 16, fontWeight: 700, color: C.text },
  
  cardBot:         { display: 'flex', gap: 16 },
  userTag:         { fontSize: 12, color: C.textSecondary, background: C.surfaceAlt, padding: '4px 10px', borderRadius: 8, fontWeight: 600 },
  maquinaTag:      { fontSize: 12, color: C.textSecondary, background: C.surfaceAlt, padding: '4px 10px', borderRadius: 8, fontWeight: 600 },
  
  cardRight:       { textAlign: 'right', borderLeft: `1px solid ${C.border}`, paddingLeft: 20, flexShrink: 0 },
  
  loading:         { textAlign: 'center', padding: 100, color: C.textSecondary, fontWeight: 600 },
  empty:           { textAlign: 'center', padding: 100, color: C.textLight, fontSize: 16 },
};
