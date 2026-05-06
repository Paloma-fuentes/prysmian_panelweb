/**
 * configService.js
 * Gestión de configuraciones globales de la aplicación (Master Switches)
 */
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const CONFIG_DOC = doc(db, 'config', 'global');

// ── Escuchar configuración en tiempo real ──────────────────────────────────
export function escucharConfig(callback) {
  return onSnapshot(CONFIG_DOC, snap => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      // Si no existe, creamos el documento inicial
      setDoc(CONFIG_DOC, { conteoActivo: false });
      callback({ conteoActivo: false });
    }
  });
}

// ── Alternar Conteo (Solo Admin) ───────────────────────────────────────────
export async function toggleConteo(estado) {
  await updateDoc(CONFIG_DOC, { 
    conteoActivo: estado,
    actualizadoEn: new Date()
  });
}

export async function getConfig() {
  const snap = await getDoc(CONFIG_DOC);
  return snap.exists() ? snap.data() : { conteoActivo: false };
}
