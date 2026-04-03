import {
  collection, doc, getDocs, addDoc, query,
  orderBy, limit, where, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'historial';

export async function getHistorial(limite = 200) {
  const snap = await getDocs(query(collection(db, COL), orderBy('fecha', 'desc'), limit(limite)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRetirosPorMes(año, mes) {
  const inicio = new Date(año, mes - 1, 1);
  const fin = new Date(año, mes, 1);
  const snap = await getDocs(
    query(collection(db, COL),
      where('tipo', '==', 'retiro'),
      where('fecha', '>=', inicio),
      where('fecha', '<', fin)
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function importarHistorialLote(items) {
  const LOTE = 400;
  let total = 0;
  for (let i = 0; i < items.length; i += LOTE) {
    const batch = writeBatch(db);
    items.slice(i, i + LOTE).forEach(item => {
      batch.set(doc(collection(db, COL)), item);
    });
    await batch.commit();
    total += Math.min(LOTE, items.length - i);
  }
  return total;
}
