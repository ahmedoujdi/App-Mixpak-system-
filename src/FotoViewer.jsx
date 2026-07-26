import React, { useState } from "react";

// Muestra una foto guardada (URL de Cloudinary) directamente en la
// pantalla de la app, en miniatura, y permite tocarla para verla
// en grande sin salir de la app.
//
// Uso: <FotoViewer url={registro.fotoUrl} />
// (ponlo donde antes solo mostrabas el link o el texto "Guardando...")
export default function FotoViewer({ url, alt = "Foto" }) {
  const [ampliada, setAmpliada] = useState(false);

  if (!url) return null;

  return (
    <>
      <img
        src={url}
        alt={alt}
        onClick={() => setAmpliada(true)}
        style={styles.miniatura}
      />

      {ampliada && (
        <div style={styles.overlay} onClick={() => setAmpliada(false)}>
          <img src={url} alt={alt} style={styles.grande} />
        </div>
      )}
    </>
  );
}

const styles = {
  miniatura: {
    width: 90,
    height: 90,
    objectFit: "cover",
    borderRadius: 8,
    cursor: "pointer",
    border: "1px solid #ddd",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 16,
  },
  grande: {
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 8,
  },
};
