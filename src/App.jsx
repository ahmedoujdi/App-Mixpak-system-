import React, { useState } from "react";
import { ThemeProvider, ToastProvider, ThemeSelector, useTheme } from "./shared.jsx";
import Dashboard from "./modules/Dashboard.jsx";
import Mantenimiento from "./modules/Mantenimiento.jsx";
import { LayoutDashboard, Wrench, Package, ShieldCheck, Factory } from "lucide-react";

function MainApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { theme } = useTheme();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.bg, color: theme.text, display: "flex", flexDirection: "column" }}>
      {/* BARRA SUPERIOR (HEADER) CON SELECTOR DE TEMA */}
      <header style={{ backgroundColor: theme.panel, borderBottom: `1px solid ${theme.panelBorder}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", sticky: "top" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontWeight: 800 }}>
            M
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.5px" }}>MIXPAK APP</span>
        </div>

        {/* SELECTOR DE TEMAS ENCABEZADO */}
        <ThemeSelector />
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, padding: "20px 16px", maxWidth: 1200, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "mantenimiento" && <Mantenimiento />}
        {activeTab !== "dashboard" && activeTab !== "mantenimiento" && (
          <div style={{ padding: 40, textAlign: "center", color: theme.textMuted }}>
            Módulo {activeTab.toUpperCase()} en mantenimiento.
          </div>
        )}
      </main>

      {/* NAVEGACIÓN INFERIOR (ESTILO MÓVIL) */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: theme.panel, borderTop: `1px solid ${theme.panelBorder}`, display: "flex", justifyContent: "space-around", padding: "8px 0", zIndex: 100 }}>
        <button onClick={() => setActiveTab("dashboard")} style={{ background: "none", border: "none", color: activeTab === "dashboard" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          <LayoutDashboard size={20} />
          Panel
        </button>
        <button onClick={() => setActiveTab("mantenimiento")} style={{ background: "none", border: "none", color: activeTab === "mantenimiento" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          <Wrench size={20} />
          Mantenimiento
        </button>
        <button onClick={() => setActiveTab("produccion")} style={{ background: "none", border: "none", color: activeTab === "produccion" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          <Factory size={20} />
          Producción
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </ThemeProvider>
  );
}
