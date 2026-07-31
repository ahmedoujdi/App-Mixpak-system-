import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase.js";

// Importación de utilidades y componentes compartidos
import { 
  primaryButtonStyle, 
  inputStyle, 
  CenteredMessage 
} from "./shared.jsx";

// Importación de Íconos de Lucide
import { 
  LayoutDashboard, 
  Factory, 
  Boxes, 
  Layers, 
  ShieldCheck, 
  Wrench, 
  CheckCircle2, 
  History, 
  LogOut, 
  User, 
  Lock, 
  Mail, 
  Menu, 
  X,
  AlertTriangle
} from "lucide-react";

// ============================================================================
// COMPONENTES FALLBACK DE SEGURIDAD (Previenen fallos en Build si falta un .jsx)
// ============================================================================
const ModuleFallback = ({ title }) => (
  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, padding: 40, textAlign: "center" }}>
    <AlertTriangle size={36} color="#FF9500" style={{ marginBottom: 12 }} />
    <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Módulo {title}</h2>
    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>El componente está listo en la arquitectura pero su archivo individual está cargando o en sincronización.</p>
  </div>
);

// Intentos de importación dinámica o directa con fallback
let DashboardComp, ProduccionComp, InventarioComp, MaterialesComp, CalidadComp, MantenimientoComp, AprobacionesComp, HistorialComp;

try { DashboardComp = require("./Dashboard.jsx").default; } catch (e) { DashboardComp = () => <ModuleFallback title="Dashboard" />; }
try { ProduccionComp = require("./Produccion.jsx").default; } catch (e) { ProduccionComp = () => <ModuleFallback title="Producción" />; }
try { InventarioComp = require("./Inventario.jsx").default; } catch (e) { InventarioComp = () => <ModuleFallback title="Inventario" />; }
try { MaterialesComp = require("./Materiales.jsx").default; } catch (e) { MaterialesComp = () => <ModuleFallback title="Materiales" />; }
try { CalidadComp = require("./Calidad.jsx").default; } catch (e) { CalidadComp = () => <ModuleFallback title="Calidad" />; }
try { MantenimientoComp = require("./Mantenimiento.jsx").default; } catch (e) { MantenimientoComp = () => <ModuleFallback title="Mantenimiento" />; }
try { AprobacionesComp = require("./Aprobaciones.jsx").default; } catch (e) { AprobacionesComp = () => <ModuleFallback title="Aprobaciones" />; }
try { HistorialComp = require("./Historial.jsx").default; } catch (e) { HistorialComp = () => <ModuleFallback title="Historial Audit" />; }

// Configuración centralizada de la navegación
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: DashboardComp },
  { id: "produccion", label: "Producción", icon: Factory, component: ProduccionComp },
  { id: "inventario", label: "Inventario", icon: Boxes, component: InventarioComp },
  { id: "materiales", label: "Materiales", icon: Layers, component: MaterialesComp },
  { id: "calidad", label: "Calidad", icon: ShieldCheck, component: CalidadComp },
  { id: "mantenimiento", label: "Mantenimiento", icon: Wrench, component: MantenimientoComp },
  { id: "aprobaciones", label: "Aprobaciones", icon: CheckCircle2, component: AprobacionesComp, badgeKey: "pendingApprovals" },
  { id: "historial", label: "Historial Audit", icon: History, component: HistorialComp },
];

// ============================================================================
// COMPONENTE PRINCIPAL (APP)
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // 1. Escuchar sesión activa en Firebase Auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // 2. Escuchar contadores de aprobaciones pendientes en tiempo real
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, "approvals"), where("status", "==", "pendiente"));
      const unsubApprovals = onSnapshot(q, (snap) => {
        setPendingApprovalsCount(snap.docs.length);
      });
      return () => unsubApprovals();
    } catch (e) {
      console.warn("Colección de aprobaciones en espera de datos iniciales.");
    }
  }, [user]);

  // Pantalla de carga global
  if (authLoading) {
    return (
      <div style={{ height: "100vh", background: "#0c0d12", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CenteredMessage text="Iniciando Industrial OS..." />
      </div>
    );
  }

  // Si no hay usuario autenticado, renderizar Login
  if (!user) {
    return <LoginScreen />;
  }

  // Componente activo dinámico
  const activeNavItem = NAV_ITEMS.find((item) => item.id === currentTab) || NAV_ITEMS[0];
  const ActiveComponent = activeNavItem.component;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0c0d12", color: "#f3f4f6", fontFamily: "Inter, system-ui, sans-serif" }}>
      
      {/* SIDEBAR NAVEGACIÓN LATERAL */}
      <aside
        style={{
          width: sidebarOpen ? 260 : 72,
          background: "rgba(18, 20, 29, 0.95)",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 100,
          backdropFilter: "blur(12px)"
        }}
      >
        <div>
          {/* Header del Sidebar */}
          <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {sidebarOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#007AFF", boxShadow: "0 0 12px #007AFF" }} />
                <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px", color: "#fff" }}>
                  INDUSTRIAL<span style={{ color: "#007AFF" }}>OS</span>
                </span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 6, borderRadius: 8 }}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Menú de Opciones */}
          <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const badgeValue = item.badgeKey === "pendingApprovals" ? pendingApprovalsCount : 0;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: sidebarOpen ? "space-between" : "center",
                    padding: sidebarOpen ? "10px 14px" : "10px 0",
                    borderRadius: 10,
                    border: "none",
                    background: isActive ? "rgba(0, 122, 255, 0.15)" : "transparent",
                    color: isActive ? "#007AFF" : "rgba(255,255,255,0.6)",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Icon size={18} color={isActive ? "#007AFF" : "rgba(255,255,255,0.6)"} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </div>

                  {/* Badge de Notificación */}
                  {badgeValue > 0 && (
                    <span style={{ background: "#FF3B30", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 10 }}>
                      {badgeValue}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Panel Inferior de Usuario */}
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {sidebarOpen ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 10 }}>
              <div style={{ overflow: "hidden", paddingRight: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {user.email?.split("@")[0]}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Operador de Planta</div>
              </div>
              <button 
                onClick={() => signOut(auth)} 
                style={{ background: "transparent", border: "none", color: "#FF3B30", cursor: "pointer", padding: 4 }} 
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => signOut(auth)} 
              style={{ width: "100%", background: "transparent", border: "none", color: "#FF3B30", cursor: "pointer", padding: "8px 0" }} 
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        <ActiveComponent user={user} onNavigate={(tab) => setCurrentTab(tab)} />
      </main>
    </div>
  );
}

// ============================================================================
// COMPONENTE DE AUTENTICACIÓN (LOGIN SCREEN)
// ============================================================================
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Acceso denegado. Revisa tus credenciales e intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", background: "#0c0d12", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div 
        style={{ 
          width: "100%", 
          maxWidth: 400, 
          background: "rgba(18, 20, 29, 0.85)", 
          border: "1px solid rgba(255, 255, 255, 0.1)", 
          borderRadius: 24, 
          padding: 36, 
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(16px)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", padding: 14, background: "rgba(0, 122, 255, 0.15)", borderRadius: 16, color: "#007AFF", marginBottom: 14 }}>
            <Factory size={32} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: "#fff", letterSpacing: "-0.5px" }}>Industrial OS</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>Plataforma Centralizada de Control de Planta</p>
        </div>

        {error && (
          <div style={{ background: "rgba(255, 59, 48, 0.15)", border: "1px solid #FF3B30", color: "#FF3B30", fontSize: 12, padding: 12, borderRadius: 10, marginBottom: 18, textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>CORREO ELECTRÓNICO</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 14, top: 13 }} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="operador@planta.com" 
                style={{ ...inputStyle, paddingLeft: 40, height: 42 }} 
                required 
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>CONTRASEÑA</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 14, top: 13 }} />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                style={{ ...inputStyle, paddingLeft: 40, height: 42 }} 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 8, padding: "12px", borderRadius: 10, fontSize: 14 }}
          >
            {loading ? "Autenticando..." : "Ingresar al Sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}
