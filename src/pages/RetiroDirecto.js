import { useState } from 'react';
import { C, G } from '../theme';
import BuscadorWeb from '../components/BuscadorWeb';
import { crearSolicitud } from '../services/solicitudesService';

const MAQUINAS = [
  '26 - Trefiladora FX13', '27 - Trefiladora Niehoff M-85',
  '28 - Trefiladora aluminio Itosin', '29 - Trefiladora aluminio',
  '40 - Trefiladora intermedia C-13', '54 - Trefiladora Multihebra Niehoff 14H',
  '55 - Trefiladora Frigecco', '56 - Trefiladora Multihebra Lesmo 16H',
  '80 - Cableadora Planetaria', '82 - Cableadora Rígida',
  '84 - Cableadora NMC 1250', '85 - Cableadora Buncher Lesmo 1600',
  '86 - Cableadora NOVA 1250', '91 - Buncher LESMO 1-760',
  '92 - Buncher LESMO 1-760', '93 - Buncher NIEHOFF',
  '94 - Buncher LESMO 1-630', '96 - Buncher SAMP 1-630',
  '97 - Buncher SAMP 2-630', '98 - Buncher NIEHOFF 2-630',
  '126 - Agua Industrial', '128 - Osmosis',
  '200 - Extrusora POLYMOLD', '204 - Extrusora 4 1/2" FUERZA',
  '206 - Catenaria CCVL-2', '207 - Catenaria CCVL-1',
  '210 - Extrusora DAVIS 4 1/2" FUERZA', '213 - Extrusora ALCAP',
  '215 - Extrusora MAILLEFER', '217 - Extrusora 4 1/2" BW1',
  '218 - Extrusora DAVIS 4 1/2" FUERZA BW2',
  '231 - Planta Buss', '232 - Planta Elastomero',
  '271 - Cableadora Universal',
  '283 - Tejedora WARDWELL 1', '284 - Tejedora WARDWELL 2', '285 - Tejedora',
  '320 - Fraccionadora Lateral 1', '321 - Fraccionadora Lateral 2',
  '322 - Fraccionadora PS-85', '323 - Fraccionadora WINDAK FC5',
  '325 - Embaladora', '326 - Fraccionadora PS-350',
  '327 - Embaladora SKALTEK', '329 - Embaladora PS-250',
  '340 - Embaladora Rebobinadora', '341 - Embaladora Rebobinadora',
  '342 - Embaladora Rebobinadora', '345 - Rebobinadora 4',
  '346 - Embaladora Rebobinadora', '348 - Aplicadora pantalla KABMAK',
  '350 - Aplicadora pantalla Blindatriz',
  '356 - Fraccionadora', '357 - Fraccionadora',
  '620 - Laboratorio RyD', '671 - Recuperadora de Cobre',
  '672 - Recicladora de Cobre', '673 - Taller de utilaje',
  '674 - Calidad', '675 - Equipos de Carga y Transporte',
  'N/A',
];

const UNIDADES = ['UND', 'KG', 'MTS'];

export default function RetiroDirecto({ perfil }) {
  const [items, setItems] = useState([]);
  const [producto, setProducto] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('UND');
  const [maquina, setMaquina] = useState('');
  const [parte, setParte] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  function manejarSeleccionProducto(p) {
    setProducto(p);
    if (p?.ubicacion) setUbicacion(p.ubicacion);
    if (p?.unidad) setUnidad(p.unidad);
  }

  function agregarOtro() {
    if (!producto || !cantidad || !maquina || !parte) {
      alert('Por favor completa los campos obligatorios (*) antes de agregar otro repuesto.');
      return;
    }
    
    const nuevoItem = {
      id: Date.now(),
      producto: producto.descripcion,
      materialId: producto.id,
      cantidad: Number(cantidad),
      unidad,
      maquina,
      parte,
      ubicacion,
      notas
    };

    setItems([...items, nuevoItem]);
    
    // Limpiar campos para el siguiente repuesto, manteniendo máquina y parte
    setProducto(null);
    setCantidad('');
    setNotas('');
    // El usuario suele retirar varias cosas para la misma máquina/parte
  }

  function quitarItem(id) {
    setItems(items.filter(i => i.id !== id));
  }

  async function handleEnviar() {
    const listaFinal = [...items];
    
    // Si hay un item actual en el form, incluirlo
    if (producto && cantidad) {
      if (!maquina) {
        alert('Completa la Máquina antes de enviar.');
        return;
      }
      listaFinal.push({
        producto: producto.descripcion,
        materialId: producto.id,
        cantidad: Number(cantidad),
        unidad,
        maquina,
        parte: parte || 'General',
        ubicacion,
        notas
      });
    }

    if (listaFinal.length === 0) {
      alert('Debes agregar al menos un repuesto.');
      return;
    }

    setGuardando(true);
    try {
      for (const item of listaFinal) {
        await crearSolicitud({
          producto: item.producto,
          materialId: item.materialId,
          cantidad: item.cantidad,
          unidad: item.unidad,
          maquina: item.maquina,
          parteMaquina: item.parte,
          ubicacion: item.ubicacion,
          notas: item.notas,
          usuario: perfil?.nombre || 'Web User',
          solicitanteUid: perfil?.id || perfil?.uid || ''
        });
      }
      
      alert('🚀 Solicitud enviada correctamente al pañol.');
      setItems([]);
      setProducto(null);
      setCantidad('');
      setMaquina('');
      setParte('');
      setUbicacion('');
      setNotas('');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F5F5F7' }}>
      <header style={{ padding: '30px 40px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: C.secondary, margin: 0 }}>Retiro</h1>
        <div style={{ color: C.textSecondary, fontSize: 13 }}>Usuario: <b>{perfil?.nombre}</b></div>
      </header>

      <main style={{ padding: '40px', display: 'flex', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
        
        <div style={{ ...G.glass, background: '#fff', borderRadius: 28, padding: '40px', width: '100%', maxWidth: 650, boxShadow: G.cardShadowLg }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: C.secondary, margin: '0 0 5px' }}>Solicitar Retiro de Repuesto</h2>
          <p style={{ fontSize: 13, color: C.textLight, marginBottom: 30 }}>Pañol recibirá una alerta para confirmar la entrega.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* 1. Producto */}
            <div>
              <label style={s.label}>Producto *</label>
              <BuscadorWeb onSelect={manejarSeleccionProducto} />
              {producto && (
                <div style={s.infoProd}>
                  <span>📦 {producto.descripcion}</span>
                  <span style={{ fontWeight: 800, color: producto.stock > 0 ? C.success : C.error }}>Stock: {producto.stock}</span>
                </div>
              )}
            </div>

            {/* 2. Cantidad y Unidades */}
            <div>
              <label style={s.label}>Cantidad *</label>
              <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                <input 
                  style={{ ...s.input, flex: 1, fontSize: 16, fontWeight: 700 }} 
                  type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Ej: 2" 
                />
                <div style={{ display: 'flex', gap: 5 }}>
                  {UNIDADES.map(u => (
                    <button key={u} onClick={() => setUnidad(u)} style={{ ...s.uBtn, ...(unidad === u ? s.uBtnActive : {}) }}>{u}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Máquina Destino */}
            <div>
              <label style={s.label}>Máquina de Destino *</label>
              <select style={s.input} value={maquina} onChange={e => setMaquina(e.target.value)}>
                <option value="">Seleccionar máquina...</option>
                {MAQUINAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* 4. Parte de la Máquina */}
            <div>
              <label style={s.label}>Parte de la Máquina (Zona de falla)</label>
              <input style={s.input} value={parte} onChange={e => setParte(e.target.value)} placeholder="Ej: Motor, Transmisión, Banda..." />
            </div>

            {/* 5. Ubicación */}
            <div>
              <label style={s.label}>Ubicación en Bodega</label>
              <input style={s.input} value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ej: Estante A3" />
            </div>

            {/* 6. Notas */}
            <div>
              <label style={s.label}>Notas / Observaciones</label>
              <textarea style={{ ...s.input, height: 80, resize: 'none' }} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional..." />
            </div>

            {/* Listado de items ya agregados */}
            {items.length > 0 && (
              <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '15px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textLight, marginBottom: 10 }}>LISTA DE MATERIALES ({items.length})</div>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, background: '#fff', padding: '8px 12px', borderRadius: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.cantidad}{item.unidad} - {item.producto}</span>
                    <button onClick={() => quitarItem(item.id)} style={{ border: 'none', background: 'none', color: C.error, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* 7. Agregar otro repuesto */}
            <button onClick={agregarOtro} style={s.addBtn}>
              <span style={{ fontSize: 18 }}>⊕</span> Agregar otro repuesto
            </button>

            {/* Botón Enviar */}
            <button 
              onClick={handleEnviar}
              disabled={guardando}
              style={{ ...s.submitBtn, opacity: guardando ? 0.7 : 1 }}
            >
              {guardando ? 'Enviando...' : 'Enviar Solicitud'}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}

const s = {
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 },
  input: { width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' },
  infoProd: { marginTop: 8, padding: '10px 15px', background: '#F1F5F9', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 },
  uBtn: { padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#F8FAFC', fontSize: 11, fontWeight: 800, color: C.textSecondary, cursor: 'pointer' },
  uBtnActive: { background: C.primary, color: '#fff', borderColor: C.primary },
  addBtn: { width: '100%', background: 'none', border: `2px dashed ${C.primary}30`, borderRadius: 14, padding: '15px', color: C.primary, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  submitBtn: { width: '100%', background: C.primary, color: '#fff', border: 'none', borderRadius: 14, padding: '18px', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 5, boxShadow: '0 4px 12px rgba(244,130,31,0.2)' }
};
