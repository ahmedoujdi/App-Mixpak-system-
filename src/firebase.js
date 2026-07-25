import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 1. Ve a https://console.firebase.google.com -> tu proyecto -> Configuración del proyecto
// 2. En "Tus apps", crea una app Web (icono </>)
// 3. Copia aquí el objeto firebaseConfig que te da Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBBSKwL1FMTOo0m62SrvnOObHeK3rR68Ys",
  authDomain: "mixpak-system.firebaseapp.com",
  projectId: "mixpak-system",
  storageBucket: "mixpak-system.firebasestorage.app",
  messagingSenderId: "552046543093",
  // appId: se obtiene registrando una app "Web" (icono </>) en Firebase, distinta
  // de la app Android. No es necesario para que funcionen Auth/Firestore/Storage,
  // así que la app funciona igual sin él — pero si luego creas la app Web,
  // pega aquí su appId.
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
