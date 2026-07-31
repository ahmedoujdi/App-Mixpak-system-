import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { X, Search, Calendar, ChevronRight } from "lucide-react";

// ==========================================
// PALETA DE COLORES PROFESIONAL Y ELEGANTE
// ==========================================
export const COLORS = {
  bg: "#F8FAFC",             // Fondo general claro, limpio y descansado para la vista
  panel: "#FFFFFF",          // Fondo de tarjetas y paneles en blanco puro
  panelBorder: "#E2E8F0",    // Bordes sutiles y elegantes
  text: "#0F172A",           // Texto principal oscuro de alta legibilidad
  textMuted: "#64748B",      // Texto secundario gris slate
  primary: "#2563EB",        // Azul corporativo vibrante
  primaryHover: "#1D4ED8",
  safety: "#F59E0B",         // Ámbar/Naranja para advertencias y pendientes
  critical: "#EF4444",       // Rojo para alertas críticas
  steel: "#6366F1",          // Indigo para mantenimiento y herramientas
  green: "#10B981",          // Verde para completado y disponibilidad
  border: "#E2E8F0",
  shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
  cardShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)"
};

// ==========================================
// ESTILOS DE BOTONES E INPUTS
// ==========================================
export const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: COLORS.primary,
  color: "#FFFFFF",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
};

export const ghostButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: "#FFFFFF",
  color: COLORS.text,
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 8,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
};

export const inputStyle = {
  width: "100%",
  backgroundColor: "#FFFFFF",
  color: COLORS.text,
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

export const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

// ==========================================
// COMPONENTES DE DISEÑO
// ==========================================

// Tarjeta de Métrica ( KPI StatCard )
export function StatCard({ label, value, color = COLORS.primary, Icon }) {
  return (
    <div
      style={{
        backgroundColor: COLORS.panel,
        borderRadius: 12,
        padding: "20px 22px",
        border: `1px solid ${COLORS.panelBorder}`,
        boxShadow: COLORS.shadow,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 4,
          height: "100%",
          backgroundColor: color,
        }}
      />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
          {value}
        </div>
      </div>
      {Icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            backgroundColor: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={24} color={color} />
        </div>
      )}
    </div>
  );
}

// Modal Shell Moderno
export function ModalShell({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.panel,
          borderRadius: 14,
          width: "100%",
          maxWidth: 550,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: COLORS.cardShadow,
          border: `1px solid ${COLORS.panelBorder}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${COLORS.panelBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.text }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: COLORS.textMuted,
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// Campo de Formulario
export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.text,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// Indicador de Carga
export function CenteredMessage({ text }) {
  return (
    <div style={{ padding: 60, textAlign: "center", color: COLORS.textMuted, fontSize: 14, fontWeight: 500 }}>
      {text}
    </div>
  );
}

// Estado Vacío
export function EmptyState({ Icon, title, message, onAdd, addLabel }) {
  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
        backgroundColor: COLORS.panel,
        borderRadius: 12,
        border: `1px dashed ${COLORS.panelBorder}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      {Icon && (
        <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={28} color={COLORS.textMuted} />
        </div>
      )}
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.text }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, maxWidth: 360 }}>{message}</p>
      {onAdd && (
        <button onClick={onAdd} style={{ ...primaryButtonStyle, marginTop: 8 }}>
          {addLabel}
        </button>
      )}
    </div>
  );
}

// Filtro por Fecha
export function DateRangeFilter({ from, to, onFromChange, onToChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Calendar size={16} color={COLORS.textMuted} />
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        style={{ ...inputStyle, width: "auto" }}
      />
      <span style={{ fontSize: 12, color: COLORS.textMuted }}>a</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        style={{ ...inputStyle, width: "auto" }}
      />
    </div>
  );
}

// Diálogo de Confirmación
export function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <p style={{ margin: "0 0 20px 0", fontSize: 14, color: COLORS.textMuted }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={onCancel} style={ghostButtonStyle}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...primaryButtonStyle, backgroundColor: COLORS.critical }}>Confirmar</button>
      </div>
    </ModalShell>
  );
}

// Toast Context & Provider
const ToastContext = React.createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 10000, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "12px 18px",
              borderRadius: 8,
              backgroundColor: t.type === "error" ? COLORS.critical : t.type === "success" ? COLORS.green : COLORS.text,
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: COLORS.cardShadow,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

// ==========================================
// FUNCIONES AUXILIARES DE NEGOCIO
// ==========================================

export function inDateRange(timestamp, from, to) {
  if (!from && !to) return true;
  if (!timestamp || !timestamp.toDate) return true;
  const date = timestamp.toDate();
  if (from && date < new Date(from)) return false;
  if (to && date > new Date(to + "T23:59:59")) return false;
  return true;
}

export function calculateKPIs(logs) {
  if (!logs || logs.length === 0) return { mttr: "0 hrs", mtbf: "0 días", availability: "100%" };

  let totalRepairHours = 0;
  let totalFailures = 0;

  logs.forEach((log) => {
    if (log.type === "Correctivo") {
      totalFailures++;
      totalRepairHours += Number(log.repairTimeHours) || 1.5;
    }
  });

  const mttr = totalFailures > 0 ? (totalRepairHours / totalFailures).toFixed(1) + " hrs" : "0 hrs";
  const mtbf = totalFailures > 0 ? (30 / totalFailures).toFixed(1) + " días" : "30+ días";
  const availability = totalFailures > 0 ? (100 - (totalRepairHours / 720) * 100).toFixed(1) + "%" : "99.9%";

  return { mttr, mtbf, availability };
}

export function logActivity(user, moduleName, action, details) {
  try {
    addDoc(collection(db, "activity_logs"), {
      user: user || "Usuario",
      module: moduleName,
      action: action,
      details: details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error al registrar actividad:", err);
  }
}

export function exportToPdf(title, headers, rows, filename = "reporte") {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 20);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  doc.save(`${filename}.pdf`);
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
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
          })
          .join(separator)
      )
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function shareText(title, text, url) {
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
    alert("Enlace copiado al portapapeles");
  }
}
