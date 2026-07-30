import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import {
  Factory,
  ShieldCheck,
  Boxes,
  LayoutDashboard,
  UserCheck,
  History,
  LogOut,
  Lock,
  Mail,
  UserPlus,
} from "lucide-react";

import { COLORS, primaryButtonStyle, inputStyle } from "./shared.jsx";
import { roleLabel } from "./roles.js";

// Importación de todos los módulos desde su subcarpeta
import Dashboard from "./modules/Dashboard.jsx";
import Produccion from "./modules/Produccion.jsx";
import Calidad from "./modules/Calidad.jsx";
import Materiales from "./modules/Materiales.jsx";
import Aprobaciones from "./modules/Aprobaciones.jsx";
import Historial from "./modules/Historial.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Formulario Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedRole, setSelectedRole] = useState("operario");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "team", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role || "operario");
            setApproved(data.aprobado ?? false);
          } else {
            setUserRole("operario");
            setApproved(false);
          }
        } catch (err) {
          console.error("Error al obtener perfil de usuario:", err);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setApproved(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError("");
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "team", res.user.uid), {
          email: res.user.email,
          role: selectedRole,
          aprobado: selectedRole === "admin",
          requestedAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError("Error de autenticación: verifica tus datos.");
    }
  }

  function handleSignOut() {
    signOut(auth);
  }

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.text }}>
        Cargando sistema…
      </div>
    );
  }

  // --- VISTA DE LOGIN Y REGISTRO ---
  if (!user) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: 24, borderRadius: 8, width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, margin: "0 0 6px", textTransform: "uppercase" }}>
              App Mixpak System
            </h1>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
              {isRegistering ? "Crear cuenta de acceso" : "Iniciar sesión para continuar"}
            </p>
          </div>

          {authError && (
            <div style={{ background: COLORS.critical, color: "#fff", padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 14 }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>CORREO ELECTRÓNICO</label>
              <div style={{ position: "relative" }}>
                <Mail size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 10, top: 11 }} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, paddingLeft: 32 }} placeholder="usuario@mixpak.com" />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>CONTRASEÑA</label>
              <div style={{ position: "relative" }}>
                <Lock size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 10, top: 11 }} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, paddingLeft: 32 }} placeholder="••••••••" />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>ROL SOLICITADO</label>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={inputStyle}>
                  <option value="operario">Operario de Producción</option>
                  <option value="mantenimiento">Técnico Mantenimiento</option>
                  <option value="calidad">Inspector de Calidad</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}

            <button type="submit" style={{ ...primaryButtonStyle, justifyContent: "center", marginTop: 6 }}>
              {isRegistering ? <UserPlus size={16} /> : null}
              {isRegistering ? "Registrarse" : "Ingresar"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={() => setIsRegistering(!isRegistering)} style={{ background: "none", border: "none", color: COLORS.steel, fontSize: 13, cursor: "pointer" }}>
              {isRegistering ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate aquí"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- USUARIO NO APROBADO ---
  if (!approved) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: 24, borderRadius: 8, maxWidth: 400, textAlign: "center" }}>
          <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>Cuenta en espera de aprobación</h2>
          <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>
            Hola <strong>{user.email}</strong>. Tu registro con rol de <strong>{roleLabel(userRole)}</strong> está pendiente de confirmación por un administrador.
          </p>
          <button onClick={handleSignOut} style={primaryButtonStyle}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // --- NAVEGACIÓN ---
  const navItems = [
    { id: "dashboard", label: "General", Icon: LayoutDashboard },
    { id: "produccion", label: "Producción", Icon: Factory },
    { id: "calidad", label: "Calidad", Icon: ShieldCheck },
    { id: "materiales", label: "Materiales", Icon: Boxes },
    { id: "aprobaciones", label: "Aprobaciones", Icon: UserCheck, reqAdmin: true },
    { id: "historial", label: "Historial", Icon: History, reqAdmin: true },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "sans-serif" }}>
      {/* Header */}
      <header style={{ background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Factory color={COLORS.steel} size={22} />
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, textTransform: "uppercase" }}>Mixpak System</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{user.email}</div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase" }}>{roleLabel(userRole)}</div>
          </div>
          <button onClick={handleSignOut} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }} title="Salir">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ background: "#0f1722", borderBottom: `1px solid ${COLORS.border}`, display: "flex", overflowX: "auto", padding: "0 8px" }}>
        {navItems.map((item) => {
          if (item.reqAdmin && userRole !== "admin") return null;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: `2px solid ${active ? COLORS.steel : "transparent"}`,
                color: active ? COLORS.steel : COLORS.textMuted,
                padding: "12px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <item.Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Main Container */}
      <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
        {activeTab === "dashboard" && <Dashboard goTo={setActiveTab} />}
        {activeTab === "produccion" && <Produccion user={user} />}
        {activeTab === "calidad" && <Calidad user={user} />}
        {activeTab === "materiales" && <Materiales user={user} />}
        {activeTab === "aprobaciones" && <Aprobaciones user={user} />}
        {activeTab === "historial" && <Historial />}
      </main>
    </div>
  );
}
