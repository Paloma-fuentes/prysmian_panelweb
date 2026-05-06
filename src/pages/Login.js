import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { C } from '../theme';

export default function Login({ onLogin, onSwitch }) {
  const [ficha, setFicha]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ficha.trim()) { setError('Ingresa tu número de ficha'); return; }
    setLoading(true);
    setError('');
    try {
      const fichaLimpia = ficha.trim().padStart(4, '0');
      const email    = `ficha_${fichaLimpia}@prysmian.app`;
      const password = `prysmian_${fichaLimpia}`;
      const cred     = await signInWithEmailAndPassword(auth, email, password);
      onLogin(cred.user);
    } catch (e) {
      setError('Ficha incorrecta o acceso no autorizado.');
    } finally {
      setLoading(false);
    }
  }

  // La ruta /login_bg.jpg apunta directamente a la carpeta public
  const bgStyle = {
    backgroundImage: 'url("/login_bg.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div style={{ ...s.page, ...bgStyle }}>
      {/* Header Estilo Netflix */}
      <header style={s.navbar}>
        <div style={s.logoBox}>
          <div style={s.logoBadge}>P</div>
          <span style={s.logoText}>PRYSMIAN</span>
        </div>
      </header>

      {/* Overlay más suave para que la imagen se vea bien */}
      <div style={s.overlay} />
      
      {/* Tarjeta de Acceso */}
      <div style={s.loginCard}>
        <h2 style={s.cardTitle}>Iniciar Sesión</h2>
        
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.inputWrapper}>
            <input
              style={s.input}
              type="text"
              placeholder="N° de Ficha"
              value={ficha}
              onChange={e => setFicha(e.target.value.replace(/\D/g,''))}
              maxLength={4}
              autoFocus
            />
          </div>

          {error && <div style={s.errorMsg}>{error}</div>}

          <button type="submit" disabled={loading} style={s.mainBtn}>
            {loading ? 'Entrando...' : 'Ingresar'}
          </button>
        </form>

        <div style={s.cardFooter}>
          <p style={s.footerText}>
            ¿Nuevo en el sistema? 
            <span onClick={onSwitch} style={s.linkText}> Regístrate ahora</span>
          </p>
          <div style={s.legal}>
            Acceso exclusivo personal de <strong>Prysmian Group</strong>.
          </div>
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
    background: 'radial-gradient(circle, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)',
    zIndex: 1
  },
  
  loginCard: {
    position: 'relative',
    zIndex: 5,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(10px)',
    padding: '60px 68px 40px',
    borderRadius: 12,
    width: '100%',
    maxWidth: '450px',
    boxSizing: 'border-box',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  cardTitle: { color: '#fff', fontSize: 32, fontWeight: 700, margin: '0 0 28px', textAlign: 'left' },
  
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  inputWrapper: { position: 'relative' },
  input: {
    width: '100%',
    padding: '16px 20px',
    background: '#333',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    fontSize: 16,
    boxSizing: 'border-box',
    outline: 'none'
  },
  errorMsg: { color: '#e87c03', fontSize: 13, marginTop: 4, textAlign: 'left' },
  
  mainBtn: {
    background: C.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '16px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 24
  },
  
  cardFooter: { marginTop: 30, textAlign: 'left' },
  footerText: { color: '#737373', fontSize: 16, margin: 0 },
  linkText: { color: '#fff', cursor: 'pointer', fontWeight: 500 },
  legal: { color: '#8c8c8c', fontSize: 13, marginTop: 15, lineHeight: 1.4 },
};
