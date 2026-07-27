import React, { useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Share } from "@capacitor/share";

// --- DESIGN SYSTEM / PALETA INDUSTRIAL ---
export const COLORS = {
  bg: "#E7E4DC",
  panel: "#FFFFFF",
  dark: "#22262A",
  safety: "#F2A900",
  critical: "#C1440E",
  steel: "#4A6FA5",
  green: "#4C7A4A",
  line: "#CFCABE",
  textMuted: "#5B5850",
};

// --- ESTILOS BASE REUTILIZABLES ---
export const selectStyle = {
  background: "#ffffff",
  border: `1px solid ${COLORS.line}`,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "'IBM Plex Sans', sans-serif",
  color: COLORS.dark,
  borderRadius: 2,
};

export const inputStyle = {
  width: "100%",
  border: `1px solid ${COLORS.line}`,
  padding: "9px 10px",
  fontSize: 14,
  fontFamily: "'IBM Plex Sans', sans-serif",
  color: COLORS.dark,
  background: "#ffffff",
  boxSizing: "border-box",
  borderRadius: 2,
};

export const primaryButtonStyle = {
  background: COLORS.safety,
  color: COLORS.dark,
  border: "none",
  padding: "10px 16px",
  fontFamily: "'Oswald', sans-serif",
  textTransform: "uppercase",
  fontWeight: 600,
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  borderRadius: 2,
};

export const ghostButtonStyle = {
  background: "transparent",
  border: `1px solid ${COLORS.line}`,
  color: COLORS.dark,
  padding: "8px 14px",
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 2,
};

// --- FUNCIONES UTILITARIAS ---

/**
 * Comprime una imagen en el cliente antes de subirla para optimizar ancho de banda.
 * Utiliza Object URLs para evitar la sobrecarga de memoria asociada a Base64.
 */
export function compressImage(file, maxSize = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      return reject(new Error("El archivo proporcionado no es válido."));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo procesar la imagen seleccionada."));
    };

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("No se pudo obtener el contexto 2D del canvas."));
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Error al comprimir la imagen en canvas."));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.src = objectUrl;
  });
}

/**
 * Enuelve una promesa con un límite de tiempo para evitar ejecuciones colgadas.
 */
export function withTimeout(promise, ms, message = "La operación ha superado el tiempo límite.") {
  let timerId;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

/**
 * Exporta un arreglo de objetos a un archivo CSV descargable compatible con Microsoft Excel.
 */
export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeValue = (v) => {
    if (v === null || v === undefined) return '""';
    if (typeof v === "object") {
      v = v.seconds ? new Date(v.seconds * 1000).toISOString() : JSON.stringify(v);
    }
    const str = String(v);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(",")),
  ].join("\r\n");

  // \uFEFF añade el Byte Order Mark (BOM) para forzar a Excel a abrirlo en UTF-8
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const cleanFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", cleanFilename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Comparte texto mediante Capacitor Share, Web Share API o fallback al Portapapeles.
 */
export async function shareText(title, text) {
  try {
    await Share.share({ title, text, dialogTitle: title });
    return "shared";
  } catch (err) {
    if (err?.message === "Share canceled" || err?.message?.includes("cancel")) {
      return "cancelled";
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
    }
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return "failed";
    }
  }

  return "failed";
}

// --- COMPONENTES VISUALES COMPARTIDOS ---

export function CenteredMessage({ text }) {
  return (
    <div style={styles.centeredContainer}>
      <p style={{ margin: 0, color: COLORS.dark, fontWeight: 500 }}>{text}</p>
    </div>
  );
}

export function HazardBar() {
  return <div style={styles.hazardBar} />;
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

export function ModalShell({ children, onClose, title }) {
  // Manejo de la tecla Esc y control de scroll en el body
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div style={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <HazardBar />
        <div style={{ padding: 20 }}>
          <div style={styles.modalHeader}>
            <span style={styles.modalTitle}>{title}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              style={styles.iconButton}
            >
              <X size={20} color={COLORS.dark} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  onCancel,
  onConfirm,
  title = "Eliminar",
  message = "Esta acción no se puede deshacer.",
  confirmLabel = "Eliminar",
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div style={styles.confirmOverlay} onClick={onCancel} role="alertdialog" aria-modal="true">
      <div style={styles.confirmContainer} onClick={(e) => e.stopPropagation()}>
        <div style={styles.confirmHeader}>
          <AlertTriangle size={20} color={COLORS.critical} />
          <h3 style={styles.confirmTitle}>{title}</h3>
        </div>
        <p style={styles.confirmMessage}>{message}</p>
        <div style={styles.confirmActions}>
          <button type="button" onClick={onCancel} style={ghostButtonStyle}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={styles.confirmButton}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, color = COLORS.steel, Icon }) {
  return (
    <div style={{ ...styles.statCard, borderLeft: `5px solid ${color}` }}>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
      {Icon && <Icon size={20} color={color} />}
    </div>
  );
}

export function EmptyState({ Icon, title, message, onAdd, addLabel }) {
  return (
    <div style={styles.emptyStateContainer}>
      {Icon && <Icon size={34} color={COLORS.textMuted} style={{ margin: "0 auto 10px" }} />}
      <h3 style={styles.emptyStateTitle}>{title}</h3>
      <p style={styles.emptyStateMessage}>{message}</p>
      {onAdd && (
        <button type="button" onClick={onAdd} style={primaryButtonStyle}>
          {addLabel}
        </button>
      )}
    </div>
  );
}

// --- ESTILOS CENTRALIZADOS ---
const styles = {
  centeredContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: COLORS.bg,
    fontFamily: "'IBM Plex Sans', sans-serif",
    padding: 20,
    textAlign: "center",
  },
  hazardBar: {
    height: 5,
    backgroundImage: `repeating-linear-gradient(135deg, ${COLORS.safety} 0px, ${COLORS.safety} 10px, ${COLORS.dark} 10px, ${COLORS.dark} 20px)`,
  },
  fieldLabel: {
    display: "block",
    fontSize: 12,
    textTransform: "uppercase",
    color: COLORS.textMuted,
    marginBottom: 4,
    fontWeight: 600,
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(24,27,30,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  modalContainer: {
    background: COLORS.panel,
    width: "100%",
    maxWidth: 460,
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: 2,
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  iconButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(24,27,30,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 60,
  },
  confirmContainer: {
    background: COLORS.panel,
    padding: 20,
    maxWidth: 340,
    width: "100%",
    borderRadius: 2,
  },
  confirmHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  confirmTitle: {
    margin: 0,
    fontFamily: "'Oswald', sans-serif",
    fontSize: 15,
    textTransform: "uppercase",
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 1.4,
  },
  confirmActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  confirmButton: {
    padding: "8px 14px",
    background: COLORS.critical,
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 2,
  },
  statCard: {
    background: COLORS.panel,
    padding: "12px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 2,
  },
  statValue: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 22,
    fontWeight: 600,
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    fontWeight: 500,
  },
  emptyStateContainer: {
    background: COLORS.panel,
    border: `1px dashed ${COLORS.line}`,
    padding: "48px 24px",
    textAlign: "center",
    borderRadius: 2,
  },
  emptyStateTitle: {
    fontFamily: "'Oswald', sans-serif",
    textTransform: "uppercase",
    fontSize: 16,
    margin: "0 0 6px",
    color: COLORS.dark,
  },
  emptyStateMessage: {
    color: COLORS.textMuted,
    fontSize: 14,
    margin: "0 0 16px",
  },
};
