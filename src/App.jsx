import React, { useState, useEffect } from "react";
import { 
  Factory, 
  Wrench, 
  Layers, 
  Boxes, 
  BarChart3, 
  Activity, 
  LogOut, 
  User as UserIcon, 
  Bell, 
  Shield, 
  Zap,
  Menu,
  X
} from "lucide-react";

// Importación de Módulos Enterprise Pro
import Produccion from "./Produccion.jsx";
import Mantenimiento from "./Mantenimiento.jsx";
import Materiales from "./Materiales.jsx";

// Estilo de Contenedor General y Layout
const appContainerStyle = {
  display: "flex",
  minHeight: "100vh",
  backgroundColor: "#0B0C10",
  color: "#FFFFFF",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
};

const sidebarStyle = {
  width: 260,
  backgroundColor: "#12141D",
  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "20px 16px",
  position: "fixed",
  top: 0,
  bottom: 0,
  left: 0,
  zIndex: 100
};

const mainContentStyle = {
  flex: 1,
  marginLeft: 260,
  padding: "32px 40px",
  minHeight: "100vh",
  boxSizing: "border-box"
};

const navButtonStyle = (isActive) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  backgroundColor: isActive ? "rgba(0, 122, 255, 0.15)" : "transparent",
  color: isActive ? "#007AFF" : "rgba(255, 255, 255, 0.6)",
  fontWeight: isActive ? 800 : 500,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s ease",
  textAlign: "left"
});

export default function App() {
  // Pestaña activa (Persistente en localStorage)
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("erp_active_tab") || "produccion";
  });

  // Usuario activo ficticio / Firebase Auth
  const [user, setUser] = useState({
    email: "admin.planta@enterprise.com",
    name: "Ing. Carlos Mendoza",
    role: "Director de Operaciones MES/ERP"
  });

  useEffect(() => {
    localStorage.setItem("erp_active_tab", activeTab);
  }, [activeTab]);

  // Manejador para renderizar el módulo correspondiente
  const renderModule = () => {
    switch (activeTab) {
      case "produccion":
        return <Produccion user={user} />;
      case "mantenimiento":
        return <Mantenimiento user={user} />;
      case "materiales":
        return <Materiales user={user} />;
      default:
        return <Produccion user={user} />;
    }
  };

  return (
    <div style={appContainerStyle}>
      
      {/* SIDEBAR ENTERPRISE */}
      <aside style={sidebarStyle}>
        <div>
          {/* BRAND / LOGO */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #007AFF, #AF52DE)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,122,255,0.3)" }}>
              <Zap size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.5px", color: "#fff" }}>NEXUS ERP</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#007AFF", letterSpacing: "1px" }}>ENTERPRISE MES</div>
            </div>
          </div>

          {/* MENÚ DE NAVEGACIÓN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", padding: "0 12px 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Control de Operaciones
            </div>

            <button 
              onClick={() => setActiveTab("produccion")} 
              style={navButtonStyle(activeTab === "produccion")}
            >
              <Factory size={18} />
              <span>Producción & OEE</span>
            </button>

            <button 
              onClick={() => setActiveTab("mantenimiento")} 
              style={navButtonStyle(activeTab === "mantenimiento")}
            >
              <Wrench size={18} />
              <span>Mantenimiento</span>
            </button>

            <button 
              onClick={() => setActiveTab("materiales")} 
              style={navButtonStyle(activeTab === "materiales")}
            >
              <Layers size={18} />
              <span>Materiales & BOM</span>
            </button>
          </div>
        </div>

        {/* PERFIL DE USUARIO EN SIDEBAR */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,122,255,0.2)", color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>
              CM
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main style={mainContentStyle}>
        
        {/* HEADER SUPERIOR */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34C759", boxShadow: "0 0 8px #34C759" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>SCADA & Servidor en Línea</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", padding: "6px 12px", borderRadius: 20, fontSize: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <Shield size={14} color="#34C759" />
              <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Planta 1 - Modo Enterprise</span>
            </div>

            <button style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", padding: 8, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* MODULO ACTIVO */}
        {renderModule()}
      </main>

    </div>
  );
}
