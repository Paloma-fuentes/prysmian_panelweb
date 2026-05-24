import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function enviarPush(tokens, titulo, cuerpo, datos = {}) {
  if (!tokens || tokens.length === 0) return;

  const mensajes = tokens.map((to) => ({
    to,
    title: titulo,
    body: cuerpo,
    data: datos,
    sound: 'default',
    priority: 'high',
    channelId: 'prysmian-alertas',
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(mensajes),
    });
    console.log('Notificación push enviada con éxito');
  } catch (e) {
    console.error('Error enviando push:', e);
  }
}

async function obtenerTokensDeRoles(roles) {
  const q = query(collection(db, 'usuarios'), where('rol', 'in', roles));
  const snap = await getDocs(q);
  const tokens = snap.docs
    .map((d) => d.data().expoPushToken)
    .filter((t) => t && t.startsWith('ExponentPushToken'));
    
  return Array.from(new Set(tokens));
}

export async function notificarPanol(titulo, cuerpo, datos = {}) {
  const tokens = await obtenerTokensDeRoles(['panol', 'admin']);
  await enviarPush(tokens, titulo, cuerpo, datos);
}

export async function notificarMantencion(titulo, cuerpo, datos = {}) {
  const tokens = await obtenerTokensDeRoles(['mantencion']);
  await enviarPush(tokens, titulo, cuerpo, datos);
}

export async function notificarUsuario(uid, titulo, cuerpo, datos = {}) {
  const q = query(collection(db, 'usuarios'), where('uid', '==', uid));
  const snap = await getDocs(q);
  const tokens = snap.docs
    .map((d) => d.data().expoPushToken)
    .filter((t) => t && t.startsWith('ExponentPushToken'));
  await enviarPush(tokens, titulo, cuerpo, datos);
}

/**
 * Abre WhatsApp con un mensaje predefinido para urgencias
 */
export function enviarWhatsAppUrgente(solicitud) {
  const numeroPanol = '56936289748'; // Número central del pañol
  const esCompra = solicitud.tipo === undefined || solicitud.urgencia !== undefined; // Heurística simple
  
  const emoji = '🔴 URGENTE';
  const nombre = solicitud.nombre || solicitud.producto || 'Producto';
  const cantidad = solicitud.cantidad || 1;
  const maquina = solicitud.maquina || 'N/A';
  const usuario = solicitud.usuario || 'Usuario';

  const mensaje = `${emoji} — ${esCompra ? 'Solicitud de Compra' : 'Solicitud de Retiro'}\n\n` +
    `📦 *${nombre}*\n` +
    `Cantidad: ${cantidad}\n` +
    `Máquina: ${maquina}\n` +
    `Solicitante: ${usuario}\n\n` +
    `_Enviado desde Prysmian Panel Web_`;

  const url = `https://wa.me/${numeroPanol}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

