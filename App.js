import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { getPerfilUsuario } from './src/services/authService';
import { font, C } from './src/theme';

import Login             from './src/pages/Login';
import Register          from './src/pages/Register';
import Sidebar           from './src/components/Sidebar';
import Dashboard         from './src/pages/Dashboard';
import Inventario        from './src/pages/Inventario';
import Solicitudes       from './src/pages/Solicitudes';
import SolicitudesCompra from './src/pages/SolicitudesCompra';
import Historial         from './src/pages/Historial';
import Alertas           from './src/pages/Alertas';
import Analisis          from './src/pages/Analisis';
import ImportarExcel     from './src/pages/ImportarExcel';
import RetiroDirecto     from './src/pages/RetiroDirecto';
import DevolucionDirecta from './src/pages/DevolucionDirecta';
import ConteoInventario  from './src/pages/ConteoInventario';

const PAGINAS = {
  dashboard:         Dashboard,
  inventario:        Inventario,
  solicitudes:       Solicitudes,
  solicitudesCompra: SolicitudesCompra,
  historial:         Historial,
  alertas:           Alertas,
  analisis:          Analisis,
  importar:          ImportarExcel,
  retiroDirecto:     RetiroDirecto,
  devolucionDirecta: DevolucionDirecta,
  conteo:            ConteoInventario,
};

export default function App() {
  const [user, setUser]               = useState(undefined); // undefined = verificando
  const [perfil, setPerfil]           = useState(null);
  const [pagina, setPagina]           = useState('dashboard');
  const [filtroInicial, setFiltroInicial] = useState('todos');
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  
  const Pagina = PAGINAS[pagina] || Dashboard;

  // Escuchar cambios de sesión de Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        const p = await getPerfilUsuario(u.uid);
        setPerfil(p);
        setUser(u);
      } else {
        setPerfil(null);
        setUser(null);
      }
    });
    return unsub;
  }, []);

  function navegar(nuevaPagina, filtro = 'todos') {
    setFiltroInicial(filtro);
    setPagina(nuevaPagina);
  }

  // Verificando sesión
  if (user === undefined) return (
    <div style={{ minHeight: '100vh', background: C.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: font.family }}>Verificando sesión...</div>
    </div>
  );

  // Sin sesión → Login o Registro
  if (!user) {
    return mostrarRegistro 
      ? <Register onSwitch={() => setMostrarRegistro(false)} />
      : <Login onLogin={setUser} onSwitch={() => setMostrarRegistro(true)} />;
  }

  // Con sesión → Panel
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F5', fontFamily: font.family }}>
      <Sidebar pagina={pagina} setPagina={setPagina} onLogout={() => signOut(auth)} perfil={perfil} />
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', height: '100vh', background: '#F5F5F5' }}>
        <Pagina navegar={navegar} filtroInicial={filtroInicial} perfil={perfil} user={user} />
      </main>
    </div>
  );
}
