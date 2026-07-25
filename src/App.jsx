import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { Wrench, Boxes, Factory, ShieldCheck, LogOut, UserCog } from "lucide-react";
import { COLORS, inputStyle, primaryButtonStyle, ghostButtonStyle, CenteredMessage, Field, HazardBar } from "./shared.jsx";
import Dashboard from "./modules/Dashboard.jsx";
import Mantenimiento from "./modules/Mantenimiento.jsx";
import Materiales from "./modules/Materiales.jsx";
import Produccion from "./modules/Produccion.jsx";
import Calidad from "./modules/Calidad.jsx";
import { LayoutDashboard } from "lucide-react";
import RoleGate from "./RoleGate.jsx";
import { ROLES, roleLabel, tabsForRole } from "./roles.js";

const TABS = [
  { value: "resumen", label: "Resumen", icon: LayoutDashboard, Component: Dashboard },
  { value: "mantenimiento", label: "Mantenimiento", icon: Wrench, Component: Mantenimiento },
  { value: "materiales", label: "Materiales", icon: Boxes, Component: Materiales },
  { value: "produccion", label: "Producción", icon: Factory, Component: Produccion },
  { value: "calidad", label: "Calidad", icon: ShieldCheck, Component: Calidad },
];

// ⚠️ MODO PRUEBA: pon esto en `false` en cuanto crees usuarios reales en
// Firebase Authentication. Mientras esté en `true`, la app se salta el login
// por completo y entra directo al tablero (útil mientras configuras Firebase).
const DEV_MODE = true;
const DEV_USER = { email: "prueba@local (modo prueba)", uid: "dev-user" };

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!DEV_MODE);
  const [role, setRole] = useState(undefined); // undefined = cargando, null = sin elegir todavía
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (DEV_MODE) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const activeUser = DEV_MODE ? DEV_USER : user;

  useEffect(() => {
    if (!activeUser) return;
    setRole(undefined);
    setStuck(false);
    const timeout = setTimeout(() => setStuck(true), 8000);
    const unsub = onSnapshot(
      doc(db, "team", activeUser.uid),
      (snap) => {
        clearTimeout(timeout);
        setRole(snap.exists() ? snap.data().role : null);
      },
      () => {
        clearTimeout(timeout);
        setStuck(true);
      }
    );
    return () => { clearTimeout(timeout); unsub(); };
  }, [activeUser?.uid]);

  if (!DEV_MODE) {
    if (authLoading) return <CenteredMessage text="Cargando…" />;
    if (!user) return <LoginScreen />;
  }
  if (role === undefined) {
    if (stuck) {
      return (
        <CenteredMessage text="No se pudo conectar con Firebase. Revisa que src/firebase.js tenga tu firebaseConfig real (no el de ejemplo) y que Firestore esté activado en tu proyecto." />
      );
    }
    return <CenteredMessage text="Cargando…" />;
  }
  if (role === null) return <RoleGate user={activeUser} onSelected={setRole} />;
  return <MainShell user={activeUser} role={role} onChangeRole={() => setRole(null)} />;
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError("Correo o contraseña incorrectos. Verifica con tu supervisor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <form onSubmit={handleLogin} style={{ background: COLORS.panel, width: "100%", maxWidth: 360, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, background: COLORS.safety, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(45deg)" }}>
            <Wrench size={18} color={COLORS.dark} style={{ transform: "rotate(-45deg)" }} />
          </div>
          <h1 style={{ fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 18, margin: 0 }}>
            Mixpak System
          </h1>
        </div>
        <Field label="Correo">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="tecnico@empresa.com" />
        </Field>
        <Field label="Contraseña">
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </Field>
        {error && <p style={{ color: COLORS.critical, fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={primaryButtonStyle}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 14 }}>
          ¿No tienes cuenta? Pídele a tu supervisor que te la cree desde el panel de Firebase.
        </p>
      </form>
    </div>
  );
}

function MainShell({ user, role, onChangeRole }) {
  const allowedTabs = tabsForRole(role);
  const visibleTabs = TABS.filter((t) => allowedTabs.includes(t.value));
  const [tab, setTab] = useState(visibleTabs[0]?.value || "resumen");
  const active = visibleTabs.find((t) => t.value === tab) || visibleTabs[0] || TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.dark }}>
      <header style={{ background: COLORS.dark }}>
        <HazardBar />
        <div style={{ padding: "18px 20px", maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", color: "#F5F3EC", margin: 0 }}>
              Mixpak System
            </h1>
            <p style={{ color: "#B9B6AC", fontSize: 12, margin: "4px 0 0" }}>{user.email} · {roleLabel(role)}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onChangeRole} style={{ ...ghostButtonStyle, color: "#F5F3EC", borderColor: "#454A4E" }}>
              <UserCog size={16} /> Cambiar categoría
            </button>
            <button onClick={() => signOut(auth)} style={{ ...ghostButtonStyle, color: "#F5F3EC", borderColor: "#454A4E" }}>
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
        <nav style={{ maxWidth: 1400, margin: "0 auto", padding: "0 20px", display: "flex", gap: 4, overflowX: "auto" }}>
          {visibleTabs.map((t) => {
            const isActive = t.value === tab;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  background: isActive ? COLORS.bg : "transparent",
                  color: isActive ? COLORS.dark : "#B9B6AC",
                  border: "none",
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 13,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <t.icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: 20 }}>
        <ActiveComponent user={user} goTo={setTab} role={role} />
      </main>
    </div>
  );
}
