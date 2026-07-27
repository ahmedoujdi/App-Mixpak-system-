import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function FotoViewer({ photos = [], startIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  if (!photos || photos.length === 0) return null;

  // Extrae la URL de forma segura (por si la foto es un String o un Objeto { url: '...' })
  const getPhotoUrl = (photo) => {
    if (typeof photo === "string") return photo;
    if (photo && typeof photo === "object" && photo.url) return photo.url;
    if (photo && typeof photo === "object" && photo.secure_url) return photo.secure_url;
    return "";
  };

  const currentUrl = getPhotoUrl(photos[currentIndex]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        zIndex: 99999, // Se asegura de quedar por encima de todo el sistema
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Botón Cerrar */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(255,255,255,0.15)",
          border: "none",
          color: "#fff",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 100000,
        }}
      >
        <X size={24} />
      </button>

      {/* Imagen Principal */}
      <div
        onClick={(e) => e.stopPropagation()} // Previene cerrar al hacer clic en la foto
        style={{
          position: "relative",
          maxWidth: "100%",
          maxHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={`Foto ${currentIndex + 1}`}
            style={{
              maxWidth: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
              borderRadius: 4,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          />
        ) : (
          <div style={{ color: "#fff", padding: 20 }}>No se pudo cargar la imagen</div>
        )}
      </div>

      {/* Controles de Navegación (Flechas) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              borderRadius: "50%",
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={28} />
          </button>

          <button
            onClick={handleNext}
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              borderRadius: "50%",
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ChevronRight size={28} />
          </button>

          {/* Contador de imágenes */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              color: "#fff",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 14,
              background: "rgba(0,0,0,0.6)",
              padding: "4px 12px",
              borderRadius: 12,
            }}
          >
            {currentIndex + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
