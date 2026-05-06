/**
 * solicitudesCompraService.js — Panel Web
 * Misma colección 'solicitudes_compra' que la app móvil.
 */
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, where, writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'solicitudes_compra';

export async function crearSolicitudCompra(datos) {
  return await addDoc(collection(db, COL), {
    ...datos,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    estado: 'en espera'
  });
}

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

// ── Editar contenido ────────────────────────────────────────────────────────
export async function editarSolicitudCompra(id, datos) {
  await updateDoc(doc(db, COL, id), { ...datos, actualizadoEn: serverTimestamp() });
}

// ── Eliminar ────────────────────────────────────────────────────────────────
export async function eliminarSolicitudCompra(id) {
  await deleteDoc(doc(db, COL, id));
}

// ── Borrar Todo (Personal) ──────────────────────────────────────────────────
export async function borrarTodasMisSolicitudesCompra(usuario) {
  const q = query(collection(db, COL), where('usuario', '==', usuario));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
