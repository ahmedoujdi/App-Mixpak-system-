import React from "react";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";

// Paleta Industrial Slate Executive 2026
export const COLORS = {
  bg: "#0b0f17",             // Fondo principal ultraclaro/oscuro profundo
  cardBg: "#161b26",         // Tarjetas con profundidad
  cardBorder: "#262f40",     // Bordes sutiles
  textMain: "#f1f5f9",       // Texto brillante
  textMuted: "#8b949e",      // Texto secundario
  primary: "#3b82f6",        // Azul primario
  primaryHover: "#2563eb",   // Hover azul
  accent: "#06b6d4",         // Cían de acento
  success: "#10b981",        // Verde éxito
  warning: "#f59e0b",        // Ámbar alerta
  danger: "#ef4444",         // Rojo crítico
};

// Estilos de botones de alto rendimiento
export const primaryButtonStyle = {
  backgroundColor: COLORS.primary,
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  padding: "9px 16px",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "0 4px 14px rgba(59, 130, 246, 0.25)",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

export const ghostButtonStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  color: COLORS.textMain,
  border: `1px solid ${COLORS.cardBorder}`,
  borderRadius: "8px",
  padding: "9px 14px",
  fontWeight: "500",
  fontSize: "13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

export const inputStyle = {
  width: "100%",
  backgroundColor: "#0b0f17",
  border: `1px solid ${COLORS.cardBorder}`,
  borderRadius: "8px",
  padding: "10px 12px",
  color: COLORS.textMain,
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

export function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {label && <label style={{ fontSize: "12px", fontWeight: "600", color: COLORS.textMuted }}>{label}</label>}
      {children}
    </div>
  );
}

// Modal Shell con desenfoque de fondo y animación de entrada
export function ModalShell({ onClose, title, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(11, 15, 23, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: "14px",
          width: "100%",
          maxWidth: "560px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: `1px solid ${COLORS.cardBorder}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: COLORS.textMain }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "22px" }}>{children}</div>
      </div>
    </div>
  );
}

// Componente Badge dinámico para estados
export function StatusBadge({ status = "OK", type = "info" }) {
  const styles = {
    success: { bg: "rgba(16, 185, 129, 0.12)", color: COLORS.success, border: "rgba(16, 185, 129, 0.3)" },
    warning: { bg: "rgba(245, 158, 11, 0.12)", color: COLORS.warning, border: "rgba(245, 158, 11, 0.3)" },
    danger: { bg: "rgba(239, 68, 68, 0.12)", color: COLORS.danger, border: "rgba(239, 68, 68, 0.3)" },
    info: { bg: "rgba(59, 130, 246, 0.12)", color: COLORS.primary, border: "rgba(59, 130, 246, 0.3)" },
  }[type] || styles.info;

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: "600",
        backgroundColor: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {status}
    </span>
  );
}
