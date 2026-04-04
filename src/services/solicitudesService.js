import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp, increment, writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'solicitudes';
const MAT = 'materiales';
const HIST = 'historial';

// Crear solicitud (estado pendiente, NO descuenta stock)
export async function crearSolicitud({ producto, materialId, cantidad, maquina, usuario, tipo = 'retiro', notas = '' }) {
  return await addDoc(collection(db, COL), {
    producto,
    materialId: materialId || '',
    cantidad: Number(cantidad),
    maquina: maquina || '',
    usuario: usuario || '',
    tipo,
    notas,
    estado: 'pendiente',
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
  });
}

// Entregar solicitud: descuenta stock + registra en historial
export async function entregarSolicitud(solicitudId, { materialId, producto, cantidad, maquina, usuario }) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL, solicitudId), {
    estado: 'entregado',
    fechaActualizacion: serverTimestamp(),
  });
  if (materialId) {
    batch.update(doc(db, MAT, materialId), {
      stock: increment(-Number(cantidad)),
      actualizadoEn: serverTimestamp(),
    });
  }
  batch.set(doc(collection(db, HIST)), {
    tipo: 'retiro',
    solicitudId,
    materialId: materialId || '',
    producto,
    cantidad: Number(cantidad),
    maquina: maquina || '',
    usuario: usuario || '',
    estado: 'entregado',
    fecha: serverTimestamp(),
  });
  await batch.commit();
}

// Cancelar solicitud (no modifica stock)
export async function cancelarSolicitud(solicitudId) {
  await updateDoc(doc(db, COL, solicitudId), {
    estado: 'cancelado',
    fechaActualizacion: serverTimestamp(),
  });
}

// Aprobar devolución: sube el stock + registra en historial
export async function aprobarDevolucion(solicitudId, { materialId, producto, cantidad, usuario }) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL, solicitudId), {
    estado: 'devuelto',
    fechaActualizacion: serverTimestamp(),
  });
  if (materialId) {
    batch.update(doc(db, MAT, materialId), {
      stock: increment(Number(cantidad)),
      actualizadoEn: serverTimestamp(),
    });
  }
  batch.set(doc(collection(db, HIST)), {
    tipo: 'devolucion',
    solicitudId,
    materialId: materialId || '',
    producto,
    cantidad: Number(cantidad),
    maquina: '',
    usuario: usuario || '',
    estado: 'devuelto',
    fecha: serverTimestamp(),
  });
  await batch.commit();
}

// Rechazar devolución (no modifica stock)
export async function rechazarDevolucion(solicitudId) {
  await updateDoc(doc(db, COL, solicitudId), {
    estado: 'rechazado',
    fechaActualizacion: serverTimestamp(),
  });
}

// Retorno por producto equivocado: revierte el descuento de stock
export async function retornarSolicitud(solicitudId, { materialId, producto, cantidad, usuario }) {
  const batch = writeBatch(db);
  batch.update(doc(db, COL, solicitudId), {
    estado: 'retornado',
    fechaActualizacion: serverTimestamp(),
  });
  if (materialId) {
    batch.update(doc(db, MAT, materialId), {
      stock: increment(Number(cantidad)),
      actualizadoEn: serverTimestamp(),
    });
  }
  batch.set(doc(collection(db, HIST)), {
    tipo: 'devolucion',
    solicitudId,
    materialId: materialId || '',
    producto,
    cantidad: Number(cantidad),
    maquina: '',
    usuario: usuario || '',
    estado: 'retornado',
    fecha: serverTimestamp(),
  });
  await batch.commit();
}

export async function getSolicitudes(limite = 200) {
  const q = query(collection(db, COL), orderBy('fechaCreacion', 'desc'), limit(limite));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function editarSolicitud(id, datos) {
  await updateDoc(doc(db, COL, id), { ...datos, fechaActualizacion: serverTimestamp() });
}

export async function eliminarSolicitud(id) {
  await deleteDoc(doc(db, COL, id));
}

// Trae máquinas únicas desde historial
export async function getMaquinas() {
  const snap = await getDocs(collection(db, 'historial'));
  const set = new Set();
  snap.docs.forEach(d => { const m = d.data().maquina; if (m && m !== 'N/A') set.add(m); });
  return Array.from(set).sort();
}

// Trae usuarios del panel desde colección 'usuarios'
export async function getUsuariosPanel() {
  const snap = await getDocs(collection(db, 'usuarios'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
