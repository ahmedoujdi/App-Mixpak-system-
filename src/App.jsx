import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { getRole, roleLabel, canAccess } from "./roles.js";

// Módulos
import Dashboard from "./modules/Dashboard.jsx";
import Produccion from "./modules/Produccion.jsx";
import Calidad from "./modules/Calidad.jsx";
import Mantenimiento from "./modules/Mantenimiento.jsx";
import Inventario from "./modules/Inventario.jsx";
import Aprobaciones from "./modules/Aprobaciones.jsx";
import Historial from "./modules/Historial.jsx";

// Iconos
import {
  LayoutDashboard,
  Factory,
  ShieldCheck,
  Wrench,
  Boxes,
  UserCheck,
  History,
  LogOut,
  User,
  Activity,
  Lock,
  Mail,
} from "lucide-react";
import { COLORS, primaryButtonStyle, inputStyle, Field } from "./shared.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("operario");
  const [isApproved, setIsApproved] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const ref = doc(db, "team", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUserRole(getRole(data.role));
          setIsApproved(!!data.aprobado);
        } else {
          // Si es usuario nuevo
          await setDoc(ref, {
            email: u.email,
            role: "operario",
            aprobado: false,
            createdAt: serverTimestamp(),
          });
          setUserRole("operario");
          setIsApproved(false);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: COLORS.steel, fontFamily: "sans-serif" }}>
        <Activity className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!isApproved) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, color: COLORS.text, fontFamily: "sans-serif" }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: 28, borderRadius: 10, maxWidth: 400, textAlign: "center" }}>
          <Lock size={40} color={COLORS.safety} style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Acceso Pendiente de Aprobación</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.5 }}>
            Tu cuenta (<strong>{user.email}</strong>) se ha registrado correctamente. Un administrador debe aprobar tu solicitud antes de poder ingresar.
          </p>
          <button onClick={() => signOut(auth)} style={{ ...primaryButtonStyle, marginTop: 16, width: "100%", justifyContent: "center", background: "#1e293b" }}>
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Panel", icon: LayoutDashboard, role: "operario" },
    { id: "produccion", label: "Producción", icon: Factory, role: "operario" },
    { id: "calidad", label: "Calidad", icon: ShieldCheck, role: "calidad" },
    { id: "mantenimiento", label: "Mantenimiento", icon: Wrench, role: "mantenimiento" },
    { id: "inventario", label: "Inventario", icon: Boxes, role: "operario" },
    { id: "aprobaciones", label: "Usuarios", icon: UserCheck, role: "admin" },
    { id: "historial", label: "Historial", icon: History, role: "admin" },
  ];

  const visibleNav = navItems.filter((i) => canAccess(userRole, i.role));

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 70 }}>
      {/* HEADER SUPERIOR */}
      <header style={{ background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: COLORS.steel, width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "1px", textTransform: "uppercase" }}>MixPak App</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right", display: "none", smDisplay: "block" }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{user.email}</div>
            <div style={{ fontSize: 10, color: COLORS.steel, textTransform: "uppercase", fontWeight: 700 }}>{roleLabel(userRole)}</div>
          </div>
          <button onClick={() => signOut(auth)} title="Cerrar Sesión" style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, padding: 6, borderRadius: 6, cursor: "pointer" }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* NAVEGACIÓN DE ESCRITORIO (Pestañas superiores) */}
      <nav style={{ background: "#0e141c", borderBottom: `1px solid ${COLORS.border}`, padding: "0 16px", overflowX: "auto", display: "flex", gap: 4 }}>
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                background: active ? COLORS.panel : "transparent",
                color: active ? COLORS.steel : COLORS.textMuted,
                border: "none",
                borderBottom: active ? `2px solid ${COLORS.steel}` : "2px solid transparent",
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              <Icon size={16} /> {item.label}
            </button>
          );
        })}
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ padding: "20px 16px", maxWidth: 1200, margin: "0 auto" }}>
        {activeTab === "dashboard" && <Dashboard goTo={setActiveTab} />}
        {activeTab === "produccion" && <Produccion user={user} />}
        {activeTab === "calidad" && <Calidad user={user} />}
        {activeTab === "mantenimiento" && <Mantenimiento user={user} />}
        {activeTab === "inventario" && <Inventario user={user} />}
        {activeTab === "aprobaciones" && <Aprobaciones user={user} />}
        {activeTab === "historial" && <Historial user={user} />}
      </main>

      {/* BARRA DE NAVEGACIÓN MÓVIL INFERIOR (BOTTOM NAV) */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: COLORS.panel, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-around", padding: "6px 0", zIndex: 1000 }}>
        {visibleNav.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                background: "none",
                border: "none",
                color: active ? COLORS.steel : COLORS.textMuted,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                flex: 1,
              }}
            >
              <Icon size={18} color={active ? COLORS.steel : COLORS.textMuted} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Pantalla de Login / Registro pulida
function AuthScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError("Credenciales incorrectas o problema de conexión.");
      setLoading(false);
    }
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ background: COLORS.steel, width: 42, height: 42, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Activity size={24} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, textTransform: "uppercase" }}>MixPak Industrial</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>{isRegister ? "Crear cuenta de acceso" : "Iniciar Sesión"}</p>
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${COLORS.critical}`, color: COLORS.critical, padding: 10, borderRadius: 6, fontSize: 12, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <Field label="CORREO ELECTRÓNICO">
            <div style={{ position: "relative" }}>
              <Mail size={16} color={COLORS.textMuted} style={{ position: "absolute", left: 10, top: 12 }} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} placeholder="usuario@empresa.com" />
            </div>
          </Field>

          <Field label="CONTRASEÑA">
            <div style={{ position: "relative" }}>
              <Lock size={16} color={COLORS.textMuted} style={{ position: "absolute", left: 10, top: 12 }} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} placeholder="••••••••" />
            </div>
          </Field>

          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 10, height: 42 }}>
            {loading ? "Cargando…" : isRegister ? "Registrarse" : "Ingresar"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", borderTop: `1px solid ${COLORS.border}`, paddingTop: 14 }}>
          <button onClick={() => setIsRegister(!isRegister)} style={{ background: "none", border: "none", color: COLORS.steel, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate aquí"}
          </button>
        </div>
      </div>
    </div>
  );
}
