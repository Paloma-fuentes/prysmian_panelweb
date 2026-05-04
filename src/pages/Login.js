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
      const email    = `ficha_${ficha.trim()}@prysmian.app`;
      const password = `prysmian_${ficha.trim()}`;
      const cred     = await signInWithEmailAndPassword(auth, email, password);
      onLogin(cred.user);
    } catch (e) {
      setError('Ficha incorrecta o sin acceso al panel.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoCircle}><span style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>P</span></div>
          <div>
            <div style={s.logoText}>PRYSMIAN</div>
            <div style={s.logoSub}>Panel de Control</div>
          </div>
        </div>

        <h2 style={s.titulo}>Iniciar Sesión</h2>
        <p style={s.subtitulo}>Ingresa con tu número de ficha</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>N° de Ficha / PIN de Acceso</label>
            <input
              style={s.input}
              type="text"
              placeholder="0000"
              value={ficha}
              onChange={e => setFicha(e.target.value.replace(/\D/g,''))}
              maxLength={4}
              autoFocus
            />
          </div>

          {error && (
            <div style={s.errorBox}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? 'Validando...' : 'Entrar al Sistema'}
          </button>
        </form>

        <div style={s.divider}>
          <div style={s.line} />
          <span style={s.or}>O</span>
          <div style={s.line} />
        </div>

        <button onClick={onSwitch} style={s.btnRegister}>
          Crear cuenta nueva
        </button>

        <div style={s.footer}>
          Acceso restringido a personal autorizado de <strong>Prysmian Group</strong>.
        </div>
      </div>
    </div>
  );
}

const s = {
  page:      { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' },
  card:      { background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 24, padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', boxSizing: 'border-box', textAlign: 'center' },
  logoRow:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 30 },
  logoCircle:{ width: 56, height: 56, borderRadius: 16, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' },
  logoText:  { fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: 3, marginTop: 10 },
  logoSub:   { fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: 1 },
  titulo:    { fontSize: 24, fontWeight: 800, color: C.text, margin: '0 0 8px' },
  subtitulo: { fontSize: 14, color: C.textSecondary, margin: '0 0 25px' },
  form:      { display: 'flex', flexDirection: 'column', gap: 16 },
  label:     { display: 'block', fontSize: 11, fontWeight: 700, color: C.textSecondary, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' },
  input:     { width: '100%', padding: '14px', borderRadius: 12, border: `2px solid ${C.border}`, fontSize: 24, fontWeight: 'bold', letterSpacing: 8, color: C.primary, background: '#f8fafc', boxSizing: 'border-box', outline: 'none', textAlign: 'center', transition: 'border-color 0.2s' },
  errorBox:  { background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 10, padding: '12px', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' },
  btn:       { background: C.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', transition: 'transform 0.2s' },
  divider:   { display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' },
  line:      { flex: 1, height: 1, background: C.border },
  or:        { fontSize: 12, color: C.textLight, fontWeight: 600 },
  btnRegister:{ background: 'none', border: `1px solid ${C.primary}`, color: C.primary, borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' },
  footer:    { marginTop: 30, fontSize: 11, color: C.textLight, lineHeight: 1.6 },
};
