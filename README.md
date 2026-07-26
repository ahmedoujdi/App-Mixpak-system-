# ⚙️ Mixpak System — Mantenimiento & Gestión Industrial

Sistema multiplataforma PWA / APK para la gestión unificada de **Mantenimiento**, **Inventario de Materiales**, **Líneas de Producción** y **Control de Calidad**.

---

## 🛠️ Tecnologías Empleadas

- **Frontend:** React 18 + Vite + Tailwind CSS + Lucide Icons
- **Móvil (Android):** Capacitor 6 (Compilación APK)
- **Base de Datos & Auth:** Firebase Firestore (Realtime) + Firebase Auth
- **Multimedia:** Cloudinary (Subida gratuita de fotos/averías)
- **Notificaciones:** EmailJS (Alertas por registro de usuario)

---

## 🚀 Compilación Automática de APK (GitHub Actions)

Este repositorio compila automáticamente la aplicación para dispositivos Android sin requerir Android Studio.

1. Realiza tus cambios en el código.
2. Sube los cambios al repositorio (`git push`).
3. Ve a la pestaña **Actions** en GitHub.
4. Descarga el archivo `.apk` generado en el apartado **Artifacts**.

---

## 🔒 Reglas de Seguridad (Firestore)

Asegúrate de publicar las siguientes reglas en la consola de Firebase para garantizar el control de acceso según roles aprobados:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isApproved() {
      return request.auth != null && get(/databases/$(database)/documents/team/$(request.auth.uid)).data.aprobado == true;
    }

    match /team/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.aprobado == false;
      allow update, delete: if request.auth != null && get(/databases/$(database)/documents/team/$(request.auth.uid)).data.role == 'admin';
    }

    match /{document=**} {
      allow read, write: if isApproved();
    }
  }
}
