import React, { useState } from "react";
import { 
  Wrench, 
  Boxes, 
  Factory, 
  ShieldCheck, 
  History, 
  LayoutDashboard, 
  User, 
  Bell, 
  Search 
} from "lucide-react";

import { COLORS } from "./shared.jsx";
import ExportButton from "./ExportModule.jsx";

// Vistas de módulos (placeholder sólido o tus módulos actuales)
import MantenimientoModule from "./Mantenimiento.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("mantenimiento");
  const [globalSearch, setGlobalSearch] = useState("");
  
  const currentUser = {
    name: "Operador Mixpak",
    email: "operaciones@mixpak.com",
    role: "Supervisión / Planta",
  };

  const navItems = [
    { id: "mantenimiento", label: "Mantenimiento", icon: Wrench },
    { id: "materiales", label: "Materiales & Stock", icon: Boxes },
    { id: "produccion", label: "Producción", icon: Factory },
    { id: "calidad", label: "Control Calidad", icon: ShieldCheck },
    { id: "historial", label: "Historial Audit", icon: History },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: COLORS.bg, color: COLORS.textMain, fontFamily: "'Inter', sans-serif" }}>
      
      {/* Sidebar Lateral Nivel 2026 */}
      <aside
        style={{
          width: "250px",
          backgroundColor: COLORS.cardBg,
          borderRight: `1px solid ${COLORS.cardBorder}`,
          display: "flex",
          flexDirection: "column",
          padding: "20px 14px",
          justifyContent: "space-between",
        }}
      >
        <div>
          {/* Logo / Header Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px 24px 8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: COLORS.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "900",
                fontSize: "18px",
                boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)",
              }}
            >
              M
            </div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "15px", letterSpacing: "0.5px" }}>MIXPAK</div>
              <div style={{ fontSize: "10px", color: COLORS.textMuted }}>PLATAFORMA INDUSTRIAL</div>
            </div>
          </div>

          {/* Navegación */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: isActive ? "rgba(59, 130, 246, 0.12)" : "transparent",
                    color: isActive ? COLORS.primary : COLORS.textMuted,
                    fontWeight: isActive ? "600" : "500",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "left",
                  }}
                >
                  <Icon size={18} style={{ color: isActive ? COLORS.primary : COLORS.textMuted }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Info Usuario */}
        <div
          style={{
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${COLORS.cardBorder}`,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={16} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{currentUser.name}</div>
            <div style={{ fontSize: "10px", color: COLORS.textMuted }}>{currentUser.role}</div>
          </div>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}>
        
        {/* Header Superior */}
        <header
          style={{
            height: "64px",
            borderBottom: `1px solid ${COLORS.cardBorder}`,
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(22, 27, 38, 0.6)",
            backdropFilter: "blur(10px)",
            sticky: "top",
          }}
        >
          {/* Buscador Global */}
          <div style={{ position: "relative", width: "320px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} />
            <input
              type="text"
              placeholder="Buscar en el sistema..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: COLORS.bg,
                border: `1px solid ${COLORS.cardBorder}`,
                borderRadius: "20px",
                padding: "7px 12px 7px 36px",
                color: COLORS.textMain,
                fontSize: "12px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: "6px" }}>
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Cuerpo del Módulo */}
        <div style={{ padding: "28px", flex: 1 }}>
          {activeTab === "mantenimiento" && (
            <MantenimientoModule currentUser={currentUser} globalSearch={globalSearch} />
          )}

          {activeTab !== "mantenimiento" && (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.textMuted }}>
              <h2>Módulo {activeTab.toUpperCase()} listo para vincular.</h2>
              <p>Puedes pasarme los archivos de este módulo para dejarlos con esta misma calidad.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
