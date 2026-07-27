import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 1. Configuración flexible con fallback a variables de entorno (.env)
// Si no existen las variables en el entorno, utiliza los valores por defecto.
const firebaseConfig = {
  apiKey:
    import.meta.env?.VITE_FIREBASE_API_KEY ||
    "AIzaSyBBSKwL1FMTOo0m62SrvnOObHeK3rR68Ys",
  authDomain:
    import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN ||
    "mixpak-system.firebaseapp.com",
  projectId:
    import.meta.env?.VITE_FIREBASE_PROJECT_ID ||
    "mixpak-system",
  messagingSenderId:
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "552046543093",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || undefined,
};

// 2. Prevención de múltiples inicializaciones (Patrón Singleton para HMR / Vite)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 3. Exportación de servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
