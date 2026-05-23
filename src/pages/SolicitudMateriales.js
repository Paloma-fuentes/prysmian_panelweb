import { useState } from 'react';
import { C } from '../theme';
import { crearAlertaFaltante } from '../services/solicitudesService';
import BuscadorWeb from '../components/BuscadorWeb';

const UNIDADES = ['UND', 'KG', 'MTS'];

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

export default function SolicitudMateriales({ perfil, user }) {
  const [material,     setMaterial]     = useState('');
  const [cantidad,     setCantidad]     = useState('');
  const [unidad,       setUnidad]       = useState('UND');
  const [urgente,      setUrgente]      = useState(false);
  const [comentario,   setComentario]   = useState('');
  const [maquina,      setMaquina]      = useState('');
  const [loading,      setLoading]      = useState(false);
  const [exito,        setExito]        = useState(false);
  const [mostrarMaqs,  setMostrarMaqs]  = useState(false);
  const [filtrMaq,     setFiltrMaq]     = useState('');

  function handleSeleccionarMaterial(item) {
    setMaterial(item.descripcion || item.nombre || '');
  }

  function handleSeleccionarMaquina(maq) {
    setMaquina(maq);
    setMostrarMaqs(false);
    setFiltrMaq('');
  }

  async function handleEnviar() {
    if (!material.trim() || !cantidad) {
      alert('Material y cantidad son obligatorios.');
      return;
    }
    if (comentario.trim().length < 20) {
      alert('Por favor, detalla el motivo con al menos 20 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const nombreCompleto = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || perfil?.nombre || user?.email || 'Operario';
      await crearAlertaFaltante({
        materialNombre:    material.trim(),
        cantidad:          Number(cantidad),
        unidad,
        urgente,
        comentario:        comentario.trim(),
        maquina:           maquina || 'N/A',
        usuario:           nombreCompleto,
        solicitanteUid:    user?.uid || '',
        solicitanteRol:    perfil?.rol || '',
      });
      setExito(true);
      setMaterial(''); setCantidad(''); setUnidad('UND'); setUrgente(false); setComentario(''); setMaquina('');
      setTimeout(() => setExito(false), 5000);
    } catch (e) {
      console.error(e);
      alert('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const maqs = MAQUINAS.filter(m => !filtrMaq || m.toLowerCase().includes(filtrMaq.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: C.background, paddingBottom: 60 }}>
      {/* Banner rojo de quiebre */}
      <div style={s.bannerRojo}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>🚨 ALERTA DE QUIEBRE DE STOCK</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>Estás reportando material faltante</div>
      </div>

      <div style={s.content}>
        {exito && (
          <div style={s.exitoBox}>
            ✅ {urgente ? '⚠️ Solicitud URGENTE enviada al pañol' : 'Alerta de faltante registrada correctamente'}
          </div>
        )}

        <div style={{ ...s.card, borderColor: urgente ? C.error : '#fca5a5', background: urgente ? '#fff5f5' : '#fff' }}>
          {/* Máquina relacionada */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={s.labelRed}>Máquina relacionada</label>
          </div>
          <button style={s.inputBtn} onClick={() => setMostrarMaqs(true)}>
            <span style={{ color: maquina ? C.text : C.error }}>{maquina || 'Seleccionar máquina...'}</span>
          </button>

          {/* Buscar material del inventario */}
          <label style={s.labelRed}>Material Faltante *</label>
          <div style={{ marginBottom: 12 }}>
            <BuscadorWeb onSelect={handleSeleccionarMaterial} placeholder="Buscar repuesto en inventario..." />
          </div>

          {/* Campo manual */}
          <label style={s.labelRed}>Material (manual si no existe en inventario)</label>
          <input
            style={{ ...s.input, borderColor: C.error, background: '#fff1f2' }}
            value={material}
            onChange={e => setMaterial(e.target.value)}
            placeholder="Nombre del material"
          />

          {/* Cantidad + Unidad */}
          <label style={s.labelRed}>Cantidad Necesaria *</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              style={{ ...s.input, flex: 1, marginBottom: 0, borderColor: C.error, background: '#fff1f2' }}
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="Ej: 10"
              type="number"
              min="1"
            />
            <div style={{ display: 'flex', gap: 5 }}>
              {UNIDADES.map(u => (
                <button
                  key={u}
                  style={{ ...s.unitBtn, ...(unidad === u ? s.unitBtnActive : {}) }}
                  onClick={() => setUnidad(u)}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Urgencia */}
          <div style={s.switchRow}>
            <label style={s.labelRed}>Urgencia Activa</label>
            <div
              style={{ ...s.toggle, background: urgente ? C.error : '#e2e8f0' }}
              onClick={() => setUrgente(v => !v)}
            >
              <div style={{ ...s.toggleThumb, transform: urgente ? 'translateX(20px)' : 'translateX(0)' }} />
            </div>
          </div>

          {urgente && (
            <div style={s.alertaBanner}>
              ⚠️ Esta solicitud emitirá una alerta crítica al pañol
            </div>
          )}

          {/* Comentario */}
          <label style={s.labelRed}>Comentario detallado (mín. 20 caracteres) *</label>
          <textarea
            style={{ ...s.input, minHeight: 90, resize: 'vertical', borderColor: C.error, background: '#fff1f2' }}
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Describe el uso, máquina afectada, por qué falta..."
            maxLength={500}
          />
          <div style={{ fontSize: 11, textAlign: 'right', marginTop: -10, marginBottom: 14,
            color: comentario.length < 20 ? C.error : C.textLight, fontWeight: comentario.length < 20 ? 700 : 400 }}>
            {comentario.length}/500
          </div>

          <button
            style={{ ...s.btnEnviar, opacity: loading ? 0.6 : 1 }}
            onClick={handleEnviar}
            disabled={loading}
          >
            {loading ? '⏳ Reportando...' : '🚨 Reportar Faltante'}
          </button>
        </div>
      </div>

      {/* ── Modal selector de máquinas ──────────────────────────────────────── */}
      {mostrarMaqs && (
        <div style={s.overlay} onClick={() => setMostrarMaqs(false)}>
          <div style={s.maqModal} onClick={e => e.stopPropagation()}>
            <div style={s.maqHeader}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.secondary, margin: 0 }}>Seleccionar máquina</h3>
              <button style={s.closeBtn} onClick={() => setMostrarMaqs(false)}>✕</button>
            </div>
            <div style={{ padding: '10px 16px' }}>
              <input
                style={{ ...s.input, marginBottom: 0 }}
                placeholder="Filtrar máquinas..."
                value={filtrMaq}
                onChange={e => setFiltrMaq(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 360 }}>
              {maqs.map(maq => (
                <button key={maq} style={s.maqItem} onClick={() => handleSeleccionarMaquina(maq)}>
                  {maq}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  bannerRojo: { background: C.error, padding: '24px 48px', color: '#fff', fontWeight: 900, fontSize: 20, textAlign: 'center' },
  content:    { padding: '24px 48px', maxWidth: 680, margin: '0 auto' },
  exitoBox:   { background: '#d1fae5', color: '#065f46', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 14, fontWeight: 700 },
  card:       { background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '2px solid #fca5a5' },
  labelRed:   { display: 'block', fontSize: 13, fontWeight: 700, color: C.error, marginBottom: 6, marginTop: 14 },
  inputBtn:   { width: '100%', border: `1px solid ${C.error}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, background: '#fff1f2', cursor: 'pointer', textAlign: 'left', marginBottom: 14 },
  input:      { width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', background: C.background, color: C.text, boxSizing: 'border-box', marginBottom: 14 },
  unitBtn:    { padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: `1px solid #fee2e2`, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.error, minWidth: 44 },
  unitBtnActive:{ background: C.error, border: `1px solid ${C.error}`, color: '#fff' },
  switchRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggle:     { width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' },
  toggleThumb:{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  alertaBanner:{ background: '#fef2f2', border: `1px solid #fca5a5`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.error, fontWeight: 700, marginBottom: 14, textAlign: 'center' },
  btnEnviar:  { width: '100%', background: C.error, color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 900, cursor: 'pointer' },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  maqModal:   { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  maqHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}` },
  closeBtn:   { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textLight },
  maqItem:    { width: '100%', padding: '13px 20px', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}`, textAlign: 'left', cursor: 'pointer', fontSize: 14, color: C.text },
};
