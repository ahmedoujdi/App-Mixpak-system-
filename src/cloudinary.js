// Configuración dinámica mediante variables de entorno (Vite / CRA / Next)
// Se mantienen los valores por defecto si no existen las variables
const CLOUDINARY_CLOUD_NAME =
  import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || "bzaslg6l";
const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";

// Tiempo máximo de espera para la subida (30 segundos)
const UPLOAD_TIMEOUT_MS = 30000;

/**
 * Sube una foto (Blob o File) a una carpeta de Cloudinary y devuelve su URL pública e ID.
 *
 * @param {Blob | File} blob - El archivo de imagen comprimido o en formato Blob.
 * @param {string} [folder="mixpak_uploads"] - Nombre de la carpeta destino en Cloudinary.
 * @returns {Promise<{ url: string, publicId: string }>} Objeto con la URL segura y el ID público.
 */
export async function uploadToCloudinary(blob, folder = "mixpak_uploads") {
  // 1. Validaciones preventivas
  if (!blob || !(blob instanceof Blob)) {
    throw new Error(
      "El archivo proporcionado para subir a Cloudinary no es un Blob o File válido."
    );
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Falta la configuración de Cloudinary (Cloud Name o Upload Preset no definidos)."
    );
  }

  // 2. Preparación del FormData
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (folder) {
    formData.append("folder", folder);
  }

  // 3. Control de Timeout con AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 4. Manejo detallado de la respuesta HTTP
    if (!res.ok) {
      let errorMessage = `Error HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // La respuesta no era JSON válido
      }

      throw new Error(
        `Cloudinary rechazó la subida (${errorMessage}). Revisa el Cloud Name y el Upload Preset (Unsigned).`
      );
    }

    const data = await res.json();

    if (!data.secure_url || !data.public_id) {
      throw new Error("Respuesta incompleta de Cloudinary al subir la imagen.");
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error(
        `La subida de la imagen excedió el tiempo límite (${UPLOAD_TIMEOUT_MS / 1000}s). Revisa tu conexión a internet.`
      );
    }

    throw error;
  }
}
