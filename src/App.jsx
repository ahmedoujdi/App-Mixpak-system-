import React, { useState } from "react";
import { ThemeProvider, ToastProvider, ThemeSelector, useTheme } from "./shared.jsx";
import Dashboard from "./modules/Dashboard.jsx";
import Mantenimiento from "./modules/Mantenimiento.jsx";
import Produccion from "./modules/Produccion.jsx";
import Calidad from "./modules/Calidad.jsx";
import Inventario from "./modules/Inventario.jsx";
import Usuarios from "./modules/Usuarios.jsx";
import { LayoutDashboard, Wrench, Factory, ShieldCheck, Package, Users } from "lucide-react";

function MainApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { theme } = useTheme();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.bg, color: theme.text, display: "flex", flexDirection: "column" }}>
      {/* BARRA SUPERIOR CON NAVEGACIÓN COMPLETA Y SELECTOR DE TEMAS */}
      <header style={{ backgroundColor: theme.panel, borderBottom: `1px solid ${theme.panelBorder}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontWeight: 800 }}>
            M
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.5px" }}>MIXPAK APP</span>
        </div>

        {/* NAVEGACIÓN ESCRITORIO */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "dashboard", label: "Panel", icon: LayoutDashboard },
            { id: "produccion", label: "Producción", icon: Factory },
            { id: "calidad", label: "Calidad", icon: ShieldCheck },
            { id: "mantenimiento", label: "Mantenimiento", icon: Wrench },
            { id: "inventario", label: "Inventario", icon: Package },
            { id: "usuarios", label: "Usuarios", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: isActive ? `${theme.primary}18` : "transparent",
                  color: isActive ? theme.primary : theme.textMuted,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <ThemeSelector />
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, padding: "20px 16px", maxWidth: 1200, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "produccion" && <Produccion />}
        {activeTab === "calidad" && <Calidad />}
        {activeTab === "mantenimiento" && <Mantenimiento />}
        {activeTab === "inventario" && <Inventario />}
        {activeTab === "usuarios" && <Usuarios />}
      </main>

      {/* BARRA INFERIOR DE ACCESO RÁPIDO (MÓVIL) */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: theme.panel, borderTop: `1px solid ${theme.panelBorder}`, display: "flex", justifyContent: "space-around", padding: "8px 0", zIndex: 100 }}>
        <button onClick={() => setActiveTab("dashboard")} style={{ background: "none", border: "none", color: activeTab === "dashboard" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 600 }}>
          <LayoutDashboard size={18} /> Panel
        </button>
        <button onClick={() => setActiveTab("produccion")} style={{ background: "none", border: "none", color: activeTab === "produccion" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 600 }}>
          <Factory size={18} /> Producción
        </button>
        <button onClick={() => setActiveTab("calidad")} style={{ background: "none", border: "none", color: activeTab === "calidad" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 600 }}>
          <ShieldCheck size={18} /> Calidad
        </button>
        <button onClick={() => setActiveTab("mantenimiento")} style={{ background: "none", border: "none", color: activeTab === "mantenimiento" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 600 }}>
          <Wrench size={18} /> Manto.
        </button>
        <button onClick={() => setActiveTab("inventario")} style={{ background: "none", border: "none", color: activeTab === "inventario" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 600 }}>
          <Package size={18} /> Inventario
        </button>
        <button onClick={() => setActiveTab("usuarios")} style={{ background: "none", border: "none", color: activeTab === "usuarios" ? theme.primary : theme.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 600 }}>
          <Users size={18} /> Usuarios
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
