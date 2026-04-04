import React, { useState } from 'react';
import Sidebar from './src/components/Sidebar';
import Dashboard from './src/pages/Dashboard';
import Inventario from './src/pages/Inventario';
import Historial from './src/pages/Historial';
import ImportarExcel from './src/pages/ImportarExcel';

const PAGINAS = { dashboard: Dashboard, inventario: Inventario, historial: Historial, importar: ImportarExcel };

export default function App() {
  const [pagina, setPagina] = useState('dashboard');
  const Pagina = PAGINAS[pagina] || Dashboard;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Sidebar pagina={pagina} setPagina={setPagina} />
      <main style={{ flex: 1, overflowY: 'auto', maxHeight: '100vh', background: '#0f172a' }}>
        <Pagina />
      </main>
    </div>
  );
}
