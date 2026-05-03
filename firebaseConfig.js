import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            || 'AIzaSyCcYFlzI97qbothPgA8jM7qiTqzp-bWW4o',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        || 'prysmian-29126.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         || 'prysmian-29126',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     || 'prysmian-29126.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|| '994445019938',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             || '1:994445019938:web:c016e05afa89e86781f37b',
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID     || 'G-71J9Y647B1',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
