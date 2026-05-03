import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { C } from '../theme';

export default function Login({ onLogin }) {
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={s.label}>N° de Ficha</label>
            <input
              style={s.input}
              type="text"
              placeholder="Ej: 1234"
              value={ficha}
              onChange={e => setFicha(e.target.value)}
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
            {loading ? 'Ingresando...' : 'Ingresar al Panel'}
          </button>
        </form>

        <div style={s.footer}>
          Solo usuarios con rol <strong>Pañol</strong> o <strong>Administración</strong> tienen acceso.
        </div>
      </div>
    </div>
  );
}

const s = {
  page:      { minHeight: '100vh', background: C.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card:      { background: C.surface, borderRadius: 16, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  logoRow:   { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 },
  logoCircle:{ width: 48, height: 48, borderRadius: 24, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText:  { fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: 2 },
  logoSub:   { fontSize: 11, color: C.textLight, marginTop: 2 },
  titulo:    { fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 4px' },
  subtitulo: { fontSize: 13, color: C.textSecondary, margin: '0 0 20px' },
  label:     { display: 'block', fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 6, letterSpacing: 0.5 },
  input:     { width: '100%', padding: '12px 14px', borderRadius: 10, border: `2px solid ${C.border}`, fontSize: 18, letterSpacing: 4, color: C.text, background: C.background, boxSizing: 'border-box', outline: 'none', textAlign: 'center' },
  errorBox:  { background: C.errorLight, color: C.error, border: `1px solid ${C.error}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' },
  btn:       { background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  footer:    { marginTop: 20, fontSize: 12, color: C.textLight, textAlign: 'center', lineHeight: 1.5 },
};
