import React, { useState, useEffect } from "react";
import { 
  Factory, 
  Wrench, 
  Layers, 
  Shield, 
  Zap,
  Bell
} from "lucide-react";

// IMPORTACIÓN CORREGIDA: Apunta a la carpeta /modules/ y con la P mayúscula
import ProduccionModule from "./modules/Produccion";

// Componente placeholder si aún no subes Mantenimiento o Materiales a GitHub
const ComponenteEnDesarrollo = ({ titulo }) => (
  <div style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.1)" }}>
    <h2 style={{ color: "#fff", margin: 0 }}>Módulo {titulo}</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 8 }}>Este módulo estará disponible próximamente en tu entorno ERP.</p>
  </div>
);

// Layout Styles
const appContainerStyle = {
  display: "flex",
  minHeight: "100vh",
  backgroundColor: "#0B0C10",
  color: "#FFFFFF",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif"
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
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("erp_active_tab") || "produccion";
  });

  const [user] = useState({
    email: "admin.planta@enterprise.com",
    name: "Ing. Carlos Mendoza",
    role: "Director de Operaciones MES/ERP"
  });

  useEffect(() => {
    localStorage.setItem("erp_active_tab", activeTab);
  }, [activeTab]);

  const renderModule = () => {
    switch (activeTab) {
      case "produccion":
        return <ProduccionModule user={user} />;
      case "mantenimiento":
        return <ComponenteEnDesarrollo titulo="Mantenimiento" />;
      case "materiales":
        return <ComponenteEnDesarrollo titulo="Materiales & BOM" />;
      default:
        return <ProduccionModule user={user} />;
    }
  };

  return (
    <div style={appContainerStyle}>
      {/* SIDEBAR */}
      <aside style={sidebarStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #007AFF, #AF52DE)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>NEXUS ERP</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#007AFF" }}>ENTERPRISE MES</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={() => setActiveTab("produccion")} style={navButtonStyle(activeTab === "produccion")}>
              <Factory size={18} />
              <span>Producción & OEE</span>
            </button>
            <button onClick={() => setActiveTab("mantenimiento")} style={navButtonStyle(activeTab === "mantenimiento")}>
              <Wrench size={18} />
              <span>Mantenimiento</span>
            </button>
            <button onClick={() => setActiveTab("materiales")} style={navButtonStyle(activeTab === "materiales")}>
              <Layers size={18} />
              <span>Materiales & BOM</span>
            </button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,122,255,0.2)", color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
              CM
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{user.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main style={mainContentStyle}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34C759" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>SCADA & Servidor Activo</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", padding: "6px 12px", borderRadius: 20, fontSize: 12 }}>
              <Shield size={14} color="#34C759" />
              <span>Planta Enterprise</span>
            </div>
            <button style={{ background: "transparent", border: "none", color="#fff", cursor: "pointer" }}>
              <Bell size={16} />
            </button>
          </div>
        </header>

        {renderModule()}
      </main>
    </div>
  );
}
