import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';

const MENSAJES_DIA = [
  { quote: '"Pequeños progresos diarios sumados en el tiempo dan grandes resultados."', author: '— James Clear' },
  { quote: '"La seguridad comienza con buenas prácticas y un equipo comprometido."', author: '— Prysmian' },
  { quote: '"Cada repuesto en su lugar es un minuto de producción ganado."', author: '— Prysmian' },
  { quote: '"El mantenimiento preventivo evita el correctivo. Anticipa siempre."', author: '— Prysmian' },
  { quote: '"Un equipo bien mantenido es productividad asegurada."', author: '— Prysmian' },
  { quote: '"Registrar cada retiro es trazabilidad. La trazabilidad nos protege a todos."', author: '— Prysmian' },
  { quote: '"Anotar antes de actuar: esa es la disciplina del mantenimiento de excelencia."', author: '— Prysmian' },
  { quote: '"El orden en bodega es seguridad en planta."', author: '— Prysmian' },
  { quote: '"Stock bien gestionado, producción continua."', author: '— Prysmian' },
  { quote: '"Cero improvisaciones, cero accidentes."', author: '— Principio Industrial' },
  { quote: '"Tu trabajo en mantención mantiene la planta en movimiento. Eres clave."', author: '— Prysmian' },
  { quote: '"Materiales correctos en el momento correcto: eso es gestión de excelencia."', author: '— Prysmian' },
];

function getMensajeDia() {
  const inicio = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dia    = Math.floor((Date.now() - inicio) / 86_400_000);
  return MENSAJES_DIA[dia % MENSAJES_DIA.length];
}

const DIAS_ES  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MEDALLAS = ['🥇','🥈','🥉'];

export default function MantencionInicio({ perfil, navegar }) {
  const [materiales, setMateriales] = useState([]);
  const [historial,  setHistorial]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [ahora,      setAhora]      = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let done = 0;
    const check = () => { done++; if (done >= 2) setLoading(false); };
    const u1 = onSnapshot(collection(db, 'materiales'),
      s => { setMateriales(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    const u2 = onSnapshot(query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(1500)),
      s => { setHistorial(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    return () => { u1(); u2(); };
  }, []);

  const nombre   = perfil?.nombre || 'Usuario';
  const { quote, author } = getMensajeDia();
  const fechaStr = `${DIAS_ES[ahora.getDay()]}, ${ahora.getDate()} de ${MESES_ES[ahora.getMonth()]}`;
  const mesStr   = `${MESES_ES[ahora.getMonth()].charAt(0).toUpperCase() + MESES_ES[ahora.getMonth()].slice(1)} De ${ahora.getFullYear()}`;

  const sugerencias = useMemo(() =>
    materiales
      .filter(m => (m.stock ?? 0) <= (m.puntoReorden || m.stockMinimo || 0))
      .map(m => {
        const stock = m.stock ?? 0;
        const min   = m.puntoReorden || m.stockMinimo || 0;
        const pedir = Math.max(3, Math.abs(Math.min(0, stock)) + min + 1);
        return { ...m, pedir };
      })
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
      .slice(0, 8),
  [materiales]);

  const topMes = useMemo(() => {
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
    const map = {};
    historial
      .filter(h => {
        if (h.tipo !== 'retiro') return false;
        const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
        return f >= inicioMes;
      })
      .forEach(h => {
        const p = h.producto || 'Sin nombre';
        map[p] = (map[p] || 0) + (Number(h.cantidad) || 1);
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nom, retiros]) => ({ nom, retiros }));
  }, [historial, ahora]);

  const ranking = useMemo(() => {
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
    const map = {};
    historial
      .filter(h => {
        if (h.tipo !== 'retiro') return false;
        const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0;
        return f >= inicioMes;
      })
      .forEach(h => {
        const u = h.usuario || 'Anónimo';
        map[u] = (map[u] || 0) + (Number(h.cantidad) || 1);
      });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const pos    = sorted.findIndex(([u]) => u === nombre);
    return { pos: pos >= 0 ? pos + 1 : null };
  }, [historial, nombre, ahora]);

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: C.textSecondary }}>Cargando...</div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>

      {/* Header */}
      <div style={s.header}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff' }}>Hola, {nombre} 👋</h1>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>{fechaStr}</div>
      </div>

      <div style={s.content}>

        {/* Mensaje del día + ranking */}
        <div style={s.grid2}>
          <div style={s.mensajeCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <span style={{ fontSize: 10, fontWeight: 900, color: C.primary, letterSpacing: 1.5 }}>MENSAJE DEL DÍA</span>
            </div>
            <blockquote style={{ margin: 0, fontSize: 15, fontStyle: 'italic', color: C.secondary, lineHeight: 1.7, fontWeight: 600 }}>
              {quote}
            </blockquote>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, textAlign: 'right', fontStyle: 'italic' }}>{author}</div>
          </div>

          {ranking.pos ? (
            <div style={{ ...s.rankCard, borderTopColor: ranking.pos === 1 ? C.primary : '#6366f1', background: ranking.pos === 1 ? '#fff7ed' : '#fff' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>
                {ranking.pos <= 3 ? MEDALLAS[ranking.pos - 1] : `#${ranking.pos}`}
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.secondary }}>
                {ranking.pos === 1 ? '¡Eres el #1 del equipo!' : `Posición #${ranking.pos} del equipo`}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>
                {ranking.pos === 1
                  ? '¡Excelente compromiso! Lideras el uso del sistema. ¡Sigue así!'
                  : 'Sigue registrando tus retiros para subir de posición.'}
              </div>
            </div>
          ) : (
            <div style={{ ...s.rankCard, borderTopColor: '#e2e8f0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏅</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.secondary }}>Sin retiros este mes</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Registra tu primer retiro para aparecer en el ranking.</div>
            </div>
          )}
        </div>

        {/* Total Productos */}
        <div style={s.totalCard}>
          <div style={{ fontSize: 28, color: '#6366f1' }}>📦</div>
          <div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#6366f1', lineHeight: 1 }}>{materiales.length.toLocaleString('es-CL')}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Total Productos</div>
          </div>
        </div>

        {/* Sugerencias de compra */}
        {sugerencias.length > 0 && (
          <div style={s.sugerCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 20 }}>🛒</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Sugerencias de Compra</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {sugerencias.map((m, i) => (
                <div key={m.id} style={{ ...s.sugerItem, borderBottom: i < sugerencias.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.descripcion}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                      Stock: {m.stock ?? 0} · (Min: {m.puntoReorden || 0})
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>Pedir {m.pedir}</span>
                    <button onClick={() => navegar?.('crearCompra')} style={s.solicBtn}>Solicitar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 5 más retirados del mes */}
        {topMes.length > 0 && (
          <div style={s.topCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: C.secondary }}>Top 5 más retirados del mes</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>{mesStr} · Todos Los Usuarios</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {topMes.map((item, i) => (
                <div key={item.nom} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < topMes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: 20, flexShrink: 0, width: 28 }}>{i < 3 ? MEDALLAS[i] : `${i + 1}.`}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nom}
                  </span>
                  <span style={{ background: i === 0 ? '#fef3c7' : '#f1f5f9', color: i === 0 ? '#d97706' : '#64748b', fontSize: 11, fontWeight: 800, padding: '3px 12px', borderRadius: 20, flexShrink: 0 }}>
                    {item.retiros} retiro{item.retiros !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  header:  { background: `linear-gradient(135deg, ${C.secondary} 0%, #1e293b 100%)`, padding: '36px 40px 40px' },
  content: { padding: '24px 40px 60px', display: 'flex', flexDirection: 'column', gap: 20 },
  grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },

  mensajeCard: { background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${C.primary}` },
  rankCard:    { background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderTop: '3px solid' },
  totalCard:   { background: '#fff', borderRadius: 16, padding: '24px 32px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 20 },
  sugerCard:   { background: C.secondary, borderRadius: 16, padding: '24px', boxShadow: '0 4px 16px rgba(15,23,42,0.15)' },
  sugerItem:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0' },
  solicBtn:    { background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  topCard:     { background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
};
