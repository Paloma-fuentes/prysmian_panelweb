/**
 * solicitudesCompraService.js — Panel Web
 * Misma colección 'solicitudes_compra' que la app móvil.
 */
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, where, writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notificarPanol } from './notificacionesService';


const COL = 'solicitudes_compra';

export async function crearSolicitudCompra(datos) {
  const ref = await addDoc(collection(db, COL), {
    ...datos,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    estado: 'en espera'
  });

  // Notificar al Pañol vía Push
  notificarPanol(
    '🛒 Nueva Solicitud de Compra',
    `${datos.usuario} solicita ${datos.cantidad}x ${datos.nombre || datos.producto} para ${datos.maquina || 'Stock'}.`,
    { tipo: 'compra' }
  ).catch(() => {});

  return ref;
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
export async function borrarTodasMisSolicitudesCompra(identificador) {
  // Buscamos coincidencias por UID (lo más seguro) o por nombre (historial antiguo)
  const q1 = query(collection(db, COL), where('usuarioUid', '==', identificador));
  const q2 = query(collection(db, COL), where('solicitanteUid', '==', identificador));
  const q3 = query(collection(db, COL), where('usuario', '==', identificador));

  const [s1, s2, s3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
  
  const batch = writeBatch(db);
  s1.docs.forEach(d => batch.delete(d.ref));
  s2.docs.forEach(d => batch.delete(d.ref));
  s3.docs.forEach(d => batch.delete(d.ref));
  
  await batch.commit();
}

