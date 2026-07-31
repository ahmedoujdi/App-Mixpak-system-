import React from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { AlertCircle, Calendar, X } from "lucide-react";

// ==========================================
// 1. ESTILOS REUTILIZABLES ENTERPRISE UI
// ==========================================

export const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: "#007AFF",
  color: "#FFFFFF",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 4px 12px rgba(0, 122, 255, 0.25)"
};

export const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: "rgba(255, 255, 255, 0.06)",
  color: "#FFFFFF",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 10,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease"
};

export const ghostButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: "transparent",
  color: "rgba(255, 255, 255, 0.7)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease"
};

export const inputStyle = {
  width: "100%",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#FFFFFF",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  transition: "border 0.2s ease"
};

// ==========================================
// 2. HELPERS DE AUDITORÍA Y EXPORTACIÓN
// ==========================================

/**
 * Log de Actividad Global en Firestore para Auditoría ISO/MES
 */
export async function logActivity(userEmail, moduleName, action, details) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      user: userEmail || "Sistema SCADA",
      module: moduleName,
      action: action,
      details: details,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Error grabando log de auditoría:", err);
  }
}

/**
 * Exportación directa de arrays de objetos a un archivo CSV
 */
export function exportToCsv(filename, data) {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((obj) =>
    Object.values(obj)
      .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );

  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Filtro por Rango de Fechas
 */
export function inDateRange(timestamp, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  if (!timestamp) return false;

  let dateObj;
  if (timestamp.toDate) {
    dateObj = timestamp.toDate();
  } else if (timestamp.seconds) {
    dateObj = new Date(timestamp.seconds * 1000);
  } else {
    dateObj = new Date(timestamp);
  }

  const target = dateObj.getTime();
  const from = fromDate ? new Date(fromDate).getTime() : 0;
  const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;

  return target >= from && target <= to;
}

/**
 * Formateador de Timestamps de Firestore a String
 */
export function formatTimestamp(ts) {
  if (!ts) return "N/A";
  let date;
  if (ts.toDate) date = ts.toDate();
  else if (ts.seconds) date = new Date(ts.seconds * 1000);
  else date = new Date(ts);

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// ==========================================
// 3. COMPONENTES UI REUTILIZABLES
// ==========================================

/**
 * Badge genérico para estados de Órdenes (OP / OT / BOM)
 */
export function StatusBadge({ status }) {
  let bg = "rgba(255, 255, 255, 0.08)";
  let color = "rgba(255, 255, 255, 0.7)";

  switch (status) {
    case "Completado":
    case "Aprobado":
    case "Finalizada":
      bg = "rgba(52, 199, 89, 0.15)";
      color = "#34C759";
      break;
    case "En Proceso":
    case "En Revisión":
      bg = "rgba(255, 149, 0, 0.15)";
      color = "#FF9500";
      break;
    case "Pendiente":
      bg = "rgba(0, 122, 255, 0.15)";
      color = "#007AFF";
      break;
    case "Pausada":
    case "Obsoleto":
    case "Cancelado":
      bg = "rgba(255, 59, 48, 0.15)";
      color = "#FF3B30";
      break;
    default:
      break;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 800,
        backgroundColor: bg,
        color: color,
        letterSpacing: "0.3px"
      }}
    >
      {status || "Indefinido"}
    </span>
  );
}

/**
 * Indicador de Carga / Mensaje Centrado
 */
export function CenteredMessage({ text }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
        gap: 12,
        color: "rgba(255,255,255,0.6)"
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid rgba(255,255,255,0.1)",
          borderTopColor: "#007AFF",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{text}</span>
    </div>
  );
}

/**
 * Estado Vacío (Sin Registros)
 */
export function EmptyState({ Icon = AlertCircle, title, message }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        backgroundColor: "rgba(255, 255, 255, 0.01)",
        border: "1px dashed rgba(255, 255, 255, 0.1)",
        borderRadius: 16,
        textAlign: "center"
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12
        }}
      >
        <Icon size={24} color="rgba(255,255,255,0.4)" />
      </div>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#FFF" }}>{title}</h3>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)", maxWidth: 360 }}>
        {message}
      </p>
    </div>
  );
}

/**
 * Modal Shell Base
 */
export function ModalShell({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20
      }}
    >
      <div
        style={{
          backgroundColor: "#12141D",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 580,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#FFF" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Campo de Formulario Generico
 */
export function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 800, color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Filtro Selector de Rango de Fechas
 */
export function DateRangeFilter({ from, to, onFromChange, onToChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative" }}>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          style={{ ...inputStyle, width: 135, fontSize: 12, paddingLeft: 10 }}
        />
      </div>
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>a</span>
      <div style={{ position: "relative" }}>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          style={{ ...inputStyle, width: 135, fontSize: 12, paddingLeft: 10 }}
        />
      </div>
    </div>
  );
}
