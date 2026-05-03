import {
  collection, doc, getDocs, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'solicitudes_compra';

export async function getSolicitudesCompra() {
  const q = query(collection(db, COL), orderBy('creadoEn', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function actualizarEstado(id, estado) {
  await updateDoc(doc(db, COL, id), {
    estado,
    actualizadoEn: serverTimestamp(),
  });
}

export async function eliminarSolicitudCompra(id) {
  await deleteDoc(doc(db, COL, id));
}
