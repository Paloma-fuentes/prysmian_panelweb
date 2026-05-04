import { useState, useEffect } from 'react';
import { C } from '../theme';
import BuscadorWeb from '../components/BuscadorWeb';
import { entregarSolicitud, crearSolicitud } from '../services/solicitudesService';
import { getUsuariosPanel } from '../services/solicitudesService';

const MAQUINAS = [
  '26 - Trefiladora FX13', '27 - Trefiladora Niehoff M-85',
  '28 - Trefiladora aluminio Itosin', '29 - Trefiladora aluminio',
  '40 - Trefiladora intermedia C-13', '54 - Trefiladora Multihebra Niehoff 14H',
  '55 - Trefiladora Frigecco', '56 - Trefiladora Multihebra Lesmo 16H',
  '80 - Cableadora Planetaria', '82 - Cableadora Rígida',
  '84 - Cableadora NMC 1250', '85 - Cableadora Buncher Lesmo 1600',
  '86 - Cableadora NOVA 1250', '91 - Buncher LESMO 1-760',
  '92 - Buncher LESMO 1-760', '93 - Buncher NIEHOFF',
  '94 - Buncher LESMO 1-630', '96 - Buncher SAMP 1-630',
  '97 - Buncher SAMP 2-630', '98 - Buncher NIEHOFF 2-630',
  '126 - Agua Industrial', '128 - Osmosis',
  '200 - Extrusora POLYMOLD', '204 - Extrusora 4 1/2" FUERZA',
  '206 - Catenaria CCVL-2', '207 - Catenaria CCVL-1',
  '210 - Extrusora DAVIS 4 1/2" FUERZA', '213 - Extrusora ALCAP',
  '215 - Extrusora MAILLEFER', '217 - Extrusora 4 1/2" BW1',
  '218 - Extrusora DAVIS 4 1/2" FUERZA BW2',
  '231 - Planta Buss', '232 - Planta Elastomero',
  '271 - Cableadora Universal',
  '283 - Tejedora WARDWELL 1', '284 - Tejedora WARDWELL 2', '285 - Tejedora',
  '320 - Fraccionadora Lateral 1', '321 - Fraccionadora Lateral 2',
  '322 - Fraccionadora PS-85', '323 - Fraccionadora WINDAK FC5',
  '325 - Embaladora', '326 - Fraccionadora PS-350',
  '327 - Embaladora SKALTEK', '329 - Embaladora PS-250',
  '340 - Embaladora Rebobinadora', '341 - Embaladora Rebobinadora',
  '342 - Embaladora Rebobinadora', '345 - Rebobinadora 4',
  '346 - Embaladora Rebobinadora', '348 - Aplicadora pantalla KABMAK',
  '350 - Aplicadora pantalla Blindatriz',
  '356 - Fraccionadora', '357 - Fraccionadora',
  '620 - Laboratorio RyD', '671 - Recuperadora de Cobre',
  '672 - Recicladora de Cobre', '673 - Taller de utilaje',
  '674 - Calidad', '675 - Equipos de Carga y Transporte',
  'N/A',
];

export default function RetiroDirecto() {
  const [producto, setProducto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [maquina, setMaquina]   = useState('');
  const [usuario, setUsuario]   = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getUsuariosPanel().then(setUsuarios);
  }, []);

  async function handleConfirmar() {
    if (!producto) { alert('Selecciona un producto primero'); return; }
    if (!usuario) { alert('Selecciona el usuario que retira'); return; }
    if (cantidad <= 0) { alert('La cantidad debe ser mayor a 0'); return; }
    if (cantidad > producto.stock) { alert(`No hay stock suficiente. Disponible: ${producto.stock}`); return; }

    if (!window.confirm(`¿Confirmar retiro de ${cantidad} unidades de "${producto.descripcion}"?`)) return;

    setGuardando(true);
    try {
      // 1. Crear solicitud como "entregada" (lo cual descuenta stock automáticamente en el servicio)
      await entregarSolicitud(null, {
        materialId: producto.id,
        producto: producto.descripcion,
        cantidad: Number(cantidad),
        maquina: maquina || 'N/A',
        usuario: usuario,
        codigoSAP: producto.codigoSAP || '',
        esDirecto: true // Marca para saber que fue desde el panel web directo
      });

      alert('✅ Retiro registrado y stock actualizado con éxito.');
      setProducto(null);
      setCantidad(1);
      setMaquina('');
      setUsuario('');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.titulo}>Retiro Directo de Repuestos</h1>
        <p style={s.sub}>Descuenta stock inmediatamente sin pasar por solicitudes pendientes</p>
      </div>

      <div style={s.card}>
        <div style={s.field}>
          <label style={s.label}>1. Buscar Producto *</label>
          <BuscadorWeb onSelect={setProducto} />
          {producto && (
            <div style={s.info}>
              📌 <strong>{producto.descripcion}</strong> | SAP: {producto.codigoSAP || 'N/A'} | 
              Stock actual: <span style={{ color: producto.stock > 0 ? '#10b981' : '#ef4444', fontWeight: 800 }}>{producto.stock}</span>
            </div>
          )}
        </div>

        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>2. Cantidad a Retirar *</label>
            <input style={s.input} type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} min={1} max={producto?.stock} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>3. Máquina Destino</label>
            <select style={s.select} value={maquina} onChange={e => setMaquina(e.target.value)}>
              <option value="">Seleccionar máquina...</option>
              {MAQUINAS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>4. ¿Quién retira el material? *</label>
          <select style={s.select} value={usuario} onChange={e => setUsuario(e.target.value)}>
            <option value="">Seleccionar personal...</option>
            {usuarios.map(u => <option key={u.id} value={u.nombre || u.email}>{u.nombre || u.email}</option>)}
          </select>
        </div>

        <button style={{ ...s.btn, opacity: (guardando || !producto) ? 0.6 : 1 }} onClick={handleConfirmar} disabled={guardando || !producto}>
          {guardando ? 'Procesando...' : 'Confirmar Retiro y Descontar Stock'}
        </button>
      </div>
    </div>
  );
}

const s = {
  container: { padding: '30px', maxWidth: '800px', margin: '0 auto' },
  header: { marginBottom: '25px', textAlign: 'center' },
  titulo: { fontSize: '24px', fontWeight: 800, color: C.text, margin: 0 },
  sub: { fontSize: '14px', color: C.textSecondary, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '12px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '16px', outline: 'none' },
  select: { padding: '12px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '14px', outline: 'none', background: '#f8fafc' },
  row: { display: 'flex', gap: '20px' },
  info: { marginTop: '8px', padding: '10px', background: '#f1f5f9', borderRadius: '8px', fontSize: '13px', color: C.text },
  btn: { background: C.primary, color: '#fff', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
};
