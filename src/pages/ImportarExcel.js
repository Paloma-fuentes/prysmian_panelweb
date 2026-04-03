import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { importarLote } from '../services/inventarioService';
import { importarHistorialLote } from '../services/historialService';
import { serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ImportarExcel() {
  const [progreso, setProgreso] = useState(null);
  const [log, setLog] = useState([]);
  const [procesando, setProcesando] = useState(false);

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
    <div style={s.container}>
      <h1 style={s.titulo}>Importar desde Excel</h1>
      <p style={s.desc}>Sube el archivo <strong style={{ color: '#F4821F' }}>Prysmian.xlsx</strong> para sincronizar todos los datos con Firestore. Se procesarán las hojas: Inventario, Retiros, Ingresos y Devoluciones.</p>

      <div style={s.uploadArea}>
        <div style={s.uploadIcon}>📊</div>
        <p style={s.uploadText}>Selecciona el archivo Excel</p>
        <label style={s.btnPrimary}>
          {procesando ? 'Procesando...' : 'Seleccionar archivo .xlsx'}
          <input type="file" accept=".xlsx,.xls" onChange={handleArchivo} disabled={procesando} style={{ display: 'none' }} />
        </label>
      </div>

      {progreso && (
        <div style={s.progreso}>
          <p style={s.progresoTexto}>{progreso.texto}</p>
        </div>
      )}

      {log.length > 0 && (
        <div style={s.logBox}>
          {log.map((l, i) => (
            <div key={i} style={{ ...s.logLine, color: l.tipo === 'error' ? '#ef4444' : l.tipo === 'success' ? '#10b981' : '#d1d5db' }}>
              <span style={s.logTime}>{l.t}</span> {l.msg}
            </div>
          ))}
        </div>
      )}

      <div style={s.infoBox}>
        <h3 style={s.infoTitulo}>Estructura esperada del Excel</h3>
        {[
          ['Inventario', 'UBICACIÓN, STOCK, DESCRIPCION, PUNTO DE REORDEN, SOLICITADO'],
          ['Retiros', 'FECHA, USUARIO, PRODUCTO, CANTIDAD RETIRADA, MAQUINA, ESTADO'],
          ['Ingresos', 'FECHA, USUARIO, PRODUCTO, CANTIDAD INGRESADA'],
          ['Devolucion', 'FECHA, USUARIO, PRODUCTO, MAQUINA, CANTIDAD DEVUELTA, ESTADO'],
        ].map(([hoja, cols]) => (
          <div key={hoja} style={s.infoFila}>
            <span style={s.infoBadge}>{hoja}</span>
            <span style={s.infoCols}>{cols}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  container: { padding: 28, color: '#f9fafb', maxWidth: 800 },
  titulo: { fontSize: 24, fontWeight: 800, margin: '0 0 10px' },
  desc: { color: '#9ca3af', fontSize: 14, marginBottom: 28 },
  uploadArea: { background: '#1f2937', border: '2px dashed #374151', borderRadius: 12, padding: '40px 20px', textAlign: 'center', marginBottom: 24 },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadText: { color: '#9ca3af', marginBottom: 16 },
  btnPrimary: { background: '#F4821F', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'inline-block' },
  progreso: { background: '#1f2937', borderRadius: 8, padding: 16, marginBottom: 16 },
  progresoTexto: { color: '#F4821F', margin: 0, fontSize: 14 },
  logBox: { background: '#111827', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 13, marginBottom: 24, maxHeight: 300, overflowY: 'auto' },
  logLine: { marginBottom: 4 },
  logTime: { color: '#6b7280', marginRight: 8 },
  infoBox: { background: '#1f2937', borderRadius: 10, padding: 20 },
  infoTitulo: { fontSize: 14, fontWeight: 700, color: '#9ca3af', marginTop: 0, marginBottom: 14 },
  infoFila: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  infoBadge: { background: '#374151', color: '#F4821F', padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  infoCols: { color: '#6b7280', fontSize: 12 },
};
