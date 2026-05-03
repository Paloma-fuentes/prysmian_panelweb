/**
 * inventarioService.js — Panel Web
 * Misma colección 'materiales' que la app móvil.
 */
import {
  collection, doc, getDocs, getDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'materiales';

// ── Tiempo real ─────────────────────────────────────────────────────────────
export function escucharMateriales(callback) {
  const q = query(collection(db, COL), orderBy('descripcion'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── Lecturas ────────────────────────────────────────────────────────────────
export async function getMateriales(filtros = {}) {
  let q;
  if (filtros.bajoStock)     q = query(collection(db, COL), where('bajoStock', '==', true));
  else if (filtros.sinStock)  q = query(collection(db, COL), where('stock', '==', 0));
  else if (filtros.criticos)  q = query(collection(db, COL), where('esCritico', '==', true));
  else if (filtros.conStock)  q = query(collection(db, COL), where('stock', '>', 0), orderBy('stock'));
  else if (filtros.sinRotacion) {
    const [matSnap, histSnap] = await Promise.all([
      getDocs(query(collection(db, COL), where('stock', '>', 0))),
      getDocs(collection(db, 'historial')),
    ]);
    const hace90  = new Date(Date.now() - 90 * 86_400_000);
    const movidos = new Set(
      histSnap.docs
        .filter(d => { const f = d.data().fecha?.toDate?.(); return f && f >= hace90; })
        .map(d => d.data().materialId || d.data().producto)
    );
    return matSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => !movidos.has(m.id) && !movidos.has(m.descripcion));
  } else {
    q = query(collection(db, COL), orderBy('descripcion'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function buscarMateriales(texto) {
  const snap = await getDocs(query(collection(db, COL), orderBy('descripcion')));
  const t    = texto.toLowerCase();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(m =>
      m.descripcion?.toLowerCase().includes(t) ||
      m.codigoSAP?.toLowerCase().includes(t)   ||
      m.ubicacion?.toLowerCase().includes(t)
    );
}

export async function getMaterial(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ── Escritura ────────────────────────────────────────────────────────────────
export async function crearMaterial(datos) {
  return await addDoc(collection(db, COL), {
    ...datos,
    stock:         Number(datos.stock)        || 0,
    puntoReorden:  Number(datos.puntoReorden) || 0,
    bajoStock:     (Number(datos.stock) || 0) <= (Number(datos.puntoReorden) || 0),
    esCritico:     datos.esCritico || false,
    creadoEn:      serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
}

export async function editarMaterial(id, datos) {
  await updateDoc(doc(db, COL, id), { ...datos, actualizadoEn: serverTimestamp() });
}

export async function eliminarMaterial(id) {
  await deleteDoc(doc(db, COL, id));
}

export async function actualizarStock(materialId, delta) {
  await updateDoc(doc(db, COL, materialId), {
    stock:         increment(delta),
    actualizadoEn: serverTimestamp(),
  });
}

export async function importarLote(items) {
  await Promise.all(items.map(item =>
    addDoc(collection(db, COL), {
      ...item,
      bajoStock:     (Number(item.stock) || 0) <= (Number(item.puntoReorden) || 0),
      esCritico:     false,
      creadoEn:      serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    })
  ));
}
