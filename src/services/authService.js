import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Registra un nuevo usuario en Auth y guarda su perfil en Firestore.
 */
export async function registrarUsuario(email, password, perfil) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guardar perfil en Firestore
    await setDoc(doc(db, 'usuarios', user.uid), {
      ...perfil,
      email,
      uid: user.uid,
      creadoEn: new Date()
    });

    // Cerrar sesión inmediatamente para obligar al login manual
    await signOut(auth);
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * Verifica si ya existe alguien con el rol de Encargada de Pañol.
 */
export async function verificarEncargadaPanolExistente() {
  const q = query(collection(db, 'usuarios'), where('rol', '==', 'panol'));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

/**
 * Verifica si un número de ficha/PIN ya está en uso.
 */
export async function verificarFichaExistente(ficha) {
  const q = query(collection(db, 'usuarios'), where('ficha', '==', ficha));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}
/**
 * Obtiene los datos del perfil del usuario desde Firestore.
 */
export async function getPerfilUsuario(uid) {
  const docRef = doc(db, 'usuarios', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}
