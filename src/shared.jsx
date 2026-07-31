import React from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  X, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Info,
  Download,
  Filter,
  Search
} from "lucide-react";

// ============================================================================
// 1. ESTILOS GLOBALES Y CONSTANTES DE DISEÑO (Glassmorphism & Industrial Dark)
// ============================================================================

export const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "rgba(0, 0, 0, 0.35)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 8,
  color: "#ffffff",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.2s ease",
};

export const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "#007AFF",
  color: "#ffffff",
  border: "none",
  padding: "9px 16px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxShadow: "0 2px 8px rgba(0, 122, 255, 0.25)",
};

export const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "rgba(255, 255, 255, 0.08)",
  color: "#ffffff",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  padding: "9px 16px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

export const dangerButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "#FF3B30",
  color: "#ffffff",
  border: "none",
  padding: "9px 16px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxShadow: "0 2px 8px rgba(255, 59, 48, 0.25)",
};

export const ghostButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "transparent",
  color: "rgba(255, 255, 255, 0.7)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

// Mapas de colores según criticidades y estados compartidos
export const SEVERITY_COLORS = {
  baja: { color: "#34C759", bg: "rgba(52, 199, 89, 0.15)", label: "Baja" },
  media: { color: "#FF9500", bg: "rgba(255, 149, 0, 0.15)", label: "Media" },
  alta: { color: "#FF2D55", bg: "rgba(255, 45, 85, 0.15)", label: "Alta" },
  critica: { color: "#FF3B30", bg: "rgba(255, 59, 48, 0.25)", label: "Crítica" },
};

export const GLOBAL_STATUS_CONFIG = {
  pendiente: { label: "Pendiente", color: "#FF9500", bg: "rgba(255, 149, 0, 0.15)", icon: Clock },
  en_proceso: { label: "En Proceso", color: "#007AFF", bg: "rgba(0, 122, 255, 0.15)", icon: Info },
  completado: { label: "Completado", color: "#34C759", bg: "rgba(52, 199, 89, 0.15)", icon: CheckCircle2 },
  aprobado: { label: "Aprobado", color: "#34C759", bg: "rgba(52, 199, 89, 0.15)", icon: CheckCircle2 },
  rechazado: { label: "Rechazado", color: "#FF3B30", bg: "rgba(255, 59, 48, 0.15)", icon: XCircle },
  cancelado: { label: "Cancelado", color: "#8E8E93", bg: "rgba(142, 142, 147, 0.15)", icon: AlertTriangle },
};

// ============================================================================
// 2. FUNCIONES Y UTILIDADES OPERATIVAS (Auditoría, Exportación, Fechas)
// ============================================================================

/**
 * Registra una acción de usuario en el historial inmutable de Firestore (`activity_logs`).
 */
export async function logActivity(userEmail, moduleName, action, details = "") {
  try {
    await addDoc(collection(db, "activity_logs"), {
      user: userEmail || "Sistema Automático",
      module: moduleName,
      action: action,
      details: details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error al registrar actividad en auditoría:", err);
  }
}

/**
 * Convierte y descarga un arreglo de objetos JSON en formato CSV con soporte UTF-8.
 */
export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) {
    alert("No hay datos cargados para exportar a CSV.");
    return;
  }

  const separator = ",";
  const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object" && typeof rows[0][k] !== "function");

  const header = keys.join(separator);
  const body = rows
    .map((row) => {
      return keys
        .map((k) => {
          let cell = row[k] === null || row[k] === undefined ? "" : row[k];
          cell = cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
          return cell;
        })
        .join(separator);
    })
    .join("\n");

  const csvContent = "\uFEFF" + header + "\n" + body; // Incluye BOM para acentos/caracteres especiales en Excel

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const formattedDate = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${formattedDate}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Verifica si un objeto de fecha de Firestore cae dentro del rango especificado por dos inputs tipo fecha.
 */
export function inDateRange(firestoreTimestamp, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  if (!firestoreTimestamp) return true;

  let date;
  if (firestoreTimestamp.toDate && typeof firestoreTimestamp.toDate === "function") {
    date = firestoreTimestamp.toDate();
  } else if (firestoreTimestamp instanceof Date) {
    date = firestoreTimestamp;
  } else {
    date = new Date(firestoreTimestamp);
  }

  if (isNaN(date.getTime())) return true;

  if (fromDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    if (date < from) return false;
  }
  
  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    if (date > to) return false;
  }

  return true;
}

/**
 * Formatea valores numéricos a formato de moneda estándar USD.
 */
export function formatCurrency(amount) {
  const numeric = parseFloat(amount);
  if (isNaN(numeric)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numeric);
}

/**
 * Formatea marcas de tiempo de Firestore a cadena legible.
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return "Reciente";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return "Fecha inválida";
  return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

// ============================================================================
// 3. COMPONENTES UI REUTILIZABLES (Modales, Tablas, Indicadores, Tarjetas)
// ============================================================================

/**
 * Contenedor Modal de pantalla completa con efecto Glassmorphism y desenfoque.
 */
export function ModalShell({ title, onClose, children, maxWidth = 540 }) {
  return (
    <div 
      style={{ 
        position: "fixed", 
        inset: 0, 
        background: "rgba(0, 0, 0, 0.75)", 
        backdropFilter: "blur(8px)", 
        zIndex: 1000, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        padding: 16 
      }}
    >
      <div 
        style={{ 
          background: "#12141d", 
          border: "1px solid rgba(255, 255, 255, 0.12)", 
          borderRadius: 18, 
          width: "100%", 
          maxWidth: maxWidth, 
          maxHeight: "90vh", 
          overflowY: "auto", 
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)", 
          display: "flex", 
          flexDirection: "column" 
        }}
      >
        {/* Cabecera del Modal */}
        <div 
          style={{ 
            padding: "18px 24px", 
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#12141d",
            zIndex: 10
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#ffffff", letterSpacing: "-0.3px" }}>
            {title}
          </h2>
          <button 
            onClick={onClose} 
            style={{ 
              background: "rgba(255,255,255,0.05)", 
              border: "none", 
              color: "rgba(255, 255, 255, 0.6)", 
              cursor: "pointer", 
              padding: 6, 
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Campo contenedor para entradas de formularios con etiqueta estandarizada.
 */
export function Field({ label, required = false, children, helpText = "" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255, 255, 255, 0.6)", letterSpacing: 0.5 }}>
        {label.toUpperCase()} {required && <span style={{ color: "#FF3B30" }}>*</span>}
      </label>
      {children}
      {helpText && <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)" }}>{helpText}</span>}
    </div>
  );
}

/**
 * Tarjeta de métrica clave (KPI) para paneles superiores.
 */
export function KpiCard({ label, value, icon: Icon, accentColor = "#007AFF", badge = null, subtext = null }) {
  return (
    <div 
      style={{ 
        background: "rgba(255, 255, 255, 0.02)", 
        border: "1px solid rgba(255, 255, 255, 0.06)", 
        borderRadius: 16, 
        padding: "18px 20px", 
        position: "relative",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}>{label}</span>
        <div style={{ background: `${accentColor}20`, color: accentColor, padding: 8, borderRadius: 10 }}>
          <Icon size={18} />
        </div>
      </div>
      
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#ffffff", letterSpacing: "-0.5px" }}>
        {value}
      </div>

      {subtext && (
        <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)", marginTop: 4 }}>
          {subtext}
        </div>
      )}

      {badge && (
        <span 
          style={{ 
            position: "absolute", 
            top: 14, 
            right: 14, 
            background: accentColor, 
            color: "#ffffff", 
            fontSize: 9, 
            padding: "2px 6px", 
            borderRadius: 4, 
            fontWeight: 800,
            letterSpacing: 0.5
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/**
 * Etiqueta de Filtro Clicable (Chip Filter) para toolbars.
 */
export function FilterChip({ active, onClick, children }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        background: active ? "#007AFF" : "rgba(255, 255, 255, 0.05)", 
        color: active ? "#ffffff" : "rgba(255, 255, 255, 0.7)", 
        border: "none", 
        padding: "6px 12px", 
        borderRadius: 8, 
        fontSize: 12, 
        fontWeight: 600, 
        cursor: "pointer",
        transition: "all 0.15s ease" 
      }}
    >
      {children}
    </button>
  );
}

/**
 * Control de selector de rango de fechas de corte para toolbars.
 */
export function DateRangeFilter({ from, to, onFromChange, onToChange }) {
  return (
    <div 
      style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 6, 
        background: "rgba(0, 0, 0, 0.25)", 
        border: "1px solid rgba(255, 255, 255, 0.08)", 
        padding: "4px 10px", 
        borderRadius: 8 
      }}
    >
      <Calendar size={14} color="rgba(255, 255, 255, 0.4)" />
      <input 
        type="date" 
        value={from} 
        onChange={(e) => onFromChange(e.target.value)} 
        style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: 12, outline: "none" }} 
      />
      <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 12 }}>a</span>
      <input 
        type="date" 
        value={to} 
        onChange={(e) => onToChange(e.target.value)} 
        style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: 12, outline: "none" }} 
      />
    </div>
  );
}

/**
 * Badge genérico estilizado para representar estados en registros.
 */
export function StatusBadge({ statusKey }) {
  const config = GLOBAL_STATUS_CONFIG[statusKey] || {
    label: statusKey || "Desconocido",
    color: "#8E8E93",
    bg: "rgba(142, 142, 147, 0.15)",
    icon: Info,
  };

  const IconComp = config.icon;

  return (
    <span 
      style={{ 
        background: config.bg, 
        color: config.color, 
        fontSize: 11, 
        fontWeight: 800, 
        padding: "3px 8px", 
        borderRadius: 6, 
        display: "inline-flex", 
        alignItems: "center", 
        gap: 4 
      }}
    >
      <IconComp size={12} /> {config.label.toUpperCase()}
    </span>
  );
}

/**
 * Indicador de carga central para datos asíncronos.
 */
export function CenteredMessage({ text = "Cargando información..." }) {
  return (
    <div 
      style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        padding: "60px 0", 
        color: "rgba(255, 255, 255, 0.4)", 
        fontSize: 14,
        fontWeight: 500,
        gap: 10
      }}
    >
      <div 
        style={{ 
          width: 16, 
          height: 16, 
          border: "2px solid rgba(255,255,255,0.2)", 
          borderTopColor: "#007AFF", 
          borderRadius: "50%", 
          animation: "spin 1s linear infinite" 
        }} 
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {text}
    </div>
  );
}

/**
 * Representación visual para vistas de tablas o grillas vacías.
 */
export function EmptyState({ Icon = AlertCircle, title, message, onAdd = null, addLabel = "Agregar Registro" }) {
  return (
    <div 
      style={{ 
        background: "rgba(255, 255, 255, 0.01)", 
        border: "1px dashed rgba(255, 255, 255, 0.1)", 
        borderRadius: 16, 
        padding: "48px 24px", 
        textAlign: "center", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center" 
      }}
    >
      <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 16, borderRadius: "50%", marginBottom: 14, color: "rgba(255, 255, 255, 0.4)" }}>
        <Icon size={32} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#ffffff" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.4)", margin: "0 0 18px", maxWidth: 360 }}>{message}</p>
      {onAdd && (
        <button onClick={onAdd} style={primaryButtonStyle}>
          {addLabel}
        </button>
      )}
    </div>
  );
}
