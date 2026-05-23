import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'herramientas';

let _unsub = null;
const _cbs = new Set();

function _iniciarListener() {
  if (_unsub) return;
  const q = query(collection(db, COL), orderBy('nombre'));
  _unsub = onSnapshot(q, snap => {
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _cbs.forEach(cb => { try { cb(lista); } catch {} });
  }, () => { _unsub = null; });
}

export function suscribirHerramientas(onData) {
  _cbs.add(onData);
  _iniciarListener();
  return () => {
    _cbs.delete(onData);
    if (_cbs.size === 0 && _unsub) { _unsub(); _unsub = null; }
  };
}

export async function tomarHerramienta(id, { uid, nombre }, cantidad = 1) {
  const ref = doc(db, COL, id);
  await runTransaction(db, async t => {
    const snap = await t.get(ref);
    if (!snap.exists()) throw new Error('not_found');
    const data = snap.data();
    const disponible = data.cantidadDisponible ?? data.cantidadTotal ?? 1;
    if (disponible < cantidad) throw new Error('sin_stock');
    const prestamos = data.prestamos ?? [];
    const existente = prestamos.find(p => p.uid === uid);
    let nuevosPrestamos;
    if (existente) {
      nuevosPrestamos = prestamos.map(p =>
        p.uid === uid ? { ...p, cantidad: p.cantidad + cantidad, tomadaEn: new Date() } : p
      );
    } else {
      nuevosPrestamos = [...prestamos, { uid, nombre, cantidad, tomadaEn: new Date() }];
    }
    t.update(ref, { cantidadDisponible: disponible - cantidad, prestamos: nuevosPrestamos });
  });
}

export async function devolverHerramienta(id, uid) {
  const ref = doc(db, COL, id);
  await runTransaction(db, async t => {
    const snap = await t.get(ref);
    if (!snap.exists()) throw new Error('not_found');
    const data = snap.data();
    const prestamos = data.prestamos ?? [];
    const prestamo = prestamos.find(p => p.uid === uid);
    if (!prestamo) return;
    const nuevosPrestamos = prestamos.filter(p => p.uid !== uid);
    const nueva = (data.cantidadDisponible ?? 0) + prestamo.cantidad;
    t.update(ref, {
      cantidadDisponible: Math.min(nueva, data.cantidadTotal ?? nueva),
      prestamos: nuevosPrestamos,
    });
  });
}

export async function agregarHerramienta({ nombre, descripcion, categoria, ubicacion, cantidadTotal }) {
  const total = parseInt(cantidadTotal, 10) || 1;
  await addDoc(collection(db, COL), {
    nombre:             nombre.trim(),
    descripcion:        (descripcion || '').trim(),
    categoria:          categoria || 'Otra',
    ubicacion:          (ubicacion || '').trim(),
    cantidadTotal:      total,
    cantidadDisponible: total,
    prestamos:          [],
    creadoEn:           serverTimestamp(),
  });
}

export async function editarHerramienta(id, { nombre, descripcion, categoria, ubicacion, cantidadTotal }) {
  const ref = doc(db, COL, id);
  if (cantidadTotal !== undefined) {
    const newTotal = parseInt(cantidadTotal, 10) || 1;
    await runTransaction(db, async t => {
      const snap = await t.get(ref);
      const data = snap.exists() ? snap.data() : {};
      const prestados = (data.prestamos ?? []).reduce((s, p) => s + (p.cantidad ?? 1), 0);
      t.update(ref, {
        nombre:             nombre.trim(),
        descripcion:        (descripcion || '').trim(),
        categoria:          categoria || 'Otra',
        ubicacion:          (ubicacion || '').trim(),
        cantidadTotal:      newTotal,
        cantidadDisponible: Math.max(0, newTotal - prestados),
      });
    });
  } else {
    await updateDoc(ref, {
      nombre:      nombre.trim(),
      descripcion: (descripcion || '').trim(),
      categoria:   categoria || 'Otra',
      ubicacion:   (ubicacion || '').trim(),
    });
  }
}

export async function eliminarHerramienta(id) {
  await deleteDoc(doc(db, COL, id));
}
