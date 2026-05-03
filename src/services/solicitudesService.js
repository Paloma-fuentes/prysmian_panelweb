/**
 * solicitudesService.js — Panel Web
 * Usa exactamente los mismos campos que la app móvil:
 * - creadoEn (no fechaCreacion)
 * - estado: 'pendiente_entrega' (no 'pendiente')
 * - tipo: 'retiro'
 */
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp, increment, writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL  = 'solicitudes';
const MAT  = 'materiales';
const HIST = 'historial';

// ── Tiempo real (onSnapshot) ────────────────────────────────────────────────
export function escucharSolicitudes(callback, limite = 300) {
  const q = query(collection(db, COL), orderBy('creadoEn', 'desc'), limit(limite));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── Lecturas puntuales ──────────────────────────────────────────────────────
export async function getSolicitudes(limite = 300) {
  const q    = query(collection(db, COL), orderBy('creadoEn', 'desc'), limit(limite));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Crear retiro (mismos campos que la app móvil) ──────────────────────────
export async function crearSolicitud({ producto, materialId, cantidad, maquina, parteMaquina, usuario, notas = '' }) {
  return await addDoc(collection(db, COL), {
    producto,
    materialId:   materialId || '',
    cantidad:     Number(cantidad),
    maquina:      maquina      || 'N/A',
    parteMaquina: parteMaquina || 'General',
    usuario:      usuario      || '',
    notas,
    tipo:         'retiro',
    estado:       'pendiente_entrega',   // igual que móvil
    creadoEn:     serverTimestamp(),     // igual que móvil
    actualizadoEn: serverTimestamp(),
  });
}

// ── Confirmar entrega (pañol entrega físicamente) ──────────────────────────
export async function entregarSolicitud(solicitudId, { materialId, producto, cantidad, maquina, parteMaquina, usuario }) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL, solicitudId), {
    estado:        'entregado',
    actualizadoEn: serverTimestamp(),
  });
  if (materialId) {
    batch.update(doc(db, MAT, materialId), {
      stock:        increment(-Number(cantidad)),
      bajoStock:    false,
      actualizadoEn: serverTimestamp(),
    });
  }
  batch.set(doc(collection(db, HIST)), {
    tipo:        'retiro',
    solicitudId,
    materialId:   materialId   || '',
    producto,
    cantidad:     Number(cantidad),
    maquina:      maquina      || '',
    parteMaquina: parteMaquina || '',
    usuario:      usuario      || '',
    estado:       'entregado',
    fecha:        serverTimestamp(),
  });
  await batch.commit();
}

// ── Cancelar ────────────────────────────────────────────────────────────────
export async function cancelarSolicitud(solicitudId) {
  await updateDoc(doc(db, COL, solicitudId), {
    estado:        'cancelado',
    actualizadoEn: serverTimestamp(),
  });
}

// ── Devolución aprobada ─────────────────────────────────────────────────────
export async function aprobarDevolucion(solicitudId, { materialId, producto, cantidad, usuario }) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL, solicitudId), { estado: 'devuelto', actualizadoEn: serverTimestamp() });
  if (materialId) {
    batch.update(doc(db, MAT, materialId), { stock: increment(Number(cantidad)), actualizadoEn: serverTimestamp() });
  }
  batch.set(doc(collection(db, HIST)), {
    tipo: 'devolucion', solicitudId, materialId: materialId || '',
    producto, cantidad: Number(cantidad), maquina: '', usuario: usuario || '',
    estado: 'devuelto', fecha: serverTimestamp(),
  });
  await batch.commit();
}

// ── Rechazar devolución ─────────────────────────────────────────────────────
export async function rechazarDevolucion(solicitudId) {
  await updateDoc(doc(db, COL, solicitudId), { estado: 'rechazado', actualizadoEn: serverTimestamp() });
}

// ── Retornar (equivocado) ───────────────────────────────────────────────────
export async function retornarSolicitud(solicitudId, { materialId, producto, cantidad, usuario }) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL, solicitudId), { estado: 'revertido', actualizadoEn: serverTimestamp() });
  if (materialId) {
    batch.update(doc(db, MAT, materialId), { stock: increment(Number(cantidad)), actualizadoEn: serverTimestamp() });
  }
  batch.set(doc(collection(db, HIST)), {
    tipo: 'revertido', solicitudId, materialId: materialId || '',
    producto, cantidad: Number(cantidad), maquina: '', usuario: usuario || '',
    estado: 'revertido', fecha: serverTimestamp(),
  });
  await batch.commit();
}

// ── Editar / Eliminar ───────────────────────────────────────────────────────
export async function editarSolicitud(id, datos) {
  await updateDoc(doc(db, COL, id), { ...datos, actualizadoEn: serverTimestamp() });
}

export async function eliminarSolicitud(id) {
  await deleteDoc(doc(db, COL, id));
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export async function getMaquinas() {
  const snap = await getDocs(collection(db, HIST));
  const set  = new Set();
  snap.docs.forEach(d => { const m = d.data().maquina; if (m && m !== 'N/A') set.add(m); });
  return Array.from(set).sort();
}

export async function getUsuariosPanel() {
  const snap = await getDocs(collection(db, 'usuarios'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
