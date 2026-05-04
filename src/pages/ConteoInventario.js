import { useState, useEffect } from 'react';
import { C, card } from '../theme';
import { escucharMateriales, editarMaterial } from '../services/inventarioService';

export default function ConteoInventario() {
  const [materiales, setMateriales] = useState([]);
  const [conteo, setConteo]           = useState({}); // { id: valor_contado }
  const [loading, setLoading]       = useState(true);
  const [busqueda, setBusqueda]     = useState('');
  const [guardando, setGuardando]   = useState(false);

  useEffect(() => {
    const unsub = escucharMateriales(data => {
      setMateriales(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtrados = materiales.filter(m => 
    m.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.codigoSAP || '').includes(busqueda)
  );

  function handleInput(id, val) {
    setConteo(p => ({ ...p, [id]: val }));
  }

  async function finalizarConteo() {
    const ids = Object.keys(conteo);
    if (ids.length === 0) { alert('No has ingresado ningún conteo'); return; }
    
    if (!window.confirm(`¿Estás segura de actualizar el stock de ${ids.length} productos?`)) return;

    setGuardando(true);
    try {
      for (const id of ids) {
        const mat = materiales.find(m => m.id === id);
        const nuevoStock = Number(conteo[id]);
        await editarMaterial(id, { 
          stock: nuevoStock, 
          bajoStock: nuevoStock <= (mat.puntoReorden || 0),
          ultimaAuditoria: new Date()
        });
      }
      alert('✅ Inventario actualizado con éxito.');
      setConteo({});
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.titulo}>Auditoría de Inventario (Conteo)</h1>
        <p style={s.sub}>Compara el stock físico con el sistema y ajusta diferencias</p>
      </div>

      <div style={s.toolbar}>
        <input 
          style={s.search} 
          placeholder="Buscar repuesto por nombre o SAP..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)} 
        />
        <button 
          style={{ ...s.btn, background: Object.keys(conteo).length > 0 ? C.primary : '#94a3b8' }} 
          disabled={guardando || Object.keys(conteo).length === 0} 
          onClick={finalizarConteo}
        >
          {guardando ? 'Guardando...' : `Guardar Conteo (${Object.keys(conteo).length})`}
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40 }}>Cargando materiales...</div> : (
        <div style={s.grid}>
          {filtrados.map(m => {
            const contado = conteo[m.id];
            const diferencia = contado !== undefined ? Number(contado) - m.stock : 0;
            return (
              <div key={m.id} style={{ ...card, borderLeft: `5px solid ${contado !== undefined ? (diferencia === 0 ? '#10b981' : '#ef4444') : '#e2e8f0'}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.descripcion}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 12 }}>SAP: {m.codigoSAP || 'N/A'} | Ubic: {m.ubicacion || '—'}</div>
                
                <div style={s.conteoRow}>
                  <div style={s.stockInfo}>
                    <span style={s.label}>Stock Sistema</span>
                    <span style={s.valor}>{m.stock}</span>
                  </div>
                  
                  <div style={s.inputBox}>
                    <span style={s.label}>Stock Real</span>
                    <input 
                      style={s.input} 
                      type="number" 
                      value={contado ?? ''} 
                      placeholder="0"
                      onChange={e => handleInput(m.id, e.target.value)}
                    />
                  </div>
                </div>

                {contado !== undefined && diferencia !== 0 && (
                  <div style={{ ...s.diff, color: diferencia > 0 ? '#10b981' : '#ef4444' }}>
                    Diferencia: {diferencia > 0 ? '+' : ''}{diferencia} unidades
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  container: { padding: '24px' },
  header: { marginBottom: '24px' },
  titulo: { fontSize: '22px', fontWeight: 800, color: C.text, margin: 0 },
  sub: { fontSize: '13px', color: C.textSecondary, marginTop: '4px' },
  toolbar: { display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' },
  search: { flex: 1, padding: '12px 16px', borderRadius: '12px', border: `1px solid ${C.border}`, outline: 'none', fontSize: '14px' },
  btn: { padding: '12px 24px', borderRadius: '12px', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' },
  conteoRow: { display: 'flex', alignItems: 'center', gap: '20px', background: '#f8fafc', padding: '10px', borderRadius: '10px' },
  stockInfo: { display: 'flex', flexDirection: 'column' },
  inputBox: { display: 'flex', flexDirection: 'column', flex: 1 },
  label: { fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', marginBottom: 2 },
  valor: { fontSize: '18px', fontWeight: 800, color: C.text },
  input: { background: '#fff', border: `2px solid ${C.primary}`, borderRadius: '6px', padding: '6px 10px', fontSize: '16px', fontWeight: 800, color: C.primary, width: '80%' },
  diff: { marginTop: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'right' }
};
