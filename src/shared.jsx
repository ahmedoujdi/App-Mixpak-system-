import React, { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { X, Calendar, CheckCircle2, AlertTriangle, Info } from "lucide-react";

// --- PALETA DE COLORES INDUSTRIAL PREMIUM ---
export const COLORS = {
  bg: "#0b0f14",             // Fondo general ultra oscuro
  panel: "#131a22",          // Paneles/tarjetas con buen contraste
  panelHover: "#18222d",     // Hover en tarjetas
  border: "#232e3c",         // Bordes definidos pero sutiles
  borderActive: "#3b82f6",   // Borde activo
  text: "#f1f5f9",           // Texto principal blanco hueso
  textMuted: "#64748b",      // Texto secundario
  steel: "#2563eb",          // Azul industrial
  steelHover: "#1d4ed8",
  safety: "#f59e0b",         // Ámbar / Advertencia
  critical: "#ef4444",       // Rojo / Crítico
  green: "#10b981",          // Verde / Conforme
  dark: "#0a0e12",
};

// --- ESTILOS COMPARTIDOS CON ANIMACIONES ---
export const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "#080c10",
  border: `1px solid ${COLORS.border}`,
  borderRadius: "6px",
  color: COLORS.text,
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.2s ease",
};

export const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

export const primaryButtonStyle = {
  background: `linear-gradient(135deg, ${COLORS.steel} 0%, ${COLORS.steelHover} 100%)`,
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  padding: "10px 18px",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
  transition: "transform 0.1s ease, boxShadow 0.2s ease",
};

export const ghostButtonStyle = {
  background: "rgba(255, 255, 255, 0.03)",
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "6px",
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "all 0.2s ease",
};

// --- FUNCIONES DE UTILIDAD ---
export async function logActivity(userEmail, moduleName, action, details) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      user: userEmail || "Anónimo",
      module: moduleName,
      action: action,
      details: details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error guardando log:", err);
  }
}

export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const separator = ",";
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    "\n" +
    rows
      .map((row) =>
        keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? "" : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
          })
          .join(separator)
      )
      .join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function inDateRange(timestamp, fromStr, toStr) {
  if (!timestamp) return true;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (fromStr) {
    const from = new Date(fromStr);
    from.setHours(0, 0, 0, 0);
    if (date < from) return false;
  }
  if (toStr) {
    const to = new Date(toStr);
    to.setHours(23, 59, 59, 999);
    if (date > to) return false;
  }
  return true;
}

// --- COMPONENTES UI REUTILIZABLES ---

export function Badge({ children, type = "info" }) {
  const styles = {
    success: { bg: "rgba(16, 185, 129, 0.12)", color: COLORS.green, border: "rgba(16, 185, 129, 0.3)" },
    warning: { bg: "rgba(245, 158, 11, 0.12)", color: COLORS.safety, border: "rgba(245, 158, 11, 0.3)" },
    danger: { bg: "rgba(239, 68, 68, 0.12)", color: COLORS.critical, border: "rgba(239, 68, 68, 0.3)" },
    info: { bg: "rgba(37, 99, 235, 0.12)", color: COLORS.steel, border: "rgba(37, 99, 235, 0.3)" },
  };
  const current = styles[type] || styles.info;

  return (
    <span
      style={{
        background: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        padding: "3px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {children}
    </span>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: COLORS.textMuted, marginBottom: 6, letterSpacing: "0.5px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function StatCard({ label, value, color = COLORS.steel, Icon }) {
  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderTop: `3px solid ${color}`,
        padding: "16px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
          {label}
        </span>
        {Icon && <Icon size={18} color={color} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, marginTop: 6, fontFamily: "monospace" }}>
        {value}
      </div>
    </div>
  );
}

export function ModalShell({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          width: "100%",
          maxWidth: 480,
          borderRadius: "10px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", borderRadius: 4, padding: 2 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <p style={{ fontSize: 14, color: COLORS.text, marginBottom: 20, lineHeight: "1.5" }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={ghostButtonStyle}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...primaryButtonStyle, background: COLORS.critical, boxShadow: "none" }}>Confirmar</button>
      </div>
    </ModalShell>
  );
}

export function CenteredMessage({ text }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13, background: COLORS.panel, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
      {text}
    </div>
  );
}

export function EmptyState({ Icon, title, message, onAdd, addLabel }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px dashed ${COLORS.border}`, padding: 40, textAlign: "center", borderRadius: 8 }}>
      {Icon && <Icon size={42} color={COLORS.textMuted} style={{ marginBottom: 12, opacity: 0.4 }} />}
      <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.textMuted }}>{message}</p>
      {onAdd && (
        <button onClick={onAdd} style={primaryButtonStyle}>
          {addLabel}
        </button>
      )}
    </div>
  );
}

export function DateRangeFilter({ from, to, onFromChange, onToChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#080c10", border: `1px solid ${COLORS.border}`, padding: "6px 10px", borderRadius: 6 }}>
      <Calendar size={14} color={COLORS.textMuted} />
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 12, outline: "none" }} />
      <span style={{ color: COLORS.textMuted, fontSize: 12 }}>a</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 12, outline: "none" }} />
    </div>
  );
}
