import React, { useState, useEffect, createContext, useContext } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { X, Calendar, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Share } from "@capacitor/share";

// --- PALETA DE COLORES INDUSTRIAL ---
export const COLORS = {
  bg: "#0b0f14",
  panel: "#131a22",
  panelHover: "#18222d",
  border: "#232e3c",
  borderActive: "#3b82f6",
  text: "#f1f5f9",
  textMuted: "#64748b",
  steel: "#2563eb",
  steelHover: "#1d4ed8",
  safety: "#f59e0b",
  critical: "#ef4444",
  green: "#10b981",
  dark: "#0a0e12",
};

// --- CONTEXTO DE TOAST NOTIFICATIONS ---
const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: "fixed", bottom: 80, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: COLORS.panel,
              borderLeft: `4px solid ${t.type === "success" ? COLORS.green : t.type === "error" ? COLORS.critical : COLORS.steel}`,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 240,
            }}
          >
            {t.type === "success" && <CheckCircle2 size={16} color={COLORS.green} />}
            {t.type === "error" && <AlertTriangle size={16} color={COLORS.critical} />}
            {t.type === "info" && <Info size={16} color={COLORS.steel} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// --- CÁLCULO DE KPIS DE MANTENIMIENTO (MTTR / MTBF / DISPONIBILIDAD) ---
export function calculateKPIs(logs = []) {
  const completedLogs = logs.filter((l) => l.status === "Completado" || l.status === "Cerrado");

  if (completedLogs.length === 0) {
    return { mttr: "0h", mtbf: "0h", availability: "100%" };
  }

  // MTTR (Mean Time To Repair): Tiempo Promedio de Reparación en Horas
  const totalDowntimeHours = completedLogs.reduce((acc, item) => {
    return acc + (Number(item.repairTimeHours) || 1);
  }, 0);

  const mttr = (totalDowntimeHours / completedLogs.length).toFixed(1);

  // MTBF (Mean Time Between Failures): Tiempo Promedio Entre Fallas
  const totalOperatingHours = 720; // Estimado mensual (30 días * 24h)
  const mtbf = Math.max(0, ((totalOperatingHours - totalDowntimeHours) / (completedLogs.length || 1))).toFixed(1);

  // Disponibilidad de Planta (%)
  const availability = Math.max(0, (((totalOperatingHours - totalDowntimeHours) / totalOperatingHours) * 100)).toFixed(1);

  return {
    mttr: `${mttr}h`,
    mtbf: `${mtbf}h`,
    availability: `${availability}%`,
  };
}

// --- FUNCIONES DE RED Y UTILIDADES ASÍNCRONAS ---
export function withTimeout(promise, ms = 10000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("La operación tardó demasiado tiempo")), ms)
  );
  return Promise.race([promise, timeout]);
}

export function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export async function shareText(title, text, url) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await Share.share({ title, text, url, dialogTitle: title });
    }
  } catch (err) {
    console.log("Compartir cancelado o no soportado:", err);
  }
}

// --- GENERADOR DE PDF INDUSTRIAL ---
export function exportToPdf(title, headers, rows, filename = "reporte-industrial") {
  const doc = new jsPDF();
  
  doc.setFillColor(19, 26, 34);
  doc.rect(0, 0, 210, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("MIXPAK INDUSTRIAL - REPORTE OFICIAL", 14, 18);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 25);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(title, 14, 40);

  autoTable(doc, {
    startY: 45,
    head: [headers],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
  });

  doc.save(`${filename}.pdf`);
}

// --- UTILIDADES DE FECHA ---
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

// --- ESTILOS COMPARTIDOS ---
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
};

export const selectStyle = { ...inputStyle, cursor: "pointer" };

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
};

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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// --- COMPONENTES AUXILIARES ---
export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: COLORS.textMuted, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

export function StatCard({ label, value, color = COLORS.steel, Icon }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderTop: `3px solid ${color}`, padding: "16px", borderRadius: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
        {Icon && <Icon size={18} color={color} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, marginTop: 6, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

export function ModalShell({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.82)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, width: "100%", maxWidth: 480, borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, textTransform: "uppercase" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, maxHeight: "80vh", overflowY: "auto" }}>{children}</div>
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
  return <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted, fontSize: 13, background: COLORS.panel, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>{text}</div>;
}

export function EmptyState({ Icon, title, message, onAdd, addLabel }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px dashed ${COLORS.border}`, padding: 40, textAlign: "center", borderRadius: 8 }}>
      {Icon && <Icon size={42} color={COLORS.textMuted} style={{ marginBottom: 12, opacity: 0.4 }} />}
      <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.textMuted }}>{message}</p>
      {onAdd && <button onClick={onAdd} style={primaryButtonStyle}>{addLabel}</button>}
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

