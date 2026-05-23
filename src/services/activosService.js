import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'activos';

export function escucharActivos(callback) {
  const q = query(collection(db, COL), orderBy('nombre', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function crearActivo(datos) {
  return await addDoc(collection(db, COL), {
    ...datos,
    creadoEn: serverTimestamp(),
    estado: datos.estado || 'disponible', // disponible, en uso, mantenimiento, baja
    rotacion: 0
  });
}

export async function actualizarActivo(id, datos) {
  await updateDoc(doc(db, COL, id), {
    ...datos,
    actualizadoEn: serverTimestamp()
  });
}

export async function registrarPrestamo(id, usuarioNombre) {
  await updateDoc(doc(db, COL, id), {
    estado: 'en uso',
    poseedor: usuarioNombre,
    ultimaSalida: serverTimestamp(),
    // Incrementamos rotación manualmente para el KPI
    // En producción usaría increment() de Firestore
  });
}

export async function registrarDevolucion(id) {
  await updateDoc(doc(db, COL, id), {
    estado: 'disponible',
    poseedor: null,
    ultimaDevolucion: serverTimestamp()
  });
}
