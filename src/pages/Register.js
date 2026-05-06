import { useState } from 'react';
import { registrarUsuario, verificarFichaExistente } from '../services/authService';
import { C } from '../theme';

// Importamos la imagen de fondo
import BG_IMAGE from '../assets/login_bg.jpg';

const AREAS_PRYSMIAN = [
  { label: 'Mantención',         value: 'mantencion',    icon: '🛠️' },
  { label: 'Externos',           value: 'externos',      icon: '👷' },
  { label: 'Administración',     value: 'admin',         icon: '💼' },
  { label: 'Personal de Planta', value: 'planta',        icon: '🏭' },
];

export default function Register({ onSwitch }) {
  const [rol, setRol]           = useState('');
  const [nombre, setNombre]     = useState('');
  const [apellido, setApellido] = useState('');
  const [ficha, setFicha]       = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleRegister(e) {
    e.preventDefault();
    if (!rol || !nombre || !apellido || !ficha || !telefono) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const fichaExiste = await verificarFichaExistente(ficha);
      if (fichaExiste) {
        setError('Este número de ficha ya está registrado.');
        setLoading(false);
        return;
      }

      const email    = `ficha_${ficha}@prysmian.app`;
      const password = `prysmian_${ficha}`;

      await registrarUsuario(email.trim(), password, {
        rol,
        nombre,
        apellido,
        ficha,
        telefono: telefono.startsWith('569') ? telefono : `569${telefono}`,
        creadoDesde: 'Web Netflix'
      });

      alert('✨ ¡Perfil creado! Ahora inicia sesión.');
      onSwitch(); 
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Ruta pública directa
  const bgStyle = {
    backgroundImage: 'url("/login_bg.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div style={{ ...s.page, ...bgStyle }}>
      <header style={s.navbar}>
        <div style={s.logoBox}>
          <div style={s.logoBadge}>P</div>
          <span style={s.logoText}>PRYSMIAN</span>
        </div>
      </header>

      <div style={s.overlay} />

      <div style={s.loginCard}>
        <h2 style={s.cardTitle}>Crear Cuenta</h2>

        <form onSubmit={handleRegister} style={s.form}>
          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>SELECCIONA TU PERFIL</label>
            <div style={s.gridAreas}>
              {AREAS_PRYSMIAN.map(area => (
                <button
                  key={area.value}
                  type="button"
                  style={{ ...s.areaBtn, ...(rol === area.value ? s.areaBtnActive : {}) }}
                  onClick={() => setRol(area.value)}
                >
                  <span>{area.icon}</span>
                  <span style={{ fontSize: 10 }}>{area.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={s.row}>
            <input style={s.input} type="text" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
            <input style={s.input} type="text" placeholder="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} />
          </div>

          <input style={s.input} type="text" placeholder="Ficha (4 dígitos)" value={ficha} onChange={e => setFicha(e.target.value.replace(/\D/g,''))} maxLength={4} />
          <input style={s.input} type="text" placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g,''))} />

          {error && <div style={s.errorMsg}>{error}</div>}

          <button type="submit" disabled={loading} style={s.mainBtn}>
            {loading ? 'Sincronizando...' : 'Comenzar ahora'}
          </button>
        </form>

        <div style={s.cardFooter}>
          <p style={s.footerText}>
            ¿Ya eres parte del equipo? 
            <span onClick={onSwitch} style={s.linkText}> Inicia sesión</span>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { 
    minHeight: '100vh', 
    width: '100vw',
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'fixed',
    top: 0, left: 0,
    zIndex: 0,
    backgroundColor: '#000',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  navbar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    padding: '25px 60px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center'
  },
  logoBox: { display: 'flex', alignItems: 'center', gap: 12 },
  logoBadge: { background: C.primary, color: '#fff', padding: '4px 10px', borderRadius: 6, fontWeight: 900, fontSize: 24 },
  logoText: { color: C.primary, fontSize: 28, fontWeight: 900, letterSpacing: 2 },
  
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'radial-gradient(circle, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
    zIndex: 1
  },
  
  loginCard: {
    position: 'relative',
    zIndex: 5,
    background: 'rgba(0, 0, 0, 0.82)',
    backdropFilter: 'blur(10px)',
    padding: '40px 50px',
    borderRadius: 12,
    width: '100%',
    maxWidth: '480px',
    boxSizing: 'border-box',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  cardTitle: { color: '#fff', fontSize: 32, fontWeight: 700, margin: '0 0 20px' },
  
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { color: '#8c8c8c', fontSize: 11, fontWeight: 700, marginBottom: 5, display: 'block' },
  gridAreas: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  areaBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px', background: '#333', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' },
  areaBtnActive: { background: C.primary },
  
  row: { display: 'flex', gap: 10 },
  input: {
    width: '100%',
    padding: '14px 18px',
    background: '#333',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    fontSize: 15,
    boxSizing: 'border-box',
    outline: 'none'
  },
  errorMsg: { color: '#e87c03', fontSize: 13, textAlign: 'left' },
  
  mainBtn: {
    background: C.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '16px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 10
  },
  
  cardFooter: { marginTop: 20, textAlign: 'left' },
  footerText: { color: '#737373', fontSize: 15 },
  linkText: { color: '#fff', cursor: 'pointer', fontWeight: 500 },
};
