/**
 * Reimporta inventario con códigos SAP correctamente asociados.
 * Limpia la colección 'materiales' y vuelve a cargar con SAP matcheado por descripción.
 * Uso: node scripts/reimportarConSAP.js
 */
const XLSX = require('xlsx');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch, getDocs } = require('firebase/firestore');
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

async function borrarColeccion(nombre) {
  const snap = await getDocs(collection(db, nombre));
  const docs = snap.docs;
  console.log(`  Borrando ${docs.length} documentos de '${nombre}'...`);
  const LOTE = 400;
  for (let i = 0; i < docs.length; i += LOTE) {
    const batch = writeBatch(db);
    docs.slice(i, i + LOTE).forEach(d => batch.delete(d.ref));
    await batch.commit();
    process.stdout.write(`\r  → ${Math.min(i + LOTE, docs.length)}/${docs.length} eliminados`);
  }
  console.log('');
}

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

  // ── Construir mapa SAP: descripcion → codigo ──────────────────────────
  console.log('🔑 Construyendo mapa de códigos SAP...');
  const sapRaw = XLSX.utils.sheet_to_json(wb.Sheets['CodigoSAP']);
  const sapMap = {};
  sapRaw.forEach(r => {
    const desc = (r['Texto breve material'] || '').toUpperCase().trim();
    if (desc) sapMap[desc] = r['Material'];
  });
  console.log(`  → ${Object.keys(sapMap).length} códigos SAP indexados`);

  // ── Borrar colección actual ───────────────────────────────────────────
  console.log('\n🗑️  Limpiando colección materiales...');
  await borrarColeccion('materiales');

  // ── Reimportar con SAP asociado ───────────────────────────────────────
  console.log('\n📦 Reimportando inventario con códigos SAP...');
  const invRaw = XLSX.utils.sheet_to_json(wb.Sheets['Inventario']);

  let conSAP = 0;
  const items = invRaw
    .map(r => {
      const desc = (r['DESCRIPCION'] || '').toString().trim();
      const descUpper = desc.toUpperCase();
      const codigoSAP = sapMap[descUpper] || '';
      if (codigoSAP) conSAP++;
      const stock = Number(r['STOCK']) || 0;
      const puntoReorden = Number(r['PUNTO DE REORDEN']) || 0;
      const solicitado = !!r['SOLICITADO'];
      return {
        descripcion: desc,
        ubicacion: (r['UBICACIÓN'] || r['UBICACION'] || '').toString().trim(),
        stock,
        puntoReorden,
        solicitado,
        codigoSAP,
        bajoStock: puntoReorden > 0 && stock <= puntoReorden,
        esCritico: solicitado && stock === 0,
      };
    })
    .filter(i => i.descripcion);

  const total = await importarEnLotes('materiales', items);
  console.log(`✅ ${total} productos importados`);
  console.log(`   Con código SAP: ${conSAP} / ${total}`);
  console.log(`   Sin código SAP: ${total - conSAP} / ${total}`);

  console.log('\n🎉 Reimportación completa.\n');
  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
