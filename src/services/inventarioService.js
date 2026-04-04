import {
  collection, doc, getDocs, getDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  limit, writeBatch, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'materiales';

export async function getMateriales(filtros = {}) {
  let q = collection(db, COL);
  if (filtros.bajoStock) {
    q = query(q, where('bajoStock', '==', true));
  } else if (filtros.sinStock) {
    q = query(q, where('stock', '==', 0));
  } else if (filtros.criticos) {
    q = query(q, where('esCritico', '==', true));
  } else if (filtros.conStock) {
    q = query(q, where('stock', '>', 0), orderBy('stock'));
  } else if (filtros.sinRotacion) {
    // Obtiene materiales con stock sin movimiento en 90 días
    const [matSnap, histSnap] = await Promise.all([
      getDocs(query(collection(db, COL), where('stock', '>', 0))),
      getDocs(collection(db, 'historial')),
    ]);
    const hace90 = new Date();
    hace90.setDate(hace90.getDate() - 90);
    const movidos = new Set(
      histSnap.docs
        .map(d => d.data())
        .filter(h => { const f = h.fecha?.toDate ? h.fecha.toDate() : new Date(h.fecha); return f >= hace90; })
        .map(h => h.producto)
    );
    return matSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => !movidos.has(m.descripcion));
  } else {
    q = query(q, orderBy('descripcion'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMaterial(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function crearMaterial(datos) {
  const bajoStock = datos.puntoReorden > 0 && datos.stock <= datos.puntoReorden;
  return await addDoc(collection(db, COL), {
    ...datos,
    bajoStock,
    esCritico: datos.solicitado && datos.stock === 0,
    actualizadoEn: serverTimestamp(),
  });
}

export async function actualizarMaterial(id, datos, { stockAnterior = null, usuario = 'Admin' } = {}) {
  const bajoStock = datos.puntoReorden > 0 && datos.stock <= datos.puntoReorden;
  const batch = writeBatch(db);
  batch.update(doc(db, COL, id), {
    ...datos,
    bajoStock,
    esCritico: datos.solicitado && datos.stock === 0,
    actualizadoEn: serverTimestamp(),
  });
  // Registrar en historial si cambió el stock
  if (stockAnterior !== null && Number(stockAnterior) !== Number(datos.stock)) {
    const diff = Number(datos.stock) - Number(stockAnterior);
    batch.set(doc(collection(db, 'historial')), {
      tipo: diff > 0 ? 'ingreso' : 'ajuste',
      materialId: id,
      producto: datos.descripcion,
      cantidad: Math.abs(diff),
      maquina: '',
      usuario,
      estado: 'ajuste_manual',
      fecha: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function eliminarMaterial(id, { descripcion = '', usuario = 'Admin' } = {}) {
  const batch = writeBatch(db);
  batch.delete(doc(db, COL, id));
  batch.set(doc(collection(db, 'historial')), {
    tipo: 'eliminacion',
    materialId: id,
    producto: descripcion,
    cantidad: 0,
    maquina: '',
    usuario,
    estado: 'eliminado',
    fecha: serverTimestamp(),
  });
  await batch.commit();
}

export async function ajustarStock(id, cantidad, tipo, maquina, usuario) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL, id), {
    stock: increment(cantidad),
    actualizadoEn: serverTimestamp(),
  });
  batch.set(doc(collection(db, 'historial')), {
    tipo,
    materialId: id,
    cantidad: Math.abs(cantidad),
    maquina: maquina || 'N/A',
    usuario: usuario || 'Admin',
    fecha: serverTimestamp(),
  });
  await batch.commit();
}

export async function buscarMateriales(texto) {
  const todos = await getMateriales();
  const q = texto.toLowerCase();
  return todos.filter(m =>
    m.descripcion?.toLowerCase().includes(q) ||
    m.codigoSAP?.toLowerCase().includes(q) ||
    m.ubicacion?.toLowerCase().includes(q)
  );
}

// Importar en lotes desde Excel
export async function importarLote(items) {
  const LOTE = 400;
  let total = 0;
  for (let i = 0; i < items.length; i += LOTE) {
    const batch = writeBatch(db);
    const lote = items.slice(i, i + LOTE);
    lote.forEach(item => {
      const ref = doc(collection(db, COL));
      batch.set(ref, {
        descripcion: item.descripcion || '',
        ubicacion: item.ubicacion || '',
        stock: Number(item.stock) || 0,
        puntoReorden: Number(item.puntoReorden) || 0,
        solicitado: !!item.solicitado,
        codigoSAP: item.codigoSAP || '',
        bajoStock: item.puntoReorden > 0 && item.stock <= item.puntoReorden,
        esCritico: !!item.solicitado && item.stock === 0,
        actualizadoEn: serverTimestamp(),
      });
    });
    await batch.commit();
    total += lote.length;
  }
  return total;
}
