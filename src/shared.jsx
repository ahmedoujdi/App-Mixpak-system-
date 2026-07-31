import React, { useState, createContext, useContext, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { X, Calendar, Palette, AlertTriangle, CheckCircle2, Info } from "lucide-react";

// ==========================================
// CONFIGURACIÓN DE LOS 5 TEMAS DINÁMICOS
// ==========================================
export const THEMES = {
  light: {
    id: "light",
    name: "Claro Elegante",
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

export let COLORS = THEMES.light;
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("app_theme") || "light";
  });

  const theme = THEMES[currentTheme] || THEMES.light;
  COLORS = theme;

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

export function ThemeSelector() {
  const { currentTheme, changeTheme, theme } = useTheme();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: theme.panel, border: `1px solid ${theme.panelBorder}`, padding: "4px 8px", borderRadius: 8 }}>
      <Palette size={14} color={theme.textMuted} />
      <select
        value={currentTheme}
        onChange={(e) => changeTheme(e.target.value)}
        style={{
          background: "none",
          border: "none",
          color: theme.text,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {Object.values(THEMES).map((t) => (
          <option key={t.id} value={t.id} style={{ background: t.panel, color: t.text }}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ==========================================
// ESTILOS DE DICCIONARIO REUTILIZABLES
// ==========================================
export const primaryButtonStyle = (theme = COLORS) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  backgroundColor: theme.primary,
  color: "#FFFFFF",
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
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
  padding: "8px 14px",
  fontSize: 12,
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
// COMPONENTES UI REUTILIZABLES
// ==========================================
export function StatCard({ label, value, color, Icon }) {
  const { theme } = useTheme();
  const cardColor = color || theme.primary;

  return (
    <div
      style={{
        backgroundColor: theme.panel,
        borderRadius: 12,
        padding: "18px 20px",
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
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: theme.text, lineHeight: 1 }}>
          {value}
        </div>
      </div>
      {Icon && (
        <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: `${cardColor}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={22} color={cardColor} />
        </div>
      )}
    </div>
  );
}

export function ModalShell({ title, onClose, children }) {
  const { theme } = useTheme();
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
      <div style={{ backgroundColor: theme.panel, borderRadius: 14, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: theme.shadow, border: `1px solid ${theme.panelBorder}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.panelBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: theme.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  const { theme } = useTheme();
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textMuted, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

export function CenteredMessage({ text }) {
  const { theme } = useTheme();
  return <div style={{ padding: 40, textAlign: "center", color: theme.textMuted, fontSize: 13, fontWeight: 500 }}>{text}</div>;
}

export function SignaturePad({ onSave }) {
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo((e.clientX || e.touches[0].clientX) - rect.left, (e.clientY || e.touches[0].clientY) - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 2;
    ctx.lineTo((e.clientX || e.touches[0].clientX) - rect.left, (e.clientY || e.touches[0].clientY) - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave("");
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ border: `1px solid ${theme.panelBorder}`, borderRadius: 8, backgroundColor: theme.bg, cursor: "crosshair", width: "100%", touchAction: "none" }}
      />
      <button type="button" onClick={clearCanvas} style={{ ...ghostButtonStyle(theme), marginTop: 6, fontSize: 11 }}>
        Limpiar Firma
      </button>
    </div>
  );
}

// ==========================================
// TOAST NOTIFICACIONES
// ==========================================
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
      <div style={{ position: "fixed", bottom: 70, right: 20, zIndex: 10000, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ padding: "10px 16px", borderRadius: 8, backgroundColor: t.type === "error" ? "#EF4444" : t.type === "success" ? "#10B981" : "#2563EB", color: "#FFFFFF", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
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

// ==========================================
// FUNCIONES AUXILIARES Y DE CÁLCULO
// ==========================================
export function calculateKPIs(logs = []) {
  if (!logs || logs.length === 0) return { mttr: "0 hrs", mtbf: "0 días", availability: "100%" };
  let totalRepairHours = 0;
  let totalFailures = 0;
  logs.forEach((log) => {
    if (log.type === "Correctivo" || log.status === "Completado") {
      totalFailures++;
      totalRepairHours += Number(log.repairTimeHours) || 1.5;
    }
  });
  const mttr = totalFailures > 0 ? (totalRepairHours / totalFailures).toFixed(1) + " hrs" : "0 hrs";
  const mtbf = totalFailures > 0 ? (30 / totalFailures).toFixed(1) + " días" : "30+ días";
  const availability = totalFailures > 0 ? Math.max(0, 100 - (totalRepairHours / 720) * 100).toFixed(1) + "%" : "100%";
  return { mttr, mtbf, availability };
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
