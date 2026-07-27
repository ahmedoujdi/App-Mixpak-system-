import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";

import {
  Wrench,
  Boxes,
  Factory,
  ShieldCheck,
  LogOut,
  UserCog,
  UserCheck,
  LayoutDashboard,
} from "lucide-react";

import {
  COLORS,
  inputStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  CenteredMessage,
  Field,
  HazardBar,
} from "./shared.jsx";

import Dashboard from "./modules/Dashboard.jsx";
import Mantenimiento from "./modules/Mantenimiento.jsx";
import Materiales from "./modules/Materiales.jsx";
import Produccion from "./modules/Produccion.jsx";
import Calidad from "./modules/Calidad.jsx";
import Aprobaciones from "./modules/Aprobaciones.jsx";
import RoleGate from "./RoleGate.jsx";
import PendingScreen from "./PendingScreen.jsx";
import { roleLabel, tabsForRole } from "./roles.js";

// --- CONFIGURACIÓN Y CONSTANTES ---
const DEV_MODE = false;
const DEV_USER = { email: "prueba@local (modo prueba)", uid: "dev-user" };

const TABS_CONFIG = [
  { value: "resumen", label: "Resumen", icon: LayoutDashboard, Component: Dashboard },
  { value: "mantenimiento", label: "Mantenimiento", icon: Wrench, Component: Mantenimiento },
  { value: "materiales", label: "Materiales", icon: Boxes, Component: Materiales },
  { value: "produccion", label: "Producción", icon: Factory, Component: Produccion },
  { value: "calidad", label: "Calidad", icon: ShieldCheck, Component: Calidad },
  { value: "aprobaciones", label: "Aprobaciones", icon: UserCheck, Component: Aprobaciones },
];

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!DEV_MODE);
  const [team, setTeam] = useState(undefined); // undefined = cargando, null = sin elegir
  const [stuck, setStuck] = useState(false);

  // Escuchar autenticación de Firebase
  useEffect(() => {
    if (DEV_MODE) return;
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
  }, []);

  const activeUser = DEV_MODE ? DEV_USER : user;

  // Escuchar perfil del equipo en Firestore
  useEffect(() => {
    if (!activeUser?.uid) return;

    setTeam(undefined);
    setStuck(false);

    const timeoutId = setTimeout(() => setStuck(true), 8000);

    const unsubscribe = onSnapshot(
      doc(db, "team", activeUser.uid),
      (snap) => {
        clearTimeout(timeoutId);
        setTeam(snap.exists() ? snap.data() : null);
      },
      (error) => {
        console.error("Error al obtener datos del equipo:", error);
        clearTimeout(timeoutId);
        setStuck(true);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [activeUser?.uid]);

  // Pantallas condicionales de estado
  if (!DEV_MODE) {
    if (authLoading) return <CenteredMessage text="Cargando sistema…" />;
    if (!user) return <LoginScreen />;
  }

  if (team === undefined) {
    if (stuck) {
      return (
        <CenteredMessage text="No se pudo conectar con Firebase. Revisa la configuración de src/firebase.js y que Firestore esté activo." />
      );
    }
    return <CenteredMessage text="Cargando perfil..." />;
  }

  if (team === null) return <RoleGate user={activeUser} onSelected={setTeam} />;
  if (!team.aprobado) return <PendingScreen user={activeUser} role={team.role} />;

  return (
    <MainShell
      user={activeUser}
      role={team.role}
      onChangeRole={() => setTeam(null)}
    />
  );
}

// --- PANTALLA DE ACCESO Y REGISTRO ---
function LoginScreen() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        if (password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      }
    } catch (err) {
      const authErrors = {
        "auth/email-already-in-use": "Ese correo ya tiene una cuenta. Prueba a iniciar sesión.",
        "auth/invalid-email": "El correo electrónico no es válido.",
        "auth/user-not-found": "Correo o contraseña incorrectos.",
        "auth/wrong-password": "Correo o contraseña incorrectos.",
        "auth/invalid-credential": "Correo o contraseña incorrectos.",
      };
      setError(authErrors[err.code] || "Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.dark,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: COLORS.panel,
          width: "100%",
          maxWidth: 360,
          padding: 28,
          borderRadius: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: COLORS.safety,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(45deg)",
            }}
          >
            <Wrench size={18} color={COLORS.dark} style={{ transform: "rotate(-45deg)" }} />
          </div>
          <h1 style={{ fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 18, margin: 0 }}>
            Mixpak System
          </h1>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", marginBottom: 20, borderBottom: `1px solid ${COLORS.line}` }}>
          {["login", "register"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => switchMode(type)}
              style={{
                flex: 1,
                padding: "8px 0",
                background: "none",
                border: "none",
                borderBottom: mode === type ? `2px solid ${COLORS.safety}` : "2px solid transparent",
                fontFamily: "'Oswald', sans-serif",
                textTransform: "uppercase",
                fontSize: 13,
                fontWeight: 600,
                color: mode === type ? COLORS.dark : COLORS.textMuted,
                cursor: "pointer",
              }}
            >
              {type === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <Field label="Nombre">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="Tu nombre"
            />
          </Field>
        )}

        <Field label="Correo">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="tecnico@empresa.com"
          />
        </Field>

        <Field label="Contraseña">
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </Field>

        {error && <p style={{ color: COLORS.critical, fontSize: 13, margin: "10px 0 0" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, marginTop: 16 }}>
          {loading ? "Un momento…" : mode === "login" ? "Entrar" : "Crear mi cuenta"}
        </button>

        {mode === "register" && (
          <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 14 }}>
            Después de crear tu cuenta, te pedirá elegir tu categoría (mecánico, calidad…).
          </p>
        )}
      </form>
    </div>
  );
}

// --- CONTENEDOR PRINCIPAL ---
function MainShell({ user, role, onChangeRole }) {
  // Pestañas permitidas según rol
  const visibleTabs = useMemo(() => {
    const allowedTabs = tabsForRole(role) || [];
    return TABS_CONFIG.filter((tab) => allowedTabs.includes(tab.value));
  }, [role]);

  const [tab, setTab] = useState(() => visibleTabs[0]?.value || "resumen");

  // Mantener sincronizada la pestaña activa si cambia el rol
  useEffect(() => {
    if (!visibleTabs.some((t) => t.value === tab)) {
      setTab(visibleTabs[0]?.value || "resumen");
    }
  }, [visibleTabs, tab]);

  const activeTabObj = useMemo(() => {
    return visibleTabs.find((t) => t.value === tab) || visibleTabs[0] || TABS_CONFIG[0];
  }, [visibleTabs, tab]);

  const ActiveComponent = activeTabObj.Component;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.dark }}>
      <header style={{ background: COLORS.dark }}>
        <HazardBar />
        <div style={{ padding: "18px 20px", maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", color: "#F5F3EC", margin: 0 }}>
              Mixpak System
            </h1>
            <p style={{ color: "#B9B6AC", fontSize: 12, margin: "4px 0 0" }}>
              {user.email} · {roleLabel(role)}
            </p>
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
            const Icon = t.icon;
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
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: 20 }}>
        {ActiveComponent ? <ActiveComponent user={user} goTo={setTab} role={role} /> : null}
      </main>
    </div>
  );
}
