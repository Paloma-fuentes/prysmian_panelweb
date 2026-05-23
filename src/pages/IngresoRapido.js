import { useState } from 'react';
import { C } from '../theme';
import { actualizarStock, crearMaterial, getMateriales } from '../services/inventarioService';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import BuscadorWeb from '../components/BuscadorWeb';

export default function IngresoRapido({ perfil, user }) {
  const [codigo,    setCodigo]    = useState('');
  const [nombre,    setNombre]    = useState('');
  const [cantidad,  setCantidad]  = useState('');
  const [maquina,   setMaquina]   = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [matId,     setMatId]     = useState(null);
  const [stockMin,  setStockMin]  = useState('');
  const [esNuevo,   setEsNuevo]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [historial, setHistorial] = useState([]);

  function handleSeleccionar(item) {
    setMatId(item.id);
    setCodigo(item.codigoSAP || '');
    setNombre(item.descripcion || '');
    setUbicacion(item.ubicacion || '');
    setEsNuevo(false);
  }

  async function handleActualizar() {
    if (!cantidad || isNaN(Number(cantidad))) { alert('Ingresa una cantidad válida.'); return; }
    const cant = Number(cantidad);
    setLoading(true);
    const nombreOp = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || user?.email || 'Pañolero';
    try {
      let idFinal = matId;

      if (!matId) {
        // Material nuevo
        if (!nombre.trim()) { alert('Ingresa el nombre del material.'); setLoading(false); return; }
        const ref = await crearMaterial({
          descripcion: nombre.trim(),
          codigoSAP: codigo.trim(),
          stock: cant,
          puntoReorden: Number(stockMin) || 0,
          ubicacion: ubicacion.trim(),
          unidad: 'UND',
        });
        idFinal = ref.id;
      } else {
        await actualizarStock(matId, cant);
      }

      // Registrar en historial
      await addDoc(collection(db, 'historial'), {
        tipo:          cant > 0 ? 'ingreso' : 'ajuste',
        materialId:    idFinal,
        producto:      nombre,
        cantidad:      Math.abs(cant),
        maquina:       maquina || 'N/A',
        usuario:       nombreOp,
        solicitanteUid: user?.uid || '',
        fecha:         serverTimestamp(),
      });

      setHistorial(h => [{ nombre, cantidad: cant, tipo: cant > 0 ? 'ingreso' : 'ajuste', fecha: new Date().toLocaleTimeString('es-CL') }, ...h.slice(0, 9)]);
      setMatId(null); setCodigo(''); setNombre(''); setCantidad(''); setMaquina(''); setUbicacion(''); setStockMin(''); setEsNuevo(false);
    } catch (e) {
      console.error(e);
      alert('Error al actualizar el stock.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.background, paddingBottom: 60 }}>
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Ingreso Rápido de Inventario</h1>
          <p style={s.sub}>Actualiza el stock o registra nuevos materiales al instante</p>
        </div>
      </header>

      <div style={s.content}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Formulario */}
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Actualizar stock</h2>

            <div style={s.fieldWrap}>
              <label style={s.label}>Buscar en inventario existente</label>
              <BuscadorWeb onSelect={handleSeleccionar} placeholder="Nombre o código SAP..." />
              {nombre && !esNuevo && <div style={{ marginTop: 6, fontSize: 12, color: C.success }}>✓ <b>{nombre}</b>{codigo ? ` [${codigo}]` : ''}</div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 11, color: C.textLight }}>o</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <button style={{ ...s.toggleBtn, ...(esNuevo ? s.toggleBtnActive : {}) }} onClick={() => { setEsNuevo(!esNuevo); setMatId(null); }}>
              {esNuevo ? '✓ Nuevo material activado' : '+ Crear material nuevo'}
            </button>

            {esNuevo && (
              <>
                <div style={s.fieldWrap}>
                  <label style={s.label}>Nombre del material *</label>
                  <input style={s.input} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Rodamiento 6205" />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ ...s.fieldWrap, flex: 1 }}>
                    <label style={s.label}>Código SAP</label>
                    <input style={s.input} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Opcional" />
                  </div>
                  <div style={{ ...s.fieldWrap, flex: 1 }}>
                    <label style={s.label}>Stock mínimo</label>
                    <input style={s.input} type="number" value={stockMin} onChange={e => setStockMin(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div style={s.fieldWrap}>
                  <label style={s.label}>Ubicación en bodega</label>
                  <input style={s.input} value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Estante A-12..." />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ ...s.fieldWrap, flex: 1 }}>
                <label style={s.label}>Cantidad a ingresar *</label>
                <input style={s.input} type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Ej: 10 (usa -5 para ajuste)" />
              </div>
              <div style={{ ...s.fieldWrap, flex: 1 }}>
                <label style={s.label}>Máquina / equipo</label>
                <input style={s.input} value={maquina} onChange={e => setMaquina(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            <div style={s.helperText}>
              Usa un número positivo para agregar stock. Usa negativo (ej: -3) para ajustar a la baja.
            </div>

            <button style={{ ...s.btnIngresar, opacity: loading ? 0.6 : 1 }} onClick={handleActualizar} disabled={loading}>
              {loading ? '⏳ Actualizando...' : '📥 Confirmar Ingreso'}
            </button>
          </div>

          {/* Historial de esta sesión */}
          <div style={s.card}>
            <h2 style={s.cardTitulo}>Últimos ingresos de esta sesión</h2>
            {historial.length === 0 ? (
              <div style={s.empty}><div style={{ fontSize: 30 }}>📋</div><div>Aún no hay movimientos en esta sesión.</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historial.map((h, i) => (
                  <div key={i} style={s.histItem}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.secondary }}>{h.nombre}</div>
                      <div style={{ fontSize: 11, color: C.textLight }}>{h.fecha}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: h.cantidad > 0 ? C.success : C.error }}>
                        {h.cantidad > 0 ? '+' : ''}{h.cantidad}
                      </span>
                      <span style={{ background: h.tipo === 'ingreso' ? '#d1fae5' : '#fef3c7', color: h.tipo === 'ingreso' ? C.success : C.warning, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
                        {h.tipo.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  header:      { padding: '36px 48px 28px', background: '#fff', borderBottom: `1px solid ${C.border}` },
  titulo:      { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:         { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  content:     { padding: '28px 48px' },
  card:        { background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
  cardTitulo:  { fontSize: 18, fontWeight: 800, color: C.secondary, margin: '0 0 20px' },
  fieldWrap:   { marginBottom: 14 },
  label:       { fontSize: 12, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 5 },
  input:       { width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 13px', fontSize: 14, outline: 'none', background: C.background, color: C.text, boxSizing: 'border-box' },
  toggleBtn:   { width: '100%', border: `1px dashed ${C.border}`, borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#f8fafc', color: C.textSecondary, marginBottom: 14 },
  toggleBtnActive: { border: `1px solid ${C.success}`, background: '#f0fdf4', color: C.success },
  helperText:  { fontSize: 11, color: C.textLight, margin: '4px 0 14px', fontStyle: 'italic' },
  btnIngresar: { width: '100%', background: C.success, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  empty:       { textAlign: 'center', padding: 40, color: C.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, fontSize: 13 },
  histItem:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.background, borderRadius: 10 },
};
