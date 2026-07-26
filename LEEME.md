# Cómo integrar estos archivos en tu app

## 1. Copia los archivos
Copia estos archivos a tu carpeta `src/` (junto a tu `firebase.js` actual):
- `RegistroScreen.jsx`
- `PantallaPendiente.jsx`
- `AdminAprobaciones.jsx`
- `FotoViewer.jsx`

## 2. Publica las reglas nuevas
Reemplaza el contenido de tu `firestore.rules` por el de este `firestore.rules`,
y publícalo (Firebase Console → Firestore Database → Reglas → pegar → Publicar,
o `firebase deploy --only firestore:rules` si usas la CLI).

## 3. Lógica en tu pantalla principal (App.js o donde controlas el login)
Necesitas leer el documento `team/{uid}` del usuario que inició sesión y
decidir qué mostrar:

```jsx
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// dentro de tu componente principal:
const [perfil, setPerfil] = useState(null); // null = cargando

useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setPerfil(undefined); // sin sesión
      return;
    }
    const snap = await getDoc(doc(db, "team", user.uid));
    setPerfil(snap.exists() ? snap.data() : null);
  });
  return () => unsub();
}, []);

// Al renderizar:
if (perfil === undefined) return <LoginScreen />; // o tu pantalla de login actual
if (perfil === null) return <p>Cargando...</p>;
if (!perfil.aprobado) return <PantallaPendiente />;

// perfil.rol ya te dice qué pestañas mostrarle (mantenimiento, calidad, etc.)
// perfil.rol === "admin" -> puedes mostrarle también <AdminAprobaciones />
```

## 4. Acceso a la pantalla de aprobación (solo para ti)
Al primer usuario que te registres tú mismo, tendrás que aprobarte manualmente
UNA vez desde Firebase Console (colección `team` → tu documento → cambiar
`aprobado` a `true` y `rol` a `"admin"`), porque nadie más puede aprobarte.
Después de eso, ya puedes entrar a `AdminAprobaciones` dentro de la app para
aprobar a los demás sin volver a tocar la consola.

Sugerencia: agrega un botón o pestaña "Administración" que solo aparezca si
`perfil.rol === "admin"`, y que muestre `<AdminAprobaciones />`.

## 5. Fotos dentro de la app
Donde antes mostrabas la URL de la foto (o el texto de "Guardando..."),
usa:

```jsx
<FotoViewer url={registro.fotoUrl} />
```

Reemplaza `registro.fotoUrl` por el nombre real del campo donde guardas la
URL de Cloudinary en cada registro de mantenimiento/calidad. Muestra una
miniatura y, al tocarla, se ve en grande — sin salir de la app ni entrar a
Cloudinary.

## Si algo no encaja
Si tus nombres de archivo/componentes actuales son distintos (por ejemplo
tu login se llama `Login.js` en vez de `LoginScreen`), dime cómo se llaman
y te ajusto las instrucciones exactas para tu estructura.
