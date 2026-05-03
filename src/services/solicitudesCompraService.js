/**
 * solicitudesCompraService.js — Panel Web
 * Misma colección 'solicitudes_compra' que la app móvil.
 */
import {
  collection, doc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'solicitudes_compra';

// ── Tiempo real ─────────────────────────────────────────────────────────────
export function escucharSolicitudesCompra(callback) {
  const q = query(collection(db, COL), orderBy('creadoEn', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── Lectura puntual ─────────────────────────────────────────────────────────
export async function getSolicitudesCompra() {
  const snap = await getDocs(query(collection(db, COL), orderBy('creadoEn', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Actualizar estado ───────────────────────────────────────────────────────
export async function actualizarEstado(id, estado) {
  await updateDoc(doc(db, COL, id), { estado, actualizadoEn: serverTimestamp() });
}

// ── Eliminar ────────────────────────────────────────────────────────────────
export async function eliminarSolicitudCompra(id) {
  await deleteDoc(doc(db, COL, id));
}
