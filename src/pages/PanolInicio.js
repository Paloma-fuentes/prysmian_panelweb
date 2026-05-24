import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { C } from '../theme';

// ── Mensajes del día (quote + tema) ─────────────────────────────────────────
const MENSAJES_DIA = [
  { texto: 'Un gran equipo se construye con respeto, seguridad y apoyo mutuo.', tema: 'Liderazgo' },
  { texto: 'Materiales bien almacenados significa menos accidentes. Orden en bodega, seguridad en planta.', tema: 'Seguridad' },
  { texto: 'Revisa las etiquetas antes de entregar materiales peligrosos o químicos.', tema: 'Prevención' },
  { texto: 'Un inventario preciso evita detenciones no planificadas. Registra todo.', tema: 'Trazabilidad' },
  { texto: 'Tu trabajo en pañol mantiene la producción en movimiento. Eres clave.', tema: 'Motivación' },
  { texto: 'Registra cada retiro, incluso los urgentes. La trazabilidad nos protege a todos.', tema: 'Proceso' },
  { texto: 'Área de bodega señalizada igual a tránsito seguro para todos los trabajadores.', tema: 'Señalización' },
  { texto: 'Materiales de calidad más técnico preparado igual a menos tiempo de mantención.', tema: 'Calidad' },
  { texto: 'Las solicitudes urgentes respondidas a tiempo evitan paradas costosas.', tema: 'Respuesta' },
  { texto: 'Un pañol organizado refleja el estándar de toda la planta.', tema: 'Excelencia' },
  { texto: 'La limpieza en bodega no es opcional, es parte del trabajo diario.', tema: 'Orden' },
  { texto: 'Stock mínimo es alerta de compra. No esperes a quedarte sin nada.', tema: 'Planificación' },
  { texto: 'Revisa fechas de vencimiento en materiales con caducidad.', tema: 'Control' },
  { texto: 'La comunicación con mantención evita solicitudes duplicadas.', tema: 'Comunicación' },
  { texto: 'Cero accidentes empieza con cero improvisaciones en el trabajo.', tema: 'Seguridad' },
  { texto: 'El análisis del mes te ayuda a anticipar necesidades del próximo período.', tema: 'Análisis' },
  { texto: 'Materiales críticos con stock de seguridad: siempre deben estar disponibles.', tema: 'Continuidad' },
  { texto: 'Tu gestión diaria impacta directamente en la continuidad operacional.', tema: 'Impacto' },
  { texto: 'Prioriza urgencias sin descuidar el flujo normal de solicitudes.', tema: 'Gestión' },
  { texto: 'Materiales sin movimiento por 90+ días: evalúa si siguen siendo necesarios.', tema: 'Eficiencia' },
  { texto: 'Cada solicitud bien documentada ahorra tiempo en auditorías e inspecciones.', tema: 'Documentación' },
  { texto: 'Rotación de stock: lo que entró primero, sale primero. FIFO siempre.', tema: 'Método FIFO' },
  { texto: 'Bodega segura es igual a trabajadores seguros. Responsabilidad compartida.', tema: 'Responsabilidad' },
  { texto: 'Sistema actualizado en tiempo real significa decisiones más rápidas y precisas.', tema: 'Tecnología' },
  { texto: 'Excelencia: respuesta rápida, información exacta, cero errores.', tema: 'Estándares' },
  { texto: 'Herramientas prestadas son responsabilidad del solicitante. Registra siempre.', tema: 'Control' },
  { texto: 'Antes de cerrar el día: inventario al día, área ordenada, reportes enviados.', tema: 'Cierre' },
  { texto: 'Un accidente de trabajo es prevenible. La prevención empieza aquí.', tema: 'Prevención' },
  { texto: 'Materiales correctos en el momento correcto: eso es gestión de pañol.', tema: 'Pañol' },
  { texto: 'El conocimiento del inventario es poder. Domina tu bodega.', tema: 'Conocimiento' },
  { texto: 'Cada mejora pequeña suma. Hoy mejor que ayer, mañana mejor que hoy.', tema: 'Mejora Continua' },
];

function getMensajeDia() {
  const inicio = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dia    = Math.floor((Date.now() - inicio) / 86_400_000);
  return MENSAJES_DIA[dia % MENSAJES_DIA.length];
}

const MEDALLAS = ['🥇', '🥈', '🥉'];

export default function PanolInicio({ perfil, navegar }) {
  const [materiales, setMateriales] = useState([]);
  const [compras,    setCompras]    = useState([]);
  const [historial,  setHistorial]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [ahora,      setAhora]      = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let done = 0;
    const check = () => { done++; if (done >= 3) setLoading(false); };
    const u1 = onSnapshot(collection(db, 'materiales'),
      s => { setMateriales(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    const u2 = onSnapshot(query(collection(db, 'solicitudes_compra'), orderBy('creadoEn', 'desc')),
      s => { setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    const u3 = onSnapshot(query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(1000)),
      s => { setHistorial(s.docs.map(d => ({ id: d.id, ...d.data() }))); check(); }, () => check());
    return () => { u1(); u2(); u3(); };
  }, []);

  const kpis = useMemo(() => ({
    total:      materiales.length,
    conStock:   materiales.filter(m => (m.stock ?? 0) > 0).length,
    bajoStock:  materiales.filter(m => (m.stock ?? 0) > 0 && (m.bajoStock || (m.stock ?? 0) <= (m.puntoReorden || m.stockMinimo || 2))).length,
    urgentes:   compras.filter(c => c.urgencia === 'urgencia' && c.estado === 'en espera').length,
    pendientes: compras.filter(c => c.estado === 'en espera').length,
  }), [materiales, compras]);

  const top5Mes = useMemo(() => {
    const now = new Date();
    const mes = now.getMonth(), anio = now.getFullYear();
    const map = {};
    historial
      .filter(h => {
        if (h.tipo !== 'retiro') return false;
        const f = h.fecha?.toDate ? h.fecha.toDate() : null;
        return f && f.getMonth() === mes && f.getFullYear() === anio;
      })
      .forEach(h => { const p = h.producto || 'Sin nombre'; map[p] = (map[p] || 0) + (Number(h.cantidad) || 1); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }, [historial]);

  const sinRotacion = useMemo(() => {
    const hace90  = Date.now() - 90 * 86_400_000;
    const movidos = new Set(
      historial
        .filter(h => { const f = h.fecha?.toDate ? h.fecha.toDate().getTime() : 0; return f >= hace90; })
        .map(h => h.producto)
    );
    return materiales.filter(m => (m.stock ?? 0) > 0 && !movidos.has(m.descripcion));
  }, [materiales, historial]);

  const nombre  = (perfil?.nombre || 'Encargada').split(' ')[0];
  const mensaje = getMensajeDia();

  const mesLabel = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
  const fechaLabel = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: 60 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 0' }}>

        {/* ── Saludo ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C.secondary }}>
              Hola, {nombre} 👋
            </h1>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{fechaLabel}</div>
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: C.primary, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* ── Mensaje del día ──────────────────────────────────────────────── */}
        <div style={s.mensajeCard}>
          <div style={s.mensajeHeader}>
            <span style={{ color: C.primary, fontSize: 16 }}>✦✦</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.primary, letterSpacing: 1.5 }}>MENSAJE DEL DÍA</span>
          </div>
          <p style={s.mensajeTexto}>"{mensaje.texto}"</p>
          <div style={{ textAlign: 'right', fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
            — {mensaje.tema}
          </div>
        </div>

        {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
        <div style={s.kpiGrid}>

          {/* Fila 1: Total + Con Stock */}
          <div onClick={() => navegar?.('inventario', 'todos')} style={{ ...s.kpiCard, borderTopColor: '#6366f1' }}>
            <div style={{ fontSize: 24, color: '#6366f1', marginBottom: 10 }}>🗂</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#6366f1', lineHeight: 1 }}>{kpis.total}</div>
            <div style={s.kpiLabel}>Total Productos</div>
          </div>

          <div onClick={() => navegar?.('inventario', 'conStock')} style={{ ...s.kpiCard, borderTopColor: '#16a34a' }}>
            <div style={{ fontSize: 24, color: '#16a34a', marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{kpis.conStock}</div>
            <div style={s.kpiLabel}>Con Stock</div>
          </div>

          {/* Fila 2: Bajo Stock + Urgentes */}
          <div onClick={() => navegar?.('inventario', 'bajoStock')} style={{ ...s.kpiCard, borderTopColor: '#f59e0b' }}>
            <div style={{ fontSize: 24, color: '#f59e0b', marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{kpis.bajoStock}</div>
            <div style={s.kpiLabel}>Bajo Stock</div>
          </div>

          <div onClick={() => navegar?.('panolCompras', 'urgentes')} style={{ ...s.kpiCard, borderTopColor: '#ef4444', position: 'relative' }}>
            {kpis.urgentes > 0 && <div style={s.alertDot}>⚠</div>}
            <div style={{ fontSize: 24, color: '#ef4444', marginBottom: 10 }}>🚨</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{kpis.urgentes}</div>
            <div style={s.kpiLabel}>Compras Urgentes</div>
          </div>

          {/* Fila 3: Pendientes full width */}
          <div onClick={() => navegar?.('panolCompras')} style={{ ...s.kpiCard, borderTopColor: C.primary, gridColumn: 'span 2' }}>
            <div style={{ fontSize: 24, color: C.primary, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: C.primary, lineHeight: 1 }}>{kpis.pendientes}</div>
            <div style={s.kpiLabel}>Pendientes</div>
          </div>

        </div>

        {/* ── Top 5 más retirados del mes ──────────────────────────────────── */}
        <div style={s.panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: C.secondary }}>Top 5 más retirados del mes</span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
            {mesLabel} · Todos Los Usuarios
          </div>

          {top5Mes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>Sin retiros este mes</div>
          ) : (
            <div>
              {top5Mes.map((item, i) => (
                <div key={item.nombre} style={s.rankRow}>
                  <span style={{ fontSize: i < 3 ? 24 : 18, flexShrink: 0 }}>
                    {i < 3 ? MEDALLAS[i] : <span style={s.rankNum}>{i + 1}</span>}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nombre}
                  </span>
                  <span style={{ ...s.retiroBadge, background: i === 0 ? '#fef9c3' : '#f1f5f9', color: i === 0 ? '#92400e' : '#475569' }}>
                    {item.cantidad} retiro{item.cantidad !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sin rotación +90 días ─────────────────────────────────────────── */}
        <div style={s.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, color: '#7c3aed' }}>🕐</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#7c3aed' }}>Sin rotación +90 días</span>
            </div>
            <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 800 }}>
              {sinRotacion.length}
            </span>
          </div>

          {sinRotacion.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>Todos los materiales con movimiento</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {sinRotacion.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < sinRotacion.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: 13, color: C.secondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                    {m.descripcion}
                  </span>
                  <span style={s.stockBadge}>Stock: {m.stock}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Botones de acción ────────────────────────────────────────────── */}
        <button onClick={() => navegar?.('alertas')} style={s.btnNaranja}>
          Ver Alertas &gt;
        </button>
        <button onClick={() => navegar?.('analisis')} style={s.btnPurpura}>
          Ver Análisis &gt;
        </button>

      </div>
    </div>
  );
}

const s = {
  mensajeCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 24px',
    borderLeft: `4px solid ${C.primary}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: 20,
  },
  mensajeHeader: {
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  mensajeTexto: {
    margin: '0 0 10px',
    fontSize: 16,
    fontStyle: 'italic',
    color: C.secondary,
    fontWeight: 600,
    lineHeight: 1.6,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    background: '#fff',
    borderRadius: 16,
    borderTop: '4px solid',
    padding: '20px 18px 16px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'transform 0.15s',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 600,
    marginTop: 6,
  },
  alertDot: {
    position: 'absolute', top: 12, right: 14,
    fontSize: 14, color: '#f59e0b',
  },
  panel: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 20px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  rankRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid #f8fafc',
  },
  rankNum: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, borderRadius: 12,
    background: '#f1f5f9', color: '#64748b',
    fontSize: 12, fontWeight: 800,
  },
  retiroBadge: {
    borderRadius: 20, padding: '4px 12px',
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  stockBadge: {
    background: '#ede9fe', color: '#7c3aed',
    borderRadius: 20, padding: '3px 12px',
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  btnNaranja: {
    display: 'block', width: '100%',
    padding: '16px 0', borderRadius: 14,
    background: C.primary, color: '#fff',
    border: 'none', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', marginBottom: 12,
  },
  btnPurpura: {
    display: 'block', width: '100%',
    padding: '16px 0', borderRadius: 14,
    background: '#6366f1', color: '#fff',
    border: 'none', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', marginBottom: 0,
  },
};
