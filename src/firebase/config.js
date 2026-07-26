import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence 
} from "firebase/firestore";

const firebaseConfig = {
  // Tu configuración actual de Firebase
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // ...
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Activar persistencia offline
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Múltiples pestañas abiertas al mismo tiempo
    console.warn('La persistencia offline falló: Múltiples pestañas abiertas.');
  } else if (err.code === 'unimplemented') {
    // El navegador actual no soporta IndexedDB
    console.warn('El navegador no soporta persistencia offline.');
  }
});
