import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
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
  Activity,
  Lock,
  Mail,
  Search,
  X
} from "lucide-react";
import { COLORS, primaryButtonStyle, inputStyle, Field, ToastProvider, useToast } from "./shared.jsx";

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("operario");
  const [isApproved, setIsApproved] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  
  // Estado para la Modal de Búsqueda Global
  const [searchOpen, setSearchOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [searchResults, setSearchResults] = useState([]);

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

  // Registrar PWA Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Función de Búsqueda Global en Firestore
  async function handleGlobalSearch(text) {
    setQueryText(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    const term = text.toLowerCase();
    const results = [];

    // Buscar en Producción
    const prodSnap = await getDocs(collection(db, "production_orders"));
    prodSnap.forEach((d) => {
      const data = d.data();
      if (`${data.product} ${data.line}`.toLowerCase().includes(term)) {
        results.push({ type: "Producción", title: data.product, subtitle: `Línea: ${data.line}` });
      }
    });

    // Buscar en Inventario
    const invSnap = await getDocs(collection(db, "materials"));
    invSnap.forEach((d) => {
      const data = d.data();
      if (`${data.name} ${data.sku}`.toLowerCase().includes(term)) {
        results.push({ type: "Inventario", title: data.name, subtitle: `SKU: ${data.sku}` });
      }
    });

    setSearchResults(results);
  }

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: COLORS.steel }}>
        <Activity className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!isApproved) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, color: COLORS.text }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: 28, borderRadius: 10, maxWidth: 400, textAlign: "center" }}>
          <Lock size={40} color={COLORS.safety} style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Acceso Pendiente de Aprobación</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 13 }}>Tu cuenta ({user.email}) requiere aprobación de un administrador.</p>
          <button onClick={() => signOut(auth)} style={{ ...primaryButtonStyle, marginTop: 16, width: "100%", justifyContent: "center" }}>
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
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "sans-serif", paddingBottom: 70 }}>
      {/* HEADER SUPERIOR CON BÚSQUEDA GLOBAL */}
      <header style={{ background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: COLORS.steel, width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, textTransform: "uppercase" }}>MixPak App</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSearchOpen(true)} style={{ background: "#080c10", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, padding: "6px 12px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <Search size={14} /> Buscar algo...
          </button>

          <button onClick={() => signOut(auth)} style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, padding: 6, borderRadius: 6, cursor: "pointer" }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* PESTAÑAS SUPERIORES */}
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

      {/* MODAL DE BÚSQUEDA GLOBAL */}
      {searchOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.85)", zIndex: 2000, padding: 20, display: "flex", justifyContent: "center" }}>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, width: "100%", maxWidth: 500, height: "fit-content", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.steel }}>BÚSQUEDA GLOBAL EN PLANTA</span>
              <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }}><X size={16} /></button>
            </div>
            <input
              autoFocus
              value={queryText}
              onChange={(e) => handleGlobalSearch(e.target.value)}
              placeholder="Escribe producto, orden o código SKU..."
              style={{ ...inputStyle, padding: "12px" }}
            />
            <div style={{ marginTop: 12, maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.length === 0 && queryText && <div style={{ fontSize: 12, color: COLORS.textMuted }}>Sin resultados encontrados.</div>}
              {searchResults.map((r, i) => (
                <div key={i} style={{ background: "#0f1722", padding: 10, borderRadius: 4, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 10, color: COLORS.steel, fontWeight: 700, textTransform: "uppercase" }}>{r.type}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{r.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV MÓVIL */}
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
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 360 }}>
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
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="usuario@empresa.com" />
          </Field>
          <Field label="CONTRASEÑA">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
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
