import { useState, useEffect } from 'react';
import { C, G } from '../theme';
import BuscadorWeb from '../components/BuscadorWeb';
import { aprobarDevolucion, getUsuariosPanel } from '../services/solicitudesService';

export default function DevolucionDirecta() {
  const [producto, setProducto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [usuario, setUsuario]   = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getUsuariosPanel().then(setUsuarios);
  }, []);

  async function handleConfirmar() {
    if (!producto) { alert('Selecciona un producto primero'); return; }
    if (!usuario) { alert('Selecciona el usuario que devuelve'); return; }
    if (cantidad <= 0) { alert('La cantidad debe ser mayor a 0'); return; }

    if (!window.confirm(`¿Confirmar devolución de ${cantidad} unidades de "${producto.descripcion}"? El stock aumentará.`)) return;

    setGuardando(true);
    try {
      // 1. Ejecutar aprobación de devolución (lo cual sube el stock automáticamente)
      await aprobarDevolucion(null, {
        materialId: producto.id,
        producto: producto.descripcion,
        cantidad: Number(cantidad),
        usuario: usuario,
        esDirecto: true
      });

      alert('✅ Devolución registrada y stock reintegrado con éxito.');
      setProducto(null);
      setCantidad(1);
      setUsuario('');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: C.background }}>
      {/* ── Header Premium ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}`, width: '100%', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#6366f1', margin: 0, letterSpacing: -0.5 }}>Devolución Directa al Pañol</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Reintegro inmediato de materiales al inventario maestro</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(99,102,241,0.1)', padding: '10px 20px', borderRadius: 14, border: '1px solid rgba(99,102,241,0.2)', fontSize: 13, color: '#4338ca', fontWeight: 700 }}>
          <span style={{ fontSize: 18 }}>↩️</span> MODO REINGRESO RÁPIDO
        </div>
      </header>

      <main style={{ padding: '40px', width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center' }}>
        <div style={{ ...G.glass, background: '#fff', borderRadius: 28, padding: '40px', width: '100%', maxWidth: 900, boxShadow: G.cardShadowLg, display: 'flex', flexDirection: 'column', gap: 25 }}>
          
          <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 25 }}>
            <label style={{ display: 'block', color: C.textSecondary, fontSize: 11, fontWeight: 800, marginBottom: 10, letterSpacing: 1 }}>1. SELECCIONAR PRODUCTO A DEVOLVER</label>
            <BuscadorWeb onSelect={setProducto} />
            {producto && (
              <div style={{ marginTop: 15, padding: '15px 20px', background: 'rgba(99,102,241,0.03)', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid rgba(99,102,241,0.2)` }}>
                <div>
                  <div style={{ fontWeight: 800, color: C.secondary, fontSize: 16 }}>{producto.descripcion}</div>
                  <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>SAP: {producto.codigoSAP || 'N/A'} • UBICACIÓN: {producto.ubicacion || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.textLight }}>STOCK ACTUAL</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#6366f1' }}>{producto.stock}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 25 }}>
            <div>
              <label style={{ display: 'block', color: C.textSecondary, fontSize: 11, fontWeight: 800, marginBottom: 10, letterSpacing: 1 }}>2. CANTIDAD A REINTEGRAR</label>
              <input 
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 18, fontWeight: 800, color: '#6366f1', outline: 'none', background: '#fff', boxSizing: 'border-box' }} 
                type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} min={1}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: C.textSecondary, fontSize: 11, fontWeight: 800, marginBottom: 10, letterSpacing: 1 }}>3. PERSONAL QUE DEVUELVE</label>
              <select 
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontWeight: 600, outline: 'none', background: '#fff', boxSizing: 'border-box' }} 
                value={usuario} onChange={e => setUsuario(e.target.value)}
              >
                <option value="">Buscar en nómina de trabajadores...</option>
                {usuarios.map(u => <option key={u.id} value={u.nombre || u.email}>{u.nombre || u.email}</option>)}
              </select>
            </div>
          </div>

          <button 
            style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 16, padding: '18px', fontSize: 16, fontWeight: 800, cursor: (guardando || !producto) ? 'default' : 'pointer', marginTop: 10, boxShadow: (guardando || !producto) ? 'none' : '0 8px 16px rgba(99,102,241,0.25)', transition: 'all 0.2s', opacity: (guardando || !producto) ? 0.5 : 1 }} 
            onClick={handleConfirmar} disabled={guardando || !producto}
          >
            {guardando ? 'PROCESANDO REINGRESO...' : 'CONFIRMAR DEVOLUCIÓN Y SUMAR AL STOCK'}
          </button>
        </div>
      </main>
    </div>
  );
}

const s = {
  container: { padding: '30px', maxWidth: '800px', margin: '0 auto' },
  header: { marginBottom: '25px', textAlign: 'center' },
  titulo: { fontSize: '24px', fontWeight: 800, color: '#6366f1', margin: 0 },
  sub: { fontSize: '14px', color: C.textSecondary, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '12px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '16px', outline: 'none' },
  select: { padding: '12px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '14px', outline: 'none', background: '#f8fafc' },
  row: { display: 'flex', gap: '20px' },
  info: { marginTop: '8px', padding: '10px', background: '#f1f5f9', borderRadius: '8px', fontSize: '13px', color: C.text },
  btn: { color: '#fff', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
};
