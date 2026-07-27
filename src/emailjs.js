// Configuración dinámica mediante variables de entorno (Vite / CRA / Next)
// Se mantiene la compatibilidad con constantes directas si no se usan .env
const EMAILJS_SERVICE_ID =
  import.meta.env?.VITE_EMAILJS_SERVICE_ID || "PEGA_AQUI_TU_SERVICE_ID";
const EMAILJS_TEMPLATE_ID =
  import.meta.env?.VITE_EMAILJS_TEMPLATE_ID || "PEGA_AQUI_TU_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY =
  import.meta.env?.VITE_EMAILJS_PUBLIC_KEY || "PEGA_AQUI_TU_PUBLIC_KEY";
const ADMIN_NOTIFY_EMAIL =
  import.meta.env?.VITE_ADMIN_NOTIFY_EMAIL || "PEGA_AQUI_TU_CORREO_GMAIL";

// Tiempo máximo de espera para la notificación por correo (10 segundos)
const EMAILJS_TIMEOUT_MS = 10000;

/**
 * Comprueba si la configuración de EmailJS contiene credenciales válidas y no marcadores por defecto.
 */
function isEmailJSConfigured() {
  const keys = [
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY,
    ADMIN_NOTIFY_EMAIL,
  ];

  return keys.every(
    (key) => key && typeof key === "string" && !key.startsWith("PEGA_AQUI")
  );
}

/**
 * Avisa por correo electrónico al administrador cuando un nuevo usuario se registra.
 * Si el servicio no está configurado, omite el envío sin interrumpir el flujo.
 *
 * @param {string} newUserEmail - Correo electrónico del usuario registrado.
 * @param {string} newUserRole - Nombre/Etiqueta de la categoría o rol seleccionado.
 * @returns {Promise<boolean>} Devuelve true si se envió correctamente, false en caso contrario.
 */
export async function notifyNewRegistration(newUserEmail, newUserRole) {
  // 1. Verificación silenciosa de credenciales
  if (!isEmailJSConfigured()) {
    console.info(
      "[EmailJS] Notificación omitida: Las credenciales aún no están configuradas."
    );
    return false;
  }

  // 2. Control de tiempo límite (Timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EMAILJS_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: ADMIN_NOTIFY_EMAIL,
          new_user_email: newUserEmail,
          new_user_role: newUserRole,
        },
      }),
    });

    clearTimeout(timeoutId);

    // 3. Verificación de estado HTTP (EmailJS no lanza error automático en HTTP 4xx/5xx)
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Sin detalle de error");
      console.warn(
        `[EmailJS] Fallo al enviar notificación (${response.status}): ${errorText}`
      );
      return false;
    }

    return true;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      console.warn(
        `[EmailJS] La solicitud de notificación superó el tiempo límite (${EMAILJS_TIMEOUT_MS / 1000}s).`
      );
    } else {
      console.error("[EmailJS] Error al enviar el aviso de nuevo registro:", err);
    }

    // Retorna false para asegurar que el llamador pueda continuar sin crash
    return false;
  }
}
