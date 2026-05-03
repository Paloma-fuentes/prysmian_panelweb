import React, { useState } from 'react';
import Sidebar from './src/components/Sidebar';
import Dashboard from './src/pages/Dashboard';
import Inventario from './src/pages/Inventario';
import Solicitudes from './src/pages/Solicitudes';
import SolicitudesCompra from './src/pages/SolicitudesCompra';
import Historial from './src/pages/Historial';
import Alertas from './src/pages/Alertas';
import Analisis from './src/pages/Analisis';
import ImportarExcel from './src/pages/ImportarExcel';
import { font } from './src/theme';

const PAGINAS = {
  dashboard:         Dashboard,
  inventario:        Inventario,
  solicitudes:       Solicitudes,
  solicitudesCompra: SolicitudesCompra,
  historial:         Historial,
  alertas:           Alertas,
  analisis:          Analisis,
  importar:          ImportarExcel,
};

export default function App() {
  const [pagina, setPagina] = useState('dashboard');
  const [filtroInicial, setFiltroInicial] = useState('todos');
  const Pagina = PAGINAS[pagina] || Dashboard;

  function navegar(nuevaPagina, filtro = 'todos') {
    setFiltroInicial(filtro);
    setPagina(nuevaPagina);
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#F5F5F5',
      fontFamily: font.family,
    }}>
      <Sidebar pagina={pagina} setPagina={setPagina} />
      <main style={{ flex: 1, overflowY: 'auto', maxHeight: '100vh', background: '#F5F5F5' }}>
        <Pagina navegar={navegar} filtroInicial={filtroInicial} />
      </main>
    </div>
  );
}
