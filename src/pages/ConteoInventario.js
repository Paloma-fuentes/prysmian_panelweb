import { useState, useEffect } from 'react';
import { C, G } from '../theme';
import { escucharMateriales, editarMaterial } from '../services/inventarioService';
import { escucharConfig } from '../services/configService';

export default function ConteoInventario() {
  const [materiales, setMateriales] = useState([]);
  const [conteo, setConteo]           = useState({}); // { id: valor_contado }
  const [loading, setLoading]       = useState(true);
  const [busqueda, setBusqueda]     = useState('');
  const [guardando, setGuardando]   = useState(false);
  const [config, setConfig]         = useState({ conteoActivo: false });

  useEffect(() => {
    const unsubConfig = escucharConfig(setConfig);
    return () => unsubConfig();
  }, []);

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

  if (!config.conteoActivo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8FAFC', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 20 }}>🔒</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: C.secondary }}>Auditoría no activa</h2>
        <p style={{ fontSize: 16, color: C.textSecondary, maxWidth: 500, lineHeight: 1.5 }}>
          El censo de inventario está actualmente desactivado por la administración. 
          Vuelve a intentarlo cuando se inicie un nuevo proceso de conteo físico.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: C.background }}>
      {/* ── Header Premium ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}`, width: '100%', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0, letterSpacing: -0.5 }}>Auditoría de Inventario</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Censo físico de materiales y ajuste de stock en sistema</p>
        </div>
        <button 
          style={{ padding: '14px 28px', borderRadius: 14, color: '#fff', border: 'none', fontWeight: 800, cursor: Object.keys(conteo).length > 0 ? 'pointer' : 'default', background: Object.keys(conteo).length > 0 ? C.primary : '#cbd5e1', boxShadow: Object.keys(conteo).length > 0 ? '0 4px 12px rgba(244,130,31,0.3)' : 'none', transition: 'all 0.2s' }} 
          disabled={guardando || Object.keys(conteo).length === 0} 
          onClick={finalizarConteo}
        >
          {guardando ? 'Sincronizando...' : `Guardar Conteo (${Object.keys(conteo).length})`}
        </button>
      </header>

      {/* ── Barra de Búsqueda ── */}
      <div style={{ padding: '24px 40px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <input 
            style={{ flex: 1, border: 'none', padding: '16px 0', fontSize: 15, fontWeight: 500, outline: 'none', color: C.text }} 
            placeholder="Buscar por descripción del material o código SAP..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
          />
        </div>
      </div>

      <main style={{ padding: '0 40px 40px', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textSecondary, fontWeight: 600 }}>Cargando catálogo...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtrados.map(m => {
              const contado = conteo[m.id];
              const diferencia = contado !== undefined ? Number(contado) - m.stock : 0;
              return (
                <div key={m.id} style={{ ...G.glass, background: '#fff', borderRadius: 24, padding: '24px', borderLeft: `6px solid ${contado !== undefined ? (diferencia === 0 ? C.success : C.error) : C.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.secondary, marginBottom: 5, lineHeight: 1.3 }}>{m.descripcion}</div>
                  <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, marginBottom: 20 }}>SAP: {m.codigoSAP || 'N/A'} • UBIC: {m.ubicacion || '—'}</div>
                  
                  <div style={{ background: C.surfaceAlt, padding: '15px', borderRadius: 16, display: 'flex', gap: 15, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: C.textLight, letterSpacing: 0.5 }}>SISTEMA</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: C.secondary }}>{m.stock}</div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: C.primary, letterSpacing: 0.5 }}>FÍSICO</div>
                      <input 
                        style={{ width: '100%', background: '#fff', border: `2px solid ${C.primary}`, borderRadius: 8, padding: '8px 12px', fontSize: 18, fontWeight: 900, color: C.primary, outline: 'none', boxSizing: 'border-box' }} 
                        type="number" 
                        value={contado ?? ''} 
                        placeholder="—"
                        onChange={e => handleInput(m.id, e.target.value)}
                      />
                    </div>
                  </div>

                  {contado !== undefined && diferencia !== 0 && (
                    <div style={{ marginTop: 12, fontSize: 12, fontWeight: 800, textAlign: 'right', color: diferencia > 0 ? C.success : C.error }}>
                      {diferencia > 0 ? 'Exceso' : 'Faltante'}: {diferencia > 0 ? '+' : ''}{diferencia} unidades
                    </div>
                  )}
                  {contado !== undefined && diferencia === 0 && (
                    <div style={{ marginTop: 12, fontSize: 12, fontWeight: 800, textAlign: 'right', color: C.success }}>
                      ✓ Stock coincide perfectamente
                    </div>
                  )}
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
