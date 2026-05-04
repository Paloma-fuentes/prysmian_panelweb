import { useState } from 'react';
import { registrarUsuario, verificarEncargadaPanolExistente, verificarFichaExistente } from '../services/authService';
import { C } from '../theme';

const OPCIONES_ROL = [
  { label: 'Mantención',        value: 'mantencion' },
  { label: 'Externos',          value: 'externos' },
  { label: 'Administración',    value: 'admin' },
  { label: 'Encargada Pañol',   value: 'panol' },
  { label: 'Personal de Planta',value: 'planta' },
];

export default function Register({ onSwitch, onRegisterSuccess }) {
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
      setError('Completa todos los campos obligatorios');
      return;
    }
    if (ficha.length < 4) {
      setError('La ficha/PIN debe ser de 4 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (rol === 'panol') {
        const existePanol = await verificarEncargadaPanolExistente();
        if (existePanol) {
          setError('Ya existe una Encargada de Pañol registrada.');
          setLoading(false);
          return;
        }
      }

      const fichaExiste = await verificarFichaExistente(ficha);
      if (fichaExiste) {
        setError('Este número de ficha o PIN ya está registrado.');
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
        creadoDesde: 'Web Panel'
      });

      alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
      onSwitch(); // Volver al Login
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoCircle}><span style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>P</span></div>
          <div>
            <div style={s.logoText}>PRYSMIAN</div>
            <div style={s.logoSub}>Crear nueva cuenta</div>
          </div>
        </div>

        <form onSubmit={handleRegister} style={s.form}>
          <div style={{ marginBottom: 15 }}>
            <label style={s.label}>Área / Perfil *</label>
            <div style={s.rolesRow}>
              {OPCIONES_ROL.map(op => (
                <button
                  key={op.value}
                  type="button"
                  style={{ ...s.rolBtn, ...(rol === op.value ? s.rolBtnActive : {}) }}
                  onClick={() => setRol(op.value)}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>{rol === 'externos' ? 'Crea un PIN (4 dígitos) *' : 'N° de Ficha *'}</label>
            <input style={s.input} type="text" placeholder="Ej: 1234" value={ficha} onChange={e => setFicha(e.target.value.replace(/\D/g,''))} maxLength={4} />
          </div>

          <div style={s.row}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Nombre *</label>
              <input style={s.input} type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Apellido *</label>
              <input style={s.input} type="text" placeholder="Tu apellido" value={apellido} onChange={e => setApellido(e.target.value)} />
            </div>
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>Teléfono WhatsApp *</label>
            <input style={s.input} type="text" placeholder="Ej: 56912345678" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g,''))} />
          </div>

          {error && <div style={s.errorBox}>⚠️ {error}</div>}

          <button type="submit" disabled={loading} style={s.btnPrimary}>
            {loading ? 'Procesando...' : 'Registrar Cuenta'}
          </button>

          <button type="button" onClick={onSwitch} style={s.btnLink}>
            ¿Ya tienes cuenta? Inicia Sesión
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 20, padding: '30px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', boxSizing: 'border-box' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 25 },
  logoCircle: { width: 40, height: 40, borderRadius: 12, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: 1.5 },
  logoSub: { fontSize: 11, color: C.textLight },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.text, background: '#fff', boxSizing: 'border-box', outline: 'none' },
  rolesRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  rolBtn: { padding: '6px 12px', borderRadius: 20, border: `1px solid ${C.border}`, background: '#f8fafc', color: C.textSecondary, cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s' },
  rolBtnActive: { background: C.primary, borderColor: C.primary, color: '#fff' },
  row: { display: 'flex', gap: 10 },
  inputGroup: { marginBottom: 5 },
  btnPrimary: { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  btnLink: { background: 'none', border: 'none', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 5 },
  errorBox: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 8, padding: '10px', fontSize: 12, textAlign: 'center' },
};
