import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCcYFlzI97qbothPgA8jM7qiTqzp-bWW4o',
  authDomain: 'prysmian-29126.firebaseapp.com',
  projectId: 'prysmian-29126',
  storageBucket: 'prysmian-29126.firebasestorage.app',
  messagingSenderId: '994445019938',
  appId: '1:994445019938:web:c016e05afa89e86781f37b',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
