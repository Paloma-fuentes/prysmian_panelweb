import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './src/config/firebase';
import { getPerfilUsuario } from './src/services/authService';
import { font, C } from './src/theme';

import Login             from './src/pages/Login';
import Register          from './src/pages/Register';
import Sidebar           from './src/components/Sidebar';
import Dashboard         from './src/pages/Dashboard';
import Inventario        from './src/pages/Inventario';
import Solicitudes       from './src/pages/Solicitudes';
import SolicitudesCompra from './src/pages/SolicitudesCompra';
import Alertas           from './src/pages/Alertas';
import Analisis          from './src/pages/Analisis';
import GuiaCorreas       from './src/pages/GuiaCorreas';
import ImportarExcel     from './src/pages/ImportarExcel';
import RetiroDirecto     from './src/pages/RetiroDirecto';
import DevolucionDirecta from './src/pages/DevolucionDirecta';
import ConteoInventario  from './src/pages/ConteoInventario';
import CrearCompra       from './src/pages/CrearCompra';
import MiConsumo            from './src/pages/MiConsumo';
import AdminEstrategico    from './src/pages/AdminEstrategico';
import GestionActivos      from './src/pages/GestionActivos';
import AnalisisProveedores from './src/pages/AnalisisProveedores';
import GuiaEscobillas      from './src/pages/GuiaEscobillas';
import MapaBodega          from './src/pages/MapaBodega';
import AnalisisConsumo     from './src/pages/AnalisisConsumo';
import AnalisisMateriales  from './src/pages/AnalisisMateriales';
import ReservaMaterial     from './src/pages/ReservaMaterial';
import Historial           from './src/pages/Historial';
import SolicitudMateriales from './src/pages/SolicitudMateriales';
import PanolInicio  from './src/pages/PanolInicio';
import PanolCompras from './src/pages/PanolCompras';
import PanolRetiros from './src/pages/PanolRetiros';
import PanolPerfil  from './src/pages/PanolPerfil';


const PAGINAS = {
  dashboard:           Dashboard,
  inventario:          Inventario,
  solicitudes:         Solicitudes,
  crearCompra:         CrearCompra,
  solicitudesCompra:   SolicitudesCompra,
  alertas:             Alertas,
  analisis:            Analisis,
  guiaCorreas:         GuiaCorreas,
  importar:            ImportarExcel,
  retiroDirecto:       RetiroDirecto,
  devolucionDirecta:   DevolucionDirecta,
  conteo:              ConteoInventario,
  miConsumo:           MiConsumo,
  adminEstrategico:    AdminEstrategico,
  gestionActivos:      GestionActivos,
  analisisProveedores: AnalisisProveedores,
  guiaEscobillas:      GuiaEscobillas,
  mapaBodega:          MapaBodega,
  analisisConsumo:     AnalisisConsumo,
  analisisMateriales:  AnalisisMateriales,
  reservaMaterial:     ReservaMaterial,
  historial:           Historial,
  solicitudMateriales: SolicitudMateriales,
  panolInicio:         PanolInicio,
  panolCompras:        PanolCompras,
  panolRetiros:        PanolRetiros,
  perfil:              PanolPerfil,
};


export default function App() {
  const [user, setUser]               = useState(undefined);
  const [perfil, setPerfil]           = useState(null);
  const [pagina, setPagina]           = useState('dashboard');
  const [filtroInicial, setFiltroInicial] = useState('todos');
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [sesionInventario, setSesionInventario] = useState({ activa: false });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'configuracion', 'sesionInventario'), snap => {
      setSesionInventario(snap.exists() ? snap.data() : { activa: false });
    });
    return unsub;
  }, []);
  
  const mainRef = useRef(null);
  const Pagina = PAGINAS[pagina] || Dashboard;

  // Escuchar cambios de sesión de Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        try {
          const p = await getPerfilUsuario(u.uid);
          setPerfil(p);
          setUser(u);
        } catch (e) {
          console.error("Error al obtener perfil:", e);
          setUser(u); // Al menos dejamos al usuario logueado
        }
      } else {
        setPerfil(null);
        setUser(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
  }, [pagina]);

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
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#F5F5F7', fontFamily: font.family }}>
      <Sidebar pagina={pagina} setPagina={setPagina} navegar={navegar} onLogout={() => signOut(auth)} perfil={perfil} sesionInventario={sesionInventario} />
      <main 
        ref={mainRef} 
        style={{ flex: 1, minWidth: 0, overflowY: 'auto', height: '100vh', background: '#F5F5F7', position: 'relative' }}
      >
        <Pagina navegar={navegar} filtroInicial={filtroInicial} perfil={perfil} user={user} />
      </main>
    </div>
  );

}
