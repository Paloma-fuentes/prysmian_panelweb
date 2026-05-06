import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C, G } from '../theme';

function normalizar(str) {
  return (str || '').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function esCorreaOBanda(m) {
  const tipo = (m.tipoMaterial || '').toLowerCase();
  const desc = normalizar(m.descripcion);
  return tipo === 'correa' || desc.includes('correa') || desc.includes('banda') || desc.includes('belt');
}

// Lógica Inteligente para detectar máquinas en el nombre
function detectarMaquinaEnTexto(texto, maquinaActual) {
  if (maquinaActual && maquinaActual !== 'N/A' && maquinaActual !== 'Sin Máquina Asignada') return maquinaActual;
  
  const raw = (texto || '');
  // Buscar patrones como "Maq 54", "MAQ 54", "Maquina 54", "Maq. 54"
  const match = raw.match(/(?:Maq|Máquina|Maq\.)\s*(\d+)/i);
  if (match) {
    return `Maq ${match[1]}`;
  }
  return 'Sin Máquina Asignada';
}

export default function GuiaCorreas() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  const [filtroMaquina, setFiltroMaquina] = useState('Todas');
  const [soloSinStock, setSoloSinStock]   = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'materiales'), orderBy('descripcion'));
    const unsub = onSnapshot(q, (snap) => {
      const mats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const correas = mats.filter(esCorreaOBanda);
      const mapa = {};
      
      correas.forEach(c => {
        // DESIGNACIÓN INTELIGENTE: Si no tiene máquina, la buscamos en el nombre
        let maq = detectarMaquinaEnTexto(c.descripcion, c.maquina);
        
        if (!mapa[maq]) mapa[maq] = [];
        mapa[maq].push(c);
      });

      const listado = Object.entries(mapa)
        .map(([maquina, items]) => ({ 
          maquina, 
          items: items.sort((a, b) => a.descripcion.localeCompare(b.descripcion)) 
        }))
        .sort((a, b) => {
          if (a.maquina === 'Sin Máquina Asignada') return 1;
          if (b.maquina === 'Sin Máquina Asignada') return -1;
          // Ordenar numéricamente si son "Maq X"
          const numA = parseInt(a.maquina.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.maquina.replace(/\D/g, '')) || 0;
          if (numA && numB) return numA - numB;
          return a.maquina.localeCompare(b.maquina);
        });

      setGrupos(listado);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtrados = grupos
    .filter(g => filtroMaquina === 'Todas' || g.maquina === filtroMaquina)
    .map(g => ({
      ...g,
      items: g.items.filter(i => {
        const q = normalizar(busqueda);
        const cumpleBusqueda = !q || normalizar(g.maquina).includes(q) || normalizar(i.descripcion).includes(q) || normalizar(i.codigoSAP).includes(q);
        const cumpleStock = !soloSinStock || (Number(i.stock) || 0) === 0;
        return cumpleBusqueda && cumpleStock;
      })
    }))
    .filter(g => g.items.length > 0);

  const listaMaquinas = ['Todas', ...grupos.map(g => g.maquina)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: '#F4F7FA' }}>
      <header style={{ padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0 }}>Guía Maestra de Correas</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Auto-organización inteligente por número de máquina</p>
        </div>
        <div style={{ display: 'flex', gap: 15 }}>
          <div style={s.statCard}>
            <div style={s.statVal}>{grupos.filter(g => g.maquina !== 'Sin Máquina Asignada').length}</div>
            <div style={s.statLab}>EQUIPOS</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statVal, color: C.error }}>{grupos.reduce((acc, g) => acc + g.items.filter(i => (Number(i.stock)||0)===0).length, 0)}</div>
            <div style={s.statLab}>SIN STOCK</div>
          </div>
        </div>
      </header>

      <div style={{ padding: '20px 40px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 300, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
          <input 
            style={s.filterInput} 
            placeholder="Buscar por nombre o SAP..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={s.miniLabel}>SALTAR A MÁQUINA</label>
          <select style={s.select} value={filtroMaquina} onChange={e => setFiltroMaquina(e.target.value)}>
            {listaMaquinas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button onClick={() => setSoloSinStock(!soloSinStock)} style={{ ...s.toggleBtn, ...(soloSinStock ? s.toggleBtnAct : {}) }}>
          {soloSinStock ? '🚩 Mostrando solo sin stock' : '📦 Mostrar todas'}
        </button>
      </div>

      <main style={{ padding: '30px 40px 60px', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textSecondary }}>Analizando catálogo...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 100, color: C.textLight }}>
             <div style={{fontSize: 60, marginBottom: 20}}>📪</div>
             <p style={{fontSize: 18, fontWeight: 600}}>No hay resultados.</p>
             <button onClick={() => { setFiltroMaquina('Todas'); setSoloSinStock(false); setBusqueda(''); }} style={{ color: C.primary, background: 'none', border: 'none', fontWeight: 800, cursor: 'pointer', marginTop: 10 }}>Limpiar filtros</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {filtrados.map(grupo => (
              <section key={grupo.maquina}>
                <div style={s.sectionHeader}>
                  <div style={{ ...s.maqBadge, background: C.secondary }}>EQUIPO</div>
                  <h2 style={s.maqTitle}>{grupo.maquina}</h2>
                  <div style={s.line} />
                  <div style={s.countBadge}>{grupo.items.length} repuestos</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
                  {grupo.items.map(c => (
                    <CorreaCard key={c.id} correa={c} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CorreaCard({ correa }) {
  const c = correa.caracteristicasCorrea || {};
  const stock = Number(correa.stock) || 0;
  const hayStock = stock > 0;
  
  return (
    <div style={{ ...G.glass, background: '#fff', borderRadius: 24, padding: '25px', boxShadow: G.cardShadow, borderLeft: `6px solid ${hayStock ? C.success : C.error}`, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: C.secondary, lineHeight: 1.2 }}>{correa.descripcion}</div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 4, fontWeight: 800 }}>SAP: {correa.codigoSAP || 'N/A'}</div>
        </div>
        <div style={{ ...s.stockBadge, background: hayStock ? '#DCFCE7' : '#FEE2E2', color: hayStock ? '#16A34A' : '#DC2626' }}>
          {hayStock ? `${stock} en stock` : 'Sin stock'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={s.infoRow}>
          <div style={s.iconCircle}>📏</div>
          <div style={{ flex: 1 }}>
            <div style={s.infoLab}>DIMENSIONES</div>
            <div style={s.infoVal}>
              {c.desarrollo ? `${c.desarrollo}mm` : '—'} × {c.ancho ? `${c.ancho}mm` : '—'} × {c.espesor ? `${c.espesor}mm` : '—'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
           <div style={s.infoRow}>
              <div style={{ ...s.iconCircle, background: '#F0F9FF' }}>⚙️</div>
              <div>
                <div style={s.infoLab}>PARTE</div>
                <div style={{ ...s.infoVal, color: C.primary }}>{c.parte || 'General'}</div>
              </div>
           </div>
           <div style={s.infoRow}>
              <div style={{ ...s.iconCircle, background: '#FFF7ED' }}>📍</div>
              <div>
                <div style={s.infoLab}>BODEGA</div>
                <div style={s.infoVal}>{correa.ubicacion || '—'}</div>
              </div>
           </div>
        </div>

        {(c.base || c.caterpilar || c.color) && (
          <div style={s.techBox}>
            {c.base && <div style={s.techItem}><b>Base:</b> {c.base}</div>}
            {c.caterpilar && <div style={s.techItem}><b>Caterpilar:</b> {c.caterpilar}</div>}
            {c.color && <div style={s.techItem}><b>Color:</b> {c.color}</div>}
          </div>
        )}

        {c.detalles && (
          <div style={s.noteBox}>
             <span style={{fontSize: 14}}>📝</span>
             <span style={s.noteTxt}>{c.detalles}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  statCard: { background: '#fff', padding: '12px 24px', borderRadius: 16, border: `1px solid ${C.border}`, textAlign: 'center', minWidth: 100 },
  statVal: { fontSize: 22, fontWeight: 900, color: C.secondary, lineHeight: 1 },
  statLab: { fontSize: 9, fontWeight: 800, color: C.textLight, marginTop: 4, letterSpacing: 1 },
  filterInput: { width: '100%', padding: '15px 15px 15px 45px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#F8FAFC', outline: 'none', fontSize: 14, fontWeight: 500 },
  select: { width: '100%', padding: '14px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#F8FAFC', outline: 'none', fontSize: 14, fontWeight: 700, color: C.secondary, cursor: 'pointer' },
  miniLabel: { display: 'block', fontSize: 9, fontWeight: 800, color: C.textLight, marginBottom: 5, marginLeft: 5 },
  toggleBtn: { padding: '14px 24px', borderRadius: 16, border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary, fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: '0.2s', marginTop: 15 },
  toggleBtnAct: { background: C.error, color: '#fff', borderColor: C.error },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20, marginTop: 10 },
  maqBadge: { color: '#fff', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 8 },
  maqTitle: { fontSize: 20, fontWeight: 900, color: C.secondary, margin: 0 },
  line: { flex: 1, height: 1, background: C.border },
  countBadge: { color: C.textLight, fontSize: 12, fontWeight: 700 },
  stockBadge: { padding: '6px 12px', borderRadius: 12, fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' },
  infoRow: { display: 'flex', alignItems: 'center', gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
  infoLab: { fontSize: 9, fontWeight: 800, color: C.textLight, letterSpacing: 0.5 },
  infoVal: { fontSize: 13, fontWeight: 700, color: C.secondary },
  techBox: { display: 'flex', flexWrap: 'wrap', gap: 8, background: '#F8FAFC', padding: '12px', borderRadius: 14 },
  techItem: { fontSize: 11, color: C.textSecondary },
  noteBox: { display: 'flex', gap: 8, padding: '12px', background: '#FFFBEB', borderRadius: 14, border: '1px solid #FEF3C7' },
  noteTxt: { fontSize: 12, color: '#92400E', fontStyle: 'italic', lineHeight: 1.4 }
};
