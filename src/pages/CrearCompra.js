import { useState } from 'react';
import { C, G } from '../theme';
import { crearSolicitudCompra } from '../services/solicitudesCompraService';
import { enviarWhatsAppUrgente } from '../services/notificacionesService';
import { buscarMateriales } from '../services/inventarioService';


const CATEGORIAS = ['Eléctricos', 'Mecánico', 'Pernería', 'Lubricación', 'Correas', 'Otros'];
const MAQUINAS = [
  '26 - Trefiladora FX13', '27 - Trefiladora Niehoff M-85',
  '28 - Trefiladora aluminio Itosin', '29 - Trefiladora aluminio',
  '40 - Trefiladora intermedia C-13', '54 - Trefiladora Multihebra Niehoff 14H',
  '55 - Trefiladora Frigecco', '56 - Trefiladora Multihebra Lesmo 16H',
  '80 - Cableadora Planetaria', '82 - Cableadora Rígida',
  '84 - Cableadora NMC 1250', '85 - Cableadora Buncher Lesmo 1600',
  '86 - Cableadora NOVA 1250', '91 - Buncher LESMO 1-760',
  '200 - Extrusora POLYMOLD', '204 - Extrusora 4 1/2" FUERZA',
  '210 - Extrusora DAVIS 4 1/2" FUERZA', '215 - Extrusora MAILLEFER',
  'N/A'
];

export default function CrearCompra({ perfil }) {
  const [loading, setLoading] = useState(false);
  const [tabTipo, setTabTipo] = useState('nuevo'); // 'nuevo' o 'sap'
  
  // Búsqueda Inteligente
  const [resultados, setResultados] = useState([]);
  const [showResultados, setShowResultados] = useState(false);

  // Form state
  const [nombre, setNombre]           = useState('');
  const [sap, setSap]                 = useState('');
  const [cantidad, setCantidad]       = useState('1');
  const [unidad, setUnidad]           = useState('UND');
  const [categoria, setCategoria]     = useState('');
  const [maquina, setMaquina]         = useState('');
  const [parte, setParte]             = useState('');
  const [caracteristicas, setCaract]  = useState('');
  const [costoEstimado, setCosto]     = useState('');
  const [prioridad, setPrioridad]     = useState('Stock para Bodega');

  async function handleSearch(texto) {
    if (tabTipo === 'nuevo') {
      setNombre(texto);
      return;
    }
    
    setSap(texto);
    const res = await buscarMateriales(texto || '');
    setResultados(res.slice(0, 30)); // Aumentado a 30 para mayor visibilidad
    setShowResultados(true);
  }

  function seleccionarMaterial(mat) {
    setSap(mat.codigoSAP || '');
    setNombre(mat.descripcion || '');
    if (mat.categoria && CATEGORIAS.includes(mat.categoria)) {
      setCategoria(mat.categoria);
    }
    if (mat.maquina && MAQUINAS.includes(mat.maquina)) {
      setMaquina(mat.maquina);
    }
    setShowResultados(false);
  }

  // Correas extra fields
  const [correaDetalle, setCorreaDetalle] = useState('');
  const [correaNombre, setCorreaNombre]   = useState('');
  const [correaNumeracion, setCorreaNum]  = useState(false);
  const [correaNumero, setCorreaNumero]   = useState('');

  // Mediciones extra fields
  const [medDientes, setMedDientes] = useState('');
  const [medMetros, setMedMetros]   = useState('');
  const [medUnidad, setMedUnidad]   = useState('mm');
  const [medAncho, setMedAncho]     = useState('');
  const [medEspesor, setMedEspesor] = useState('');

  async function handleSubmit() {
    if (tabTipo === 'nuevo' && !nombre) { alert('Ingresa el nombre del repuesto'); return; }
    if (tabTipo === 'sap' && !sap) { alert('Ingresa el código SAP'); return; }
    if (!categoria) { alert('Selecciona una categoría'); return; }

    setLoading(true);
    try {
      let nombreFinal = nombre;
      if (tabTipo === 'sap') {
        nombreFinal = nombre ? `${nombre} (SAP: ${sap})` : `SAP: ${sap}`;
      }

      const solicitud = {
        tipoProducto: tabTipo,
        nombre: nombreFinal,
        cantidad: Number(cantidad),
        unidad,
        categoria,
        maquina: maquina || 'N/A',
        parteMaquina: parte || 'N/A',
        prioridad,
        costoEstimado: Number(costoEstimado) || 0,
        usuario: perfil?.nombre || 'Web User',
        caracteristicas: `
          ${caracteristicas}
          ${categoria === 'Correas' ? `\n[CORREA] Posición: ${correaDetalle} | Nombre técnico: ${correaNombre} | Numeración: ${correaNumeracion ? correaNumero : 'NO'}` : ''}
          \n[MEDICIONES] Dientes: ${medDientes || 'N/A'} | Metros: ${medMetros || 'N/A'} | Unidad: ${medUnidad} | Ancho: ${medAncho || 'N/A'} | Espesor: ${medEspesor || 'N/A'}
        `.trim()
      };

      await crearSolicitudCompra(solicitud);

      // Si es urgente, enviar también por WhatsApp
      if (prioridad === 'Urgencia') {
        enviarWhatsAppUrgente(solicitud);
      }

      alert('✅ Solicitud de compra creada con éxito');
      // Reset
      setNombre(''); setSap(''); setCantidad('1'); setCategoria(''); setMaquina(''); setParte(''); setCaract('');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F5F5F7' }}>
      <header style={{ padding: '30px 40px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: C.secondary, margin: 0 }}>Solicitar Compra</h1>
        <div style={{ color: C.textSecondary, fontSize: 13 }}>Usuario: <b>{perfil?.nombre}</b></div>
      </header>

      <main style={{ padding: '40px', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
        <div style={{ ...G.glass, background: '#fff', borderRadius: 32, padding: '40px', width: '100%', maxWidth: 800, boxShadow: G.cardShadowLg }}>
          
          {/* Tipo de Producto Tabs */}
          <div style={{ marginBottom: 30 }}>
            <label style={s.label}>Tipo de Producto</label>
            <div style={{ display: 'flex', gap: 10, background: '#F1F5F9', padding: '6px', borderRadius: 16 }}>
              <button onClick={() => setTabTipo('nuevo')} style={{ ...s.tab, ...(tabTipo === 'nuevo' ? s.tabActive : {}) }}>Producto Nuevo</button>
              <button onClick={() => setTabTipo('sap')} style={{ ...s.tab, ...(tabTipo === 'sap' ? s.tabActive : {}) }}>Registrado en Inventario</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
            {/* Input Dinámico */}
            <div style={{ position: 'relative' }}>
              <label style={s.label}>{tabTipo === 'nuevo' ? 'Nombre del Repuesto *' : 'Buscar en Inventario (SAP, Nombre o Ubicación) *'}</label>
              <input 
                style={s.input} 
                onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                onBlur={e => {
                  Object.assign(e.target.style, s.input);
                  setTimeout(() => setShowResultados(false), 200);
                }}
                value={tabTipo === 'nuevo' ? nombre : sap} 
                onChange={e => handleSearch(e.target.value)}
                placeholder={tabTipo === 'nuevo' ? 'Ej: Rodamiento SKF...' : 'Escribe nombre, SAP o ubicación para buscar...'}
              />

              
              {tabTipo === 'sap' && showResultados && resultados.length > 0 && (
                <div style={s.dropdown}>
                  {resultados.map(m => (
                    <div 
                      key={m.id} 
                      style={s.dropItem} 
                      onClick={() => seleccionarMaterial(m)}
                    >
                      <div style={{ fontWeight: 700, color: C.secondary }}>{m.descripcion}</div>
                      <div style={{ fontSize: 11, color: C.textLight }}>
                        {m.codigoSAP ? `SAP: ${m.codigoSAP}` : 'Sin SAP'} · Stock: {m.stock || 0} · Ubic: {m.ubicacion || 'N/A'}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cantidad y Unidad */}
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Cantidad a Comprar *</label>
                <input style={s.input} type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Unidad</label>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['UND', 'KG', 'MTS'].map(u => (
                    <button key={u} onClick={() => setUnidad(u)} style={{ ...s.uBtn, ...(unidad === u ? s.uBtnActive : {}) }}>{u}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label style={s.label}>Categoría *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {CATEGORIAS.map(c => (
                  <button key={c} onClick={() => setCategoria(c)} style={{ ...s.catBtn, ...(categoria === c ? s.catBtnActive : {}) }}>{c}</button>
                ))}
              </div>
            </div>

            {/* Máquina y Parte */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
               <div>
                 <label style={s.label}>Máquina (Opcional)</label>
                 <select style={s.input} value={maquina} onChange={e => setMaquina(e.target.value)}>
                   <option value="">Seleccionar máquina...</option>
                   {MAQUINAS.map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
               </div>
               <div>
                 <label style={s.label}>Parte de la máquina (Opcional)</label>
                 <input style={s.input} value={parte} onChange={e => setParte(e.target.value)} placeholder="Esta parte es opcional" />
               </div>
               <div>
                 <label style={s.label}>Costo Unitario Estimado ($) *</label>
                 <input type="number" style={s.input} value={costoEstimado} onChange={e => setCosto(e.target.value)} placeholder="Ej: 5000" />
               </div>
            </div>

            {/* Condicional Correas */}
            {categoria === 'Correas' && (
              <div style={s.subSection}>
                <h3 style={s.subTitle}><span>⚙️</span> Detalles de la Correa</h3>
                <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                  {['Superior', 'Inferior'].map(d => (
                    <button key={d} onClick={() => setCorreaDetalle(d)} style={{ ...s.tab, flex: 1, ...(correaDetalle === d ? s.tabActive : {}) }}>{d}</button>
                  ))}
                </div>
                <label style={s.label}>Nombre técnico de la correa</label>
                <input 
                  style={s.input} 
                  onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                  onBlur={e => Object.assign(e.target.style, s.input)}
                  value={correaNombre} 
                  onChange={e => setCorreaNombre(e.target.value)} 
                  placeholder="Ej: Correa Dentada" 
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
                  <span style={s.label}>¿Tiene numeración?</span>
                  <input type="checkbox" checked={correaNumeracion} onChange={e => setCorreaNum(e.target.checked)} style={{ width: 20, height: 20 }} />
                </div>
                {correaNumeracion && (
                  <div style={{ marginTop: 15 }}>
                    <label style={s.label}>Número de la correa (Numeración)</label>
                    <input 
                      style={s.input} 
                      onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                      onBlur={e => Object.assign(e.target.style, s.input)}
                      value={correaNumero} 
                      onChange={e => setCorreaNumero(e.target.value)} 
                      placeholder="Ej: 5M-1000" 
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mediciones (Opcionales) */}
            <div style={s.subSection}>
              <h3 style={s.subTitle}><span>📏</span> Mediciones (Opcionales)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                <div>
                  <label style={s.label}>Dientes</label>
                  <input 
                    style={s.input} 
                    onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                    onBlur={e => Object.assign(e.target.style, s.input)}
                    value={medDientes} onChange={e => setMedDientes(e.target.value)} placeholder="Ej: 40" 
                  />
                </div>
                <div>
                  <label style={s.label}>Metros</label>
                  <input 
                    style={s.input} 
                    onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                    onBlur={e => Object.assign(e.target.style, s.input)}
                    value={medMetros} onChange={e => setMedMetros(e.target.value)} placeholder="Ej: 2.5" 
                  />
                </div>
              </div>
              <label style={s.label}>Unidad para Ancho/Espesor</label>
              <div style={{ display: 'flex', gap: 5, marginBottom: 15 }}>
                {['mm', 'cm', 'pulgadas'].map(u => (
                  <button key={u} onClick={() => setMedUnidad(u)} style={{ ...s.uBtn, flex: 1, ...(medUnidad === u ? s.uBtnActive : {}) }}>{u}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={s.label}>Ancho</label>
                  <input 
                    style={s.input} 
                    onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                    onBlur={e => Object.assign(e.target.style, s.input)}
                    value={medAncho} onChange={e => setMedAncho(e.target.value)} placeholder="Ej: 20" 
                  />
                </div>
                <div>
                  <label style={s.label}>Espesor</label>
                  <input 
                    style={s.input} 
                    onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                    onBlur={e => Object.assign(e.target.style, s.input)}
                    value={medEspesor} onChange={e => setMedEspesor(e.target.value)} placeholder="Ej: 5" 
                  />
                </div>
              </div>
            </div>

            {/* Características */}
            <div>
              <label style={s.label}>Características (Opcional)</label>
              <textarea 
                style={{ ...s.input, height: 100, resize: 'none' }} 
                onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                onBlur={e => Object.assign(e.target.style, { ...s.input, height: 100, resize: 'none' })}
                value={caracteristicas} onChange={e => setCaract(e.target.value)} placeholder="Describe detalles técnicos adicionales..." 
              />
            </div>

            {/* Prioridad */}
            <div>
              <label style={s.label}>Prioridad / Destino</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['Stock para Bodega', 'Uso Personal', 'Urgencia'].map(p => (
                  <button key={p} onClick={() => setPrioridad(p)} style={{ ...s.catBtn, flex: 1, ...(prioridad === p ? s.catBtnActive : {}) }}>
                    {p === 'Urgencia' ? '🚨 ' : p === 'Uso Personal' ? '👤 ' : '📦 '}{p}
                  </button>
                ))}
              </div>
            </div>


            {/* Submit */}
            <button 
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creando...' : 'Crear Solicitud de Compra'}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}

const s = {
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: C.secondary, marginBottom: 8 },
  input: { 
    width: '100%', padding: '15px 20px', borderRadius: 16, border: `1px solid ${C.border}`, 
    background: '#F8FAFC', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s ease',
    fontSize: 15
  },
  inputFocus: { borderColor: C.primary, background: '#fff', boxShadow: '0 0 0 4px rgba(244,130,31,0.1)' },
  tab: { flex: 1, padding: '12px', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, background: 'transparent', color: C.textSecondary, transition: '0.2s' },
  tabActive: { background: C.primary, color: '#fff', boxShadow: '0 4px 10px rgba(244,130,31,0.2)' },
  uBtn: { padding: '12px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 800, color: C.textSecondary, minWidth: 60, cursor: 'pointer', transition: '0.2s' },
  uBtnActive: { background: C.primary, color: '#fff', borderColor: C.primary },
  catBtn: { padding: '10px 20px', borderRadius: 20, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, fontWeight: 700, color: C.textSecondary, cursor: 'pointer', transition: '0.2s' },
  catBtnActive: { background: C.primary, color: '#fff', borderColor: C.primary, boxShadow: '0 4px 10px rgba(244,130,31,0.15)' },
  subSection: { background: '#fff', borderRadius: 24, padding: '25px', border: `1px solid ${C.border}`, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' },
  subTitle: { fontSize: 16, fontWeight: 800, color: C.secondary, marginBottom: 15, marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 },
  submitBtn: { width: '100%', padding: '20px', borderRadius: 20, border: 'none', background: C.primary, color: '#fff', fontSize: 17, fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 25px rgba(244,130,31,0.3)', marginTop: 10, transition: '0.2s' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 16, boxShadow: G.cardShadowLg, marginTop: 10, zIndex: 10, maxHeight: 250, overflowY: 'auto', border: `1px solid ${C.border}` },
  dropItem: { padding: '15px 20px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: '0.2s' }
};

