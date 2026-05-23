import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COL = 'escobillas';

let _unsub = null;
const _cbs = new Set();

function _iniciarListener() {
  if (_unsub) return;
  const q = query(collection(db, COL), orderBy('descripcion'));
  _unsub = onSnapshot(q, snap => {
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _cbs.forEach(cb => { try { cb(lista); } catch {} });
  }, () => { _unsub = null; });
}

export function escucharEscobillas(onData) {
  _cbs.add(onData);
  _iniciarListener();
  return () => {
    _cbs.delete(onData);
    if (_cbs.size === 0 && _unsub) { _unsub(); _unsub = null; }
  };
}

export async function agregarEscobilla(data) {
  await addDoc(collection(db, COL), {
    descripcion: (data.descripcion || '').trim(),
    codigoSAP:   (data.codigoSAP  || '').trim(),
    maquinas:    data.maquinas || [],
    material:    data.material || 'Grafito',
    dimensiones: { ancho: data.ancho || '', alto: data.alto || '', largo: data.largo || '' },
    voltaje:   (data.voltaje  || '').trim(),
    amperaje:  (data.amperaje || '').trim(),
    parte:     data.parte    || '',
    stock:     parseInt(data.stock, 10) || 0,
    ubicacion: (data.ubicacion || '').trim(),
    detalles:  (data.detalles  || '').trim(),
    creadoEn:  serverTimestamp(),
  });
}

export async function editarEscobilla(id, data) {
  await updateDoc(doc(db, COL, id), {
    descripcion: (data.descripcion || '').trim(),
    codigoSAP:   (data.codigoSAP  || '').trim(),
    maquinas:    data.maquinas || [],
    material:    data.material || 'Grafito',
    dimensiones: { ancho: data.ancho || '', alto: data.alto || '', largo: data.largo || '' },
    voltaje:        (data.voltaje  || '').trim(),
    amperaje:       (data.amperaje || '').trim(),
    parte:          data.parte    || '',
    stock:          parseInt(data.stock, 10) || 0,
    ubicacion:      (data.ubicacion || '').trim(),
    detalles:       (data.detalles  || '').trim(),
    actualizadoEn:  serverTimestamp(),
  });
}

export async function eliminarEscobilla(id) {
  await deleteDoc(doc(db, COL, id));
}
