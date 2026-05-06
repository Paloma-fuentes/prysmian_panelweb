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
import { notificarPanol, notificarUsuario } from './notificacionesService';

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
export async function crearSolicitud({ producto, materialId, cantidad, maquina, parteMaquina, usuario, solicitanteUid, notas = '' }) {
  const ref = await addDoc(collection(db, COL), {
    producto,
    materialId:   materialId || '',
    cantidad:     Number(cantidad),
    maquina:      maquina      || 'N/A',
    parteMaquina: parteMaquina || 'General',
    usuario:      usuario      || '',
    solicitanteUid: solicitanteUid || '',
    tipo:         'retiro',
    estado:       'pendiente_entrega',
    creadoEn:     serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    notas,
  });

  // Notificar al Pañol
  notificarPanol(
    '📦 Nueva Solicitud (Web)',
    `${usuario} solicita ${cantidad}x ${producto} para ${maquina}.`,
    { tipo: 'retiro' }
  ).catch(() => {});

  return ref;
}

// ── Confirmar entrega (pañol entrega físicamente) ──────────────────────────
export async function entregarSolicitud(solicitudId, { materialId, producto, cantidad, maquina, parteMaquina, usuario, solicitanteUid }) {
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

  // Notificar al Usuario
  if (solicitanteUid) {
    notificarUsuario(
      solicitanteUid,
      '✅ Retiro Entregado',
      `Tu solicitud de ${cantidad}x ${producto} ha sido entregada.`,
      { tipo: 'retiro_confirmado' }
    ).catch(() => {});
  }
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

// ── Editar con ajuste de stock ─────────────────────────────────────────────
export async function editarSolicitudConStock(id, datosNuevos, solicitudOriginal) {
  const batch = writeBatch(db);
  
  // Si ya fue entregado, hay que ajustar el stock físico
  if (solicitudOriginal.estado === 'entregado' && solicitudOriginal.materialId) {
    const diff = Number(solicitudOriginal.cantidad) - Number(datosNuevos.cantidad);
    if (diff !== 0) {
      batch.update(doc(db, MAT, solicitudOriginal.materialId), {
        stock: increment(diff),
        actualizadoEn: serverTimestamp(),
      });
      // Registrar en historial el ajuste
      batch.set(doc(collection(db, HIST)), {
        tipo: 'ajuste_edicion',
        producto: solicitudOriginal.producto,
        cantidad: Math.abs(diff),
        detalle: diff > 0 ? 'Devolución por edición' : 'Retiro por edición',
        fecha: serverTimestamp(),
        usuario: datosNuevos.usuario || 'Sistema'
      });
    }
  }

  batch.update(doc(db, COL, id), { 
    ...datosNuevos, 
    actualizadoEn: serverTimestamp() 
  });

  await batch.commit();
}

// ── Eliminar con retorno de stock ───────────────────────────────────────────
export async function eliminarSolicitudConStock(solicitud) {
  const batch = writeBatch(db);
  
  // Si ya estaba entregado, devolvemos el stock al almacén
  if (solicitud.estado === 'entregado' && solicitud.materialId) {
    batch.update(doc(db, MAT, solicitud.materialId), {
      stock: increment(Number(solicitud.cantidad)),
      actualizadoEn: serverTimestamp(),
    });
    // Registrar la devolución automática en historial
    batch.set(doc(collection(db, HIST)), {
      tipo: 'devolucion_por_borrado',
      producto: solicitud.producto,
      cantidad: Number(solicitud.cantidad),
      usuario: solicitud.usuario,
      fecha: serverTimestamp(),
      notas: 'Stock retornado por eliminación de registro en panel web'
    });
  }

  batch.delete(doc(db, COL, solicitud.id));
  await batch.commit();
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
