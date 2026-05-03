import { C } from '../theme';

export default function StatCard({ titulo, valor, sub, color = C.primary, icono, alerta, onClick }) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 10,
        padding: '16px 18px',
        borderLeft: `4px solid ${alerta ? color : C.border}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        border: `1px solid ${C.border}`,
        minWidth: 140,
        flex: 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onClick={onClick}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icono}</span>
        {alerta && <span style={{ fontSize: 10, background: color, color: '#fff', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>ALERTA</span>}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{valor ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 6 }}>{titulo}</div>
      {sub && <div style={{ fontSize: 11, color: C.textLight, marginTop: 3 }}>{sub}</div>}
      {onClick && <div style={{ fontSize: 11, color: C.primary, marginTop: 8, fontWeight: 600 }}>Ver detalle →</div>}
    </div>
  );
}
