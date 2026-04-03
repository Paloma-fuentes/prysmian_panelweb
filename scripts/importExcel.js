/**
 * Script para importar Prysmian.xlsx directamente a Firestore desde Node.js.
 * Uso: node scripts/importExcel.js
 */
const XLSX = require('xlsx');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch, serverTimestamp } = require('firebase/firestore');
const path = require('path');

const firebaseConfig = {
  apiKey: 'AIzaSyCcYFlzI97qbothPgA8jM7qiTqzp-bWW4o',
  authDomain: 'prysmian-29126.firebaseapp.com',
  projectId: 'prysmian-29126',
  storageBucket: 'prysmian-29126.firebasestorage.app',
  messagingSenderId: '994445019938',
  appId: '1:994445019938:web:c016e05afa89e86781f37b',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importarEnLotes(coleccion, items, LOTE = 400) {
  let total = 0;
  for (let i = 0; i < items.length; i += LOTE) {
    const batch = writeBatch(db);
    items.slice(i, i + LOTE).forEach(item => batch.set(doc(collection(db, coleccion)), item));
    await batch.commit();
    total += Math.min(LOTE, items.length - i);
    process.stdout.write(`\r  → ${total}/${items.length}`);
  }
  console.log('');
  return total;
}

async function main() {
  const archivoExcel = process.argv[2] || path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', 'Prysmian.xlsx');
  console.log(`\n📂 Leyendo: ${archivoExcel}\n`);

  const wb = XLSX.readFile(archivoExcel);
  console.log(`Hojas: ${wb.SheetNames.join(', ')}\n`);

  // ── Inventario ──────────────────────────────────────────────────────
  if (wb.SheetNames.includes('Inventario')) {
    console.log('📦 Importando Inventario...');
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['Inventario']);
    const items = raw
      .map(r => ({
        descripcion: (r['DESCRIPCION'] || '').toString().trim(),
        ubicacion: (r['UBICACIÓN'] || r['UBICACION'] || '').toString().trim(),
        stock: Number(r['STOCK']) || 0,
        puntoReorden: Number(r['PUNTO DE REORDEN']) || 0,
        solicitado: !!r['SOLICITADO'],
        codigoSAP: '',
        bajoStock: (Number(r['PUNTO DE REORDEN']) > 0) && (Number(r['STOCK']) <= Number(r['PUNTO DE REORDEN'])),
        esCritico: !!r['SOLICITADO'] && Number(r['STOCK']) === 0,
      }))
      .filter(i => i.descripcion);
    const n = await importarEnLotes('materiales', items);
    console.log(`✅ Inventario: ${n} productos\n`);
  }

  // ── Retiros ──────────────────────────────────────────────────────────
  if (wb.SheetNames.includes('Retiros')) {
    console.log('📋 Importando Retiros...');
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['Retiros']);
    const items = raw
      .map(r => ({
        tipo: 'retiro',
        fecha: r['FECHA'] ? new Date(r['FECHA']) : new Date(),
        usuario: (r['USUARIO'] || '').toString(),
        producto: (r['PRODUCTO'] || '').toString().trim(),
        cantidad: Number(r['CANTIDAD RETIRADA']) || 0,
        maquina: (r['MAQUINA'] || 'N/A').toString(),
        estado: r['ESTADO'] || '',
        ordenRetiro: r['ORDEN_RETIRO'] || '',
        stockTras: Number(r['STOCK']) || 0,
      }))
      .filter(i => i.producto);
    const n = await importarEnLotes('historial', items);
    console.log(`✅ Retiros: ${n} registros\n`);
  }

  // ── Ingresos ─────────────────────────────────────────────────────────
  if (wb.SheetNames.includes('Ingresos')) {
    console.log('📥 Importando Ingresos...');
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['Ingresos']);
    const items = raw
      .map(r => ({
        tipo: 'ingreso',
        fecha: r['FECHA'] ? new Date(r['FECHA']) : new Date(),
        usuario: (r['USUARIO'] || '').toString(),
        producto: (r['PRODUCTO'] || '').toString().trim(),
        cantidad: Number(r['CANTIDAD INGRESADA']) || 0,
        maquina: 'N/A',
        estado: 'Ingresado',
        ordenIngreso: r['ORDEN_ING'] || '',
      }))
      .filter(i => i.producto);
    const n = await importarEnLotes('historial', items);
    console.log(`✅ Ingresos: ${n} registros\n`);
  }

  // ── Devoluciones ─────────────────────────────────────────────────────
  if (wb.SheetNames.includes('Devolucion')) {
    console.log('↩️  Importando Devoluciones...');
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['Devolucion']);
    const items = raw
      .map(r => ({
        tipo: 'devolucion',
        fecha: r['FECHA'] ? new Date(r['FECHA']) : new Date(),
        usuario: (r['USUARIO'] || '').toString(),
        producto: (r['PRODUCTO'] || '').toString().trim(),
        cantidad: Number(r['CANTIDAD DEVUELTA']) || 0,
        maquina: (r['MAQUINA'] || 'N/A').toString(),
        estado: r['ESTADO'] || '',
        ordenDev: r['ORDEN_DEV'] || '',
      }))
      .filter(i => i.producto);
    const n = await importarEnLotes('historial', items);
    console.log(`✅ Devoluciones: ${n} registros\n`);
  }

  // ── Máquinas ─────────────────────────────────────────────────────────
  if (wb.SheetNames.includes('Maquinas')) {
    console.log('⚙️  Importando Máquinas...');
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['Maquinas'], { header: 1 });
    const items = raw.slice(1).map(r => ({ nombre: (r[0] || '').toString().trim() })).filter(i => i.nombre);
    const n = await importarEnLotes('maquinas', items, 400);
    console.log(`✅ Máquinas: ${n} registros\n`);
  }

  console.log('🎉 Importación completa.\n');
  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
