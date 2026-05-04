import { useState, useEffect } from 'react';
import { C } from '../theme';
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
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.titulo}>Devolución Directa al Stock</h1>
        <p style={s.sub}>Suma unidades al inventario inmediatamente</p>
      </div>

      <div style={s.card}>
        <div style={s.field}>
          <label style={s.label}>1. Buscar Producto a Devolver</label>
          <BuscadorWeb onSelect={setProducto} />
          {producto && (
            <div style={s.info}>
              📌 <strong>{producto.descripcion}</strong> | SAP: {producto.codigoSAP || 'N/A'} | 
              Stock actual: <span style={{ color: '#10b981', fontWeight: 800 }}>{producto.stock}</span>
            </div>
          )}
        </div>

        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>2. Cantidad a Devolver</label>
            <input style={s.input} type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} min={1} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>3. ¿Quién devuelve el material?</label>
            <select style={s.select} value={usuario} onChange={e => setUsuario(e.target.value)}>
              <option value="">Seleccionar personal...</option>
              {usuarios.map(u => <option key={u.id} value={u.nombre || u.email}>{u.nombre || u.email}</option>)}
            </select>
          </div>
        </div>

        <button style={{ ...s.btn, background: '#6366f1', opacity: (guardando || !producto) ? 0.6 : 1 }} onClick={handleConfirmar} disabled={guardando || !producto}>
          {guardando ? 'Procesando...' : 'Confirmar Devolución y Sumar al Stock'}
        </button>
      </div>
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
