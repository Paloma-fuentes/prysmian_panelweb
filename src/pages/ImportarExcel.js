import { useState } from 'react';
import { C, G } from '../theme';
import * as XLSX from 'xlsx';
import { importarLote } from '../services/inventarioService';
import { importarHistorialLote } from '../services/historialService';
import { serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ImportarExcel({ perfil }) {
  const puedeEditar = (perfil?.rol || '').toLowerCase() === 'panol';
  const [progreso, setProgreso] = useState(null);
  const [log, setLog] = useState([]);
  const [procesando, setProcesando] = useState(false);

  if (!puedeEditar) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Acceso restringido</div>
        <div style={{ fontSize: 13, marginTop: 8 }}>Solo el rol Pañol puede gestionar importaciones masivas.</div>
      </div>
    </div>
  );

  function addLog(msg, tipo = 'info') {
    setLog(l => [...l, { msg, tipo, t: new Date().toLocaleTimeString() }]);
  }

  async function handleArchivo(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setProcesando(true);
    setLog([]);
    setProgreso(null);

    try {
      addLog(`📂 Leyendo: ${archivo.name}`);
      const buffer = await archivo.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      addLog(`✅ Hojas encontradas: ${wb.SheetNames.join(', ')}`);

      // ── 1. Inventario ───────────────────────────────────────────────
      if (wb.SheetNames.includes('Inventario')) {
        addLog('📦 Procesando Inventario...');
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['Inventario']);
        const items = raw.map(r => ({
          descripcion: (r['DESCRIPCION'] || '').toString().trim(),
          ubicacion: (r['UBICACIÓN'] || r['UBICACION'] || '').toString().trim(),
          stock: Number(r['STOCK']) || 0,
          puntoReorden: Number(r['PUNTO DE REORDEN']) || 0,
          solicitado: !!r['SOLICITADO'],
          codigoSAP: '',
        })).filter(i => i.descripcion);

        setProgreso({ texto: 'Subiendo inventario...', actual: 0, total: items.length });
        const total = await importarLote(items);
        addLog(`✅ Inventario: ${total} productos importados`, 'success');
      }

      // ── 2. Retiros ───────────────────────────────────────────────────
      if (wb.SheetNames.includes('Retiros')) {
        addLog('📋 Procesando Retiros...');
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['Retiros']);
        const items = raw.map(r => ({
          tipo: 'retiro',
          fecha: r['FECHA'] ? new Date(r['FECHA']) : new Date(),
          usuario: r['USUARIO']?.toString() || '',
          producto: (r['PRODUCTO'] || '').toString().trim(),
          cantidad: Number(r['CANTIDAD RETIRADA']) || 0,
          maquina: r['MAQUINA']?.toString() || 'N/A',
          estado: r['ESTADO'] || '',
          ordenRetiro: r['ORDEN_RETIRO'] || '',
          stock: Number(r['STOCK']) || 0,
        })).filter(i => i.producto);

        const total = await importarHistorialLote(items);
        addLog(`✅ Retiros: ${total} registros importados`, 'success');
      }

      // ── 3. Ingresos ───────────────────────────────────────────────────
      if (wb.SheetNames.includes('Ingresos')) {
        addLog('📥 Procesando Ingresos...');
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['Ingresos']);
        const items = raw.map(r => ({
          tipo: 'ingreso',
          fecha: r['FECHA'] ? new Date(r['FECHA']) : new Date(),
          usuario: r['USUARIO']?.toString() || '',
          producto: (r['PRODUCTO'] || '').toString().trim(),
          cantidad: Number(r['CANTIDAD INGRESADA']) || 0,
          maquina: 'N/A',
          estado: 'Ingresado',
          ordenIngreso: r['ORDEN_ING'] || '',
        })).filter(i => i.producto);

        const total = await importarHistorialLote(items);
        addLog(`✅ Ingresos: ${total} registros importados`, 'success');
      }

      // ── 4. Devoluciones ───────────────────────────────────────────────
      if (wb.SheetNames.includes('Devolucion')) {
        addLog('↩️ Procesando Devoluciones...');
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['Devolucion']);
        const items = raw.map(r => ({
          tipo: 'devolucion',
          fecha: r['FECHA'] ? new Date(r['FECHA']) : new Date(),
          usuario: r['USUARIO']?.toString() || '',
          producto: (r['PRODUCTO'] || '').toString().trim(),
          cantidad: Number(r['CANTIDAD DEVUELTA']) || 0,
          maquina: (r['MAQUINA'] || 'N/A').toString(),
          estado: r['ESTADO'] || '',
          ordenDev: r['ORDEN_DEV'] || '',
        })).filter(i => i.producto);

        const total = await importarHistorialLote(items);
        addLog(`✅ Devoluciones: ${total} registros importados`, 'success');
      }

      setProgreso(null);
      addLog('🎉 Importación completa. Actualiza el Dashboard para ver los datos.', 'success');
    } catch (err) {
      addLog(`❌ Error: ${err.message}`, 'error');
    } finally {
      setProcesando(false);
      e.target.value = '';
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', background: C.background }}>
      {/* ── Header Premium ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 40px 30px', background: '#fff', borderBottom: `1px solid ${C.border}`, width: '100%', boxSizing: 'border-box' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.secondary, margin: 0, letterSpacing: -0.5 }}>Importación de Datos Maestro</h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 4 }}>Sincronización masiva de inventario y movimientos vía Excel</p>
        </div>
        <div style={{ background: 'rgba(244,130,31,0.1)', color: C.primary, padding: '10px 20px', borderRadius: 14, fontSize: 13, fontWeight: 800 }}>
          FORMATO REQUERIDO: .XLSX
        </div>
      </header>

      <main style={{ padding: '40px', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 30 }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
          
          {/* Zona de Carga */}
          <div style={{ ...G.glass, background: '#fff', padding: '40px', borderRadius: 28, textAlign: 'center', boxShadow: G.cardShadowLg, border: `2px dashed ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>📊</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.secondary, marginBottom: 10 }}>Subir Archivo Prysmian.xlsx</h2>
            <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 30, maxWidth: 300 }}>Asegúrate de que el archivo contenga las pestañas correspondientes para una carga exitosa.</p>
            
            <label style={{ background: C.primary, color: '#fff', padding: '16px 32px', borderRadius: 16, cursor: procesando ? 'default' : 'pointer', fontWeight: 800, fontSize: 15, transition: 'all 0.2s', boxShadow: '0 8px 16px rgba(244,130,31,0.25)', opacity: procesando ? 0.6 : 1 }}>
              {procesando ? 'PROCESANDO DATOS...' : 'SELECCIONAR ARCHIVO EXCEL'}
              <input type="file" accept=".xlsx,.xls" onChange={handleArchivo} disabled={procesando} style={{ display: 'none' }} />
            </label>
            
            {progreso && (
              <div style={{ marginTop: 25, width: '100%', maxWidth: 300 }}>
                <div style={{ height: 8, background: C.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                   <div style={{ height: '100%', width: '100%', background: C.primary, animation: 'pulse 2s infinite' }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.primary }}>{progreso.texto}</p>
              </div>
            )}
          </div>

          {/* Consola de Logs */}
          <div style={{ ...G.glass, background: C.secondary, padding: '30px', borderRadius: 28, boxShadow: G.cardShadowLg, display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 800, marginBottom: 15, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: procesando ? '#fbbf24' : '#10b981' }} />
              CONSOLA DE IMPORTACIÓN
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 350, fontFamily: 'monospace', fontSize: 13, color: '#a5f3fc' }}>
              {log.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 100 }}>Esperando archivo...</div>
              ) : (
                log.map((l, i) => (
                  <div key={i} style={{ marginBottom: 6, display: 'flex', gap: 10, color: l.tipo === 'error' ? '#fca5a5' : l.tipo === 'success' ? '#86efac' : '#a5f3fc' }}>
                    <span style={{ opacity: 0.4 }}>[{l.t}]</span>
                    <span>{l.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Guía de Estructura */}
        <div style={{ ...G.glass, background: '#fff', padding: '30px', borderRadius: 28, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
           <h3 style={{ fontSize: 16, fontWeight: 800, color: C.secondary, marginBottom: 20 }}>Estructura de Datos Requerida</h3>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
             {[
               { h: 'Inventario', c: 'DESCRIPCION, UBICACIÓN, STOCK, PUNTO DE REORDEN' },
               { h: 'Retiros', c: 'FECHA, USUARIO, PRODUCTO, CANTIDAD RETIRADA, MAQUINA' },
               { h: 'Ingresos', c: 'FECHA, USUARIO, PRODUCTO, CANTIDAD INGRESADA' },
               { h: 'Devolucion', c: 'FECHA, USUARIO, PRODUCTO, MAQUINA, CANTIDAD DEVUELTA' },
             ].map(info => (
               <div key={info.h} style={{ padding: '20px', borderRadius: 20, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                 <div style={{ fontWeight: 900, fontSize: 13, color: C.primary, marginBottom: 8 }}>{info.h.toUpperCase()}</div>
                 <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600, lineHeight: 1.5 }}>{info.c}</div>
               </div>
             ))}
           </div>
        </div>

      </main>
    </div>
  );
}

const s = {
  container:    { width: '100%', color: C.text },
  titulo:       { fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 },
  desc:         { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  uploadArea:   { background: C.surface, border: `2px dashed ${C.border}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center', marginBottom: 20 },
  uploadIcon:   { fontSize: 48, marginBottom: 12 },
  uploadText:   { color: C.textSecondary, marginBottom: 16 },
  btnPrimary:   { background: C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'inline-block' },
  progreso:     { background: '#fff3e0', border: `1px solid ${C.primary}`, borderRadius: 8, padding: 16, marginBottom: 16 },
  progresoTexto:{ color: C.primary, margin: 0, fontSize: 14, fontWeight: 600 },
  logBox:       { background: C.secondary, borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, marginBottom: 20, maxHeight: 260, overflowY: 'auto', color: '#a5f3fc' },
  logLine:      { marginBottom: 4 },
  logTime:      { color: 'rgba(255,255,255,0.4)', marginRight: 8 },
  infoBox:      { background: C.surface, borderRadius: 10, padding: 20, border: `1px solid ${C.border}` },
  infoTitulo:   { fontSize: 14, fontWeight: 700, color: C.textSecondary, marginTop: 0, marginBottom: 14 },
  infoFila:     { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  infoBadge:    { background: `${C.primary}15`, color: C.primary, padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', border: `1px solid ${C.primary}` },
  infoCols:     { color: C.textSecondary, fontSize: 12 },
};
