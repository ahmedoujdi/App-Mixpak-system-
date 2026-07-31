import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase.js";

// Importación de todos los módulos creados
import Dashboard from "./Dashboard.jsx";
import Produccion from "./Produccion.jsx";
import Inventario from "./Inventario.jsx";
import Materiales from "./Materiales.jsx";
import Calidad from "./Calidad.jsx";
import Mantenimiento from "./Mantenimiento.jsx";
import Aprobaciones from "./Aprobaciones.jsx";
import Historial from "./Historial.jsx";

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
  X 
} from "lucide-react";

import { primaryButtonStyle, inputStyle, CenteredMessage } from "./shared.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: Dashboard },
  { id: "produccion", label: "Producción", icon: Factory, component: Produccion },
  { id: "inventario", label: "Inventario", icon: Boxes, component: Inventario },
  { id: "materiales", label: "Materiales", icon: Layers, component: Materiales },
  { id: "calidad", label: "Calidad", icon: ShieldCheck, component: Calidad },
  { id: "mantenimiento", label: "Mantenimiento", icon: Wrench, component: Mantenimiento },
  { id: "aprobaciones", label: "Aprobaciones", icon: CheckCircle2, component: Aprobaciones, badgeKey: "pendingApprovals" },
  { id: "historial", label: "Historial Audit", icon: History, component: Historial },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Escuchar estado de sesión en Firebase
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubAuth;
  }, []);

  // Escuchar aprobaciones pendientes para badge
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "approvals"), where("status", "==", "pendiente"));
    const unsubApprovals = onSnapshot(q, (snap) => {
      setPendingApprovalsCount(snap.docs.length);
    });
    return unsubApprovals;
  }, [user]);

  if (authLoading) {
    return (
      <div style={{ height: "100vh", background: "#0a0a0c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CenteredMessage text="Iniciando Industrial OS..." />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const ActiveComponent = NAV_ITEMS.find((item) => item.id === currentTab)?.component || Dashboard;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0c0d12", color: "#f3f4f6", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar Lateral */}
      <aside
        style={{
          width: sidebarOpen ? 250 : 70,
          background: "rgba(18, 20, 29, 0.95)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          justify: "space-between",
          transition: "width 0.2s ease",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 100,
        }}
      >
        <div>
          {/* Logo / Header Sidebar */}
          <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {sidebarOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#007AFF", boxShadow: "0 0 10px #007AFF" }} />
                <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px", color: "#fff" }}>
                  INDUSTRIAL<span style={{ color: "#007AFF" }}>OS</span>
                </span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 4 }}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Menú de Navegación */}
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
                    justify: sidebarOpen ? "space-between" : "center",
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

                  {/* Badge Notificación */}
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

        {/* User Info / Logout */}
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {sidebarOpen ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 10 }}>
              <div style={{ overflow: "hidden", paddingRight: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {user.email?.split("@")[0]}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Operador</div>
              </div>
              <button onClick={() => signOut(auth)} style={{ background: "transparent", border: "none", color: "#FF3B30", cursor: "pointer" }} title="Cerrar Sesión">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => signOut(auth)} style={{ width: "100%", background: "transparent", border: "none", color: "#FF3B30", cursor: "pointer", padding: "8px 0" }} title="Cerrar Sesión">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main style={{ flex: 1, padding: "28px 36px", overflowY: "auto" }}>
        <ActiveComponent user={user} onNavigate={(tab) => setCurrentTab(tab)} />
      </main>
    </div>
  );
}

{/* Componente Pantalla de Login */}
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
      setError("Credenciales inválidas. Comprueba tu correo y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", background: "#0a0a0c", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "rgba(18, 20, 29, 0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", padding: 12, background: "rgba(0, 122, 255, 0.15)", borderRadius: 14, color: "#007AFF", marginBottom: 12 }}>
            <Factory size={28} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>Industrial OS</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>Plataforma de Control de Operaciones</p>
        </div>

        {error && (
          <div style={{ background: "rgba(255, 59, 48, 0.15)", border: "1px solid #FF3B30", color: "#FF3B30", fontSize: 12, padding: 10, borderRadius: 8, marginBottom: 16, textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, display: "block" }}>CORREO ELECTRÓNICO</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@planta.com" style={{ ...inputStyle, paddingLeft: 36 }} required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, display: "block" }}>CONTRASEÑA</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingLeft: 36 }} required />
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 10, padding: 12, borderRadius: 10 }}>
            {loading ? "Autenticando..." : "Ingresar a Planta"}
          </button>
        </form>
      </div>
    </div>
  );
}
