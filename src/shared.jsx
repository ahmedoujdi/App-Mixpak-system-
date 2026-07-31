import React, { useState, createContext, useContext, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { X, Search, Calendar, Palette } from "lucide-react";

// ==========================================
// DEFINICIÓN DE LOS 5 TEMAS
// ==========================================
export const THEMES = {
  light: {
    id: "light",
    name: "Claro Profesional",
    bg: "#F8FAFC",
    panel: "#FFFFFF",
    panelBorder: "#E2E8F0",
    text: "#0F172A",
    textMuted: "#64748B",
    primary: "#2563EB",
    safety: "#F59E0B",
    critical: "#EF4444",
    steel: "#6366F1",
    green: "#10B981",
    shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  },
  dark: {
    id: "dark",
    name: "Oscuro Industrial",
    bg: "#0B0F17",
    panel: "#151C28",
    panelBorder: "#232D3F",
    text: "#F1F5F9",
    textMuted: "#94A3B8",
    primary: "#3B82F6",
    safety: "#F59E0B",
    critical: "#EF4444",
    steel: "#818CF8",
    green: "#10B981",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
  corporate: {
    id: "corporate",
    name: "Azul Corporativo",
    bg: "#F0F4F8",
    panel: "#FFFFFF",
    panelBorder: "#BCCCDC",
    text: "#102A43",
    textMuted: "#486581",
    primary: "#0969DA",
    safety: "#D97706",
    critical: "#DC2626",
    steel: "#4F46E5",
    green: "#059669",
    shadow: "0 4px 8px rgba(16, 42, 67, 0.08)",
  },
  emerald: {
    id: "emerald",
    name: "Verde Esmeralda",
    bg: "#F0FDF4",
    panel: "#FFFFFF",
    panelBorder: "#BBF7D0",
    text: "#064E3B",
    textMuted: "#047857",
    primary: "#059669",
    safety: "#D97706",
    critical: "#E11D48",
    steel: "#0284C7",
    green: "#10B981",
    shadow: "0 4px 8px rgba(6, 78, 59, 0.06)",
  },
  neon: {
    id: "neon",
    name: "Neón Cyberpunk",
    bg: "#09090B",
    panel: "#18181B",
    panelBorder: "#27272A",
    text: "#FAFAFA",
    textMuted: "#A1A1AA",
    primary: "#06B6D4",
    safety: "#F59E0B",
    critical: "#F43F5E",
    steel: "#A855F7",
    green: "#22C55E",
    shadow: "0 0 15px rgba(6, 182, 212, 0.15)",
  },
};

// Valor por defecto
export let COLORS = THEMES.light;

// Contexto de Tema
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("app_theme") || "light";
  });

  const theme = THEMES[currentTheme] || THEMES.light;
  COLORS = theme; // Mantener retrocompatibilidad

  useEffect(() => {
    localStorage.setItem("app_theme", currentTheme);
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
  }, [currentTheme, theme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme: setCurrentTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Selector de Temas desplegable / botones
export function ThemeSelector() {
  const { currentTheme, changeTheme } = useTheme();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <Palette size={16} color={COLORS.textMuted} />
      <select
        value={currentTheme}
        onChange={(e) => changeTheme(e.target.value)}
        style={{
          ...inputStyle(COLORS),
          width: "auto",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {Object.values(THEMES).map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ==========================================
// ESTILOS DINÁMICOS BASADOS EN EL TEMA
// ==========================================
export const primaryButtonStyle = (theme = COLORS) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: theme.primary,
  color: "#FFFFFF",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
});

export const ghostButtonStyle = (theme = COLORS) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: theme.panel,
  color: theme.text,
  border: `1px solid ${theme.panelBorder}`,
  borderRadius: 8,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
});

export const inputStyle = (theme = COLORS) => ({
  width: "100%",
  backgroundColor: theme.panel,
  color: theme.text,
  border: `1px solid ${theme.panelBorder}`,
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
});

export const selectStyle = (theme = COLORS) => ({
  ...inputStyle(theme),
  cursor: "pointer",
});

// ==========================================
// COMPONENTES DE INTERFAZ
// ==========================================
export function StatCard({ label, value, color, Icon }) {
  const { theme } = useTheme();
  const cardColor = color || theme.primary;

  return (
    <div
      style={{
        backgroundColor: theme.panel,
        borderRadius: 12,
        padding: "20px 22px",
        border: `1px solid ${theme.panelBorder}`,
        boxShadow: theme.shadow,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", backgroundColor: cardColor }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: theme.text, lineHeight: 1 }}>
          {value}
        </div>
      </div>
      {Icon && (
        <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: `${cardColor}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={24} color={cardColor} />
        </div>
      )}
    </div>
  );
}

export function ModalShell({ title, onClose, children }) {
  const { theme } = useTheme();
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ backgroundColor: theme.panel, borderRadius: 14, width: "100%", maxWidth: 550, maxHeight: "90vh", overflowY: "auto", boxShadow: theme.shadow, border: `1px solid ${theme.panelBorder}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${theme.panelBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  const { theme } = useTheme();
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

export function CenteredMessage({ text }) {
  const { theme } = useTheme();
  return <div style={{ padding: 60, textAlign: "center", color: theme.textMuted, fontSize: 14, fontWeight: 500 }}>{text}</div>;
}

export function EmptyState({ Icon, title, message, onAdd, addLabel }) {
  const { theme } = useTheme();
  return (
    <div style={{ padding: 48, textAlign: "center", backgroundColor: theme.panel, borderRadius: 12, border: `1px dashed ${theme.panelBorder}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {Icon && (
        <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: `${theme.primary}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={28} color={theme.primary} />
        </div>
      )}
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: theme.textMuted, maxWidth: 360 }}>{message}</p>
      {onAdd && <button onClick={onAdd} style={{ ...primaryButtonStyle(theme), marginTop: 8 }}>{addLabel}</button>}
    </div>
  );
}

export function DateRangeFilter({ from, to, onFromChange, onToChange }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Calendar size={16} color={theme.textMuted} />
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} style={{ ...inputStyle(theme), width: "auto" }} />
      <span style={{ fontSize: 12, color: theme.textMuted }}>a</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} style={{ ...inputStyle(theme), width: "auto" }} />
    </div>
  );
}

export function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  const { theme } = useTheme();
  return (
    <ModalShell title={title} onClose={onCancel}>
      <p style={{ margin: "0 0 20px 0", fontSize: 14, color: theme.textMuted }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={onCancel} style={ghostButtonStyle(theme)}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...primaryButtonStyle(theme), backgroundColor: theme.critical }}>Confirmar</button>
      </div>
    </ModalShell>
  );
}

// Toast System
const ToastContext = createContext();

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
          <div key={t.id} style={{ padding: "12px 18px", borderRadius: 8, backgroundColor: t.type === "error" ? "#EF4444" : t.type === "success" ? "#10B981" : "#0F172A", color: "#FFFFFF", fontSize: 13, fontWeight: 600 }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// Auxiliares
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
    console.error(err);
  }
}

export function exportToPdf(title, headers, rows, filename = "reporte") {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  autoTable(doc, { startY: 28, head: [headers], body: rows, theme: "striped" });
  doc.save(`${filename}.pdf`);
}

export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const csvContent = keys.join(",") + "\n" + rows.map((r) => keys.map((k) => `"${r[k] || ""}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

export function shareText(title, text, url) {
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
    alert("Enlace copiado");
  }
}
