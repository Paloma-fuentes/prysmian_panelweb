import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C, card } from '../theme';

const TIPOS = [
  { key: 'todos',      label: 'Todos' },
  { key: 'retiro',     label: 'Retiros' },
  { key: 'devolucion', label: 'Devoluciones' },
  { key: 'revertido',  label: 'Revertidos' },
];

const TIPO_CFG = {
  retiro:     { color: C.error,   bg: C.errorLight,   icono: '⬆️', label: 'RETIRO'     },
  devolucion: { color: C.success, bg: C.successLight,  icono: '⬇️', label: 'DEVOLUCIÓN' },
  revertido:  { color: '#f59e0b', bg: '#fef3c7',       icono: '↩️', label: 'REVERTIDO'  },
};

export default function Alertas() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState('todos');

  useEffect(() => {
    async function cargar() {
      const snap = await getDocs(query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(300)));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(todos.filter(h => ['retiro', 'devolucion', 'revertido'].includes(h.tipo)));
      setLoading(false);
    }
    cargar();
  }, []);

  const filtrados = filtro === 'todos' ? items : items.filter(i => i.tipo === filtro);

  if (loading) return <LoadingView />;

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <div style={s.titulo}>Alertas de Movimientos</div>
          <div style={s.subtitulo}>Retiros, devoluciones y revertidos del sistema</div>
        </div>
      </div>

      <div style={{ padding: '16px 28px' }}>
        {/* Filtros */}
        <div style={s.filtroRow}>
          {TIPOS.map(t => (
            <button
              key={t.key}
              style={{ ...s.filtroBtn, ...(filtro === t.key ? s.filtroBtnActivo : {}) }}
              onClick={() => setFiltro(t.key)}
            >
              {t.label}
              <span style={{ ...s.filtroCnt, ...(filtro === t.key ? { background: '#fff', color: C.primary } : {}) }}>
                {t.key === 'todos' ? items.length : items.filter(i => i.tipo === t.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40 }}>🔔</div>
            <div>Sin movimientos registrados</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtrados.map((item, i) => {
              const cfg = TIPO_CFG[item.tipo] || {};
              const fecha = item.fecha?.toDate ? item.fecha.toDate() : null;
              return (
                <div key={item.id || i} style={{ ...card, marginBottom: 0, display: 'flex', gap: 14, alignItems: 'flex-start', borderLeft: `4px solid ${cfg.color}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {cfg.icono}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      {fecha && <span style={{ fontSize: 11, color: C.textLight }}>{fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{item.cantidad}x {item.producto}</div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                      {item.maquina && item.maquina !== 'N/A' ? `⚙️ ${item.maquina}` : ''} {item.parteMaquina ? `· ${item.parteMaquina}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, background: C.background, padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                      👤 {item.usuario || '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: C.textLight }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
        <div>Cargando alertas...</div>
      </div>
    </div>
  );
}

const s = {
  page:         { color: C.text },
  topBar:       { padding: '20px 28px 16px', background: C.secondary, color: '#fff' },
  titulo:       { fontSize: 22, fontWeight: 800, color: '#fff' },
  subtitulo:    { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  filtroRow:    { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filtroBtn:    { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1px solid ${C.border}`, background: C.surface, color: C.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  filtroBtnActivo: { background: C.primary, borderColor: C.primary, color: '#fff' },
  filtroCnt:    { background: C.border, color: C.textSecondary, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  empty:        { textAlign: 'center', padding: 60, color: C.textLight, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
};
