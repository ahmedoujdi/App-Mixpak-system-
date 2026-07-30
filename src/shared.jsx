import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { X, Calendar } from "lucide-react";

// --- PALETA DE COLORES E INDUSTRIAL THEME ---
export const COLORS = {
  bg: "#12181f",
  panel: "#1a232e",
  border: "#2a3644",
  text: "#e1e7ed",
  textMuted: "#8b9bb0",
  steel: "#3b82f6",
  safety: "#f59e0b",
  critical: "#ef4444",
  green: "#10b981",
  dark: "#0f172a",
};

// --- ESTILOS REUTILIZABLES ---
export const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  background: "#0f1722",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 4,
  color: COLORS.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

export const primaryButtonStyle = {
  background: COLORS.steel,
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "8px 16px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

export const ghostButtonStyle = {
  background: "transparent",
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 4,
  padding: "8px 12px",
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

// --- FUNCIONES DE UTILIDAD ---

// Auditoría / Historial de actividades
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
    console.error("Error guardando log de actividad:", err);
  }
}

// Exportar datos a CSV
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

// Compartir texto simple
export function shareText(title, text) {
  if (navigator.share) {
    navigator.share({ title, text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${title}\n${text}`);
    alert("Copiado al portapapeles");
  }
}

// Comparador de rango de fechas para Firestore timestamps
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

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 5, textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function StatCard({ label, value, color = COLORS.steel, Icon }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${color}`, padding: 14, borderRadius: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
        {Icon && <Icon size={18} color={color} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export function ModalShell({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, width: "100%", maxWidth: 500, borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 18, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <p style={{ fontSize: 14, color: COLORS.text, marginBottom: 20 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={ghostButtonStyle}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...primaryButtonStyle, background: COLORS.critical }}>Confirmar</button>
      </div>
    </ModalShell>
  );
}

export function CenteredMessage({ text }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 14 }}>
      {text}
    </div>
  );
}

export function EmptyState({ Icon, title, message, onAdd, addLabel }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px dashed ${COLORS.border}`, padding: 40, textAlign: "center", borderRadius: 6 }}>
      {Icon && <Icon size={40} color={COLORS.textMuted} style={{ marginBottom: 12, opacity: 0.5 }} />}
      <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{title}</h3>
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: "4px 8px", borderRadius: 4 }}>
      <Calendar size={14} color={COLORS.textMuted} />
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 12, outline: "none" }} />
      <span style={{ color: COLORS.textMuted, fontSize: 12 }}>a</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 12, outline: "none" }} />
    </div>
  );
}
