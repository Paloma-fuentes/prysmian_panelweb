import { useState } from 'react';
import { C } from '../theme';
import { crearReserva } from '../services/solicitudesService';
import BuscadorWeb from '../components/BuscadorWeb';

export default function ReservaMaterial({ perfil, user }) {
  const [codigo,    setCodigo]    = useState('');
  const [nombre,    setNombre]    = useState('');
  const [cantidad,  setCantidad]  = useState('');
  const [maquina,   setMaquina]   = useState('');
  const [notas,     setNotas]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [exito,     setExito]     = useState(false);
  const [matId,     setMatId]     = useState(null);
  function handleSeleccionar(item) {
    setCodigo(item.codigoSAP || item.codigoInterno || '');
    setNombre(item.descripcion || item.nombre || '');
    setMatId(item.id || null);
  }

  async function handleReservar() {
    if (!nombre.trim() || !cantidad || !maquina.trim()) {
      alert('Nombre, cantidad y máquina son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const nombreCompleto = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || perfil?.nombre || user?.email || 'Operario';
      await crearReserva({
        producto:      nombre.trim(),
        materialId:    matId,
        cantidad:      Number(cantidad),
        maquina:       maquina.trim(),
        usuario:       nombreCompleto,
        solicitanteUid: user?.uid || '',
        notas,
      });
      setExito(true);
      setCodigo(''); setNombre(''); setCantidad(''); setMaquina(''); setNotas(''); setMatId(null);
      setTimeout(() => setExito(false), 4000);
    } catch (e) {
      console.error(e);
      alert('Error al crear la reserva. Inténtalo nuevamente.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.background, paddingBottom: 60 }}>
      <header style={s.header}>
        <div>
          <h1 style={s.titulo}>Reserva de Material Urgente</h1>
          <p style={s.sub}>Solicita materiales críticos con prioridad al pañol</p>
        </div>
        <span style={s.urgenteBadge}>🔴 URGENTE</span>
      </header>

      <div style={s.content}>
        {exito && (
          <div style={s.exitoBox}>
            ✅ Reserva creada exitosamente. El pañol ha sido notificado.
          </div>
        )}

        <div style={s.card}>
          <h2 style={s.cardTitulo}>Datos del material</h2>

          <div style={s.fieldWrap}>
            <label style={s.label}>Buscar en el inventario</label>
            <BuscadorWeb onSelect={handleSeleccionar} placeholder="Buscar material por nombre o SAP..." />
            {nombre && <div style={{ marginTop: 6, fontSize: 12, color: C.success }}>✓ Seleccionado: <b>{nombre}</b>{codigo ? ` [${codigo}]` : ''}</div>}
          </div>

          <div style={s.fieldWrap}>
            <label style={s.label}>Código SAP (manual si no existe en inventario)</label>
            <input style={s.input} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Código SAP o interno" />
          </div>

          <div style={s.fieldWrap}>
            <label style={s.label}>Nombre del material *</label>
            <input style={s.input} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Rodamiento 6205" />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ ...s.fieldWrap, flex: 1 }}>
              <label style={s.label}>Cantidad *</label>
              <input style={s.input} type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="1" />
            </div>
            <div style={{ ...s.fieldWrap, flex: 2 }}>
              <label style={s.label}>Máquina o equipo *</label>
              <input style={s.input} value={maquina} onChange={e => setMaquina(e.target.value)} placeholder="Ej: Maq 54, Compresor A..." />
            </div>
          </div>

          <div style={s.fieldWrap}>
            <label style={s.label}>Notas adicionales</label>
            <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Urgencia, contexto de la falla, etc." />
          </div>

          <button
            style={{ ...s.btnReservar, opacity: loading ? 0.6 : 1 }}
            onClick={handleReservar}
            disabled={loading}
          >
            {loading ? '⏳ Creando reserva...' : '🔴 Confirmar Reserva Urgente'}
          </button>
        </div>

        <div style={s.infoBox}>
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 10px', color: C.secondary }}>¿Qué es una reserva urgente?</h3>
          <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
            A diferencia de un retiro normal, la <b>reserva urgente</b> notifica inmediatamente al pañol con prioridad máxima. Se usa cuando una máquina está detenida o en falla activa y necesitas el material a la brevedad. El pañol recibirá una alerta de <b>nivel rojo</b>.
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  header:      { padding: '36px 48px 28px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titulo:      { fontSize: 26, fontWeight: 900, color: C.secondary, margin: 0 },
  sub:         { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  urgenteBadge:{ background: '#fee2e2', color: C.error, borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 900 },
  content:     { padding: '28px 48px', maxWidth: 680, margin: '0 auto' },
  exitoBox:    { background: '#d1fae5', color: '#065f46', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 14, fontWeight: 700 },
  card:        { background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: 20 },
  cardTitulo:  { fontSize: 18, fontWeight: 800, color: C.secondary, margin: '0 0 20px' },
  fieldWrap:   { marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 6 },
  input:       { width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', background: C.background, color: C.text, boxSizing: 'border-box' },
btnReservar: { width: '100%', background: C.error, color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 900, cursor: 'pointer', marginTop: 8 },
  infoBox:     { background: '#fff7ed', border: `1px solid ${C.warning}`, borderRadius: 16, padding: 24 },
};
