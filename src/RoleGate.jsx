import React, { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { COLORS, primaryButtonStyle, HazardBar } from "./shared.jsx";
import { ROLES, roleLabel } from "./roles.js";
import { notifyNewRegistration } from "./emailjs.js";
import {
  Wrench,
  ShieldCheck,
  Factory,
  Boxes,
  LayoutDashboard,
  UserCog,
  AlertCircle,
} from "lucide-react";

// --- MAPEO DE ÍCONOS CON FALLBACK SEGURO ---
const ICONS = {
  mecanico: Wrench,
  calidad: ShieldCheck,
  produccion: Factory,
  almacen: Boxes,
  supervisor: LayoutDashboard,
  admin: UserCog,
};

export default function RoleGate({ user, onSelected }) {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");

  const handleChooseRole = async (role) => {
    setSaving(role);
    setError("");

    try {
      // 1. Guardar en Firestore
      await setDoc(doc(db, "team", user.uid), {
        email: user.email,
        role,
        aprobado: false,
        updatedAt: serverTimestamp(),
      });

      // 2. Notificación vía EmailJS (no bloqueante si falla)
      try {
        await notifyNewRegistration(user.email, roleLabel(role));
      } catch (emailErr) {
        console.warn("No se pudo enviar el correo de notificación:", emailErr);
      }

      // 3. Notificar al estado superior
      onSelected({ role, aprobado: false });
    } catch (err) {
      console.error("Error al asignar rol:", err);
      setError("No se pudo guardar tu selección. Inténtalo de nuevo.");
      setSaving(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <HazardBar />
        <div style={{ padding: 28 }}>
          <h1 style={styles.title}>Mixpak System</h1>
          <p style={styles.description}>
            <strong>{user.email}</strong> — Elige tu categoría para acceder únicamente a tus funciones asignadas. Un administrador deberá aprobar tu cuenta antes de que puedas ingresar.
          </p>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} color={COLORS.critical} />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.buttonsContainer}>
            {ROLES.map((r) => {
              const Icon = ICONS[r.value] || UserCog; // Fallback seguro
              const isSelected = saving === r.value;

              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => handleChooseRole(r.value)}
                  disabled={saving !== null}
                  style={{
                    ...primaryButtonStyle,
                    width: "100%",
                    justifyContent: "flex-start",
                    background: isSelected ? COLORS.line : COLORS.safety,
                    cursor: saving !== null ? "not-allowed" : "pointer",
                    opacity: saving !== null && !isSelected ? 0.6 : 1,
                  }}
                >
                  <Icon size={16} />
                  {isSelected ? "Guardando..." : r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ESTILOS EXTRAÍDOS ---
const styles = {
  container: {
    minHeight: "100vh",
    background: COLORS.dark,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  card: {
    background: COLORS.panel,
    width: "100%",
    maxWidth: 420,
    borderRadius: 4,
    overflow: "hidden",
  },
  title: {
    fontFamily: "'Oswald', sans-serif",
    textTransform: "uppercase",
    fontSize: 18,
    margin: "0 0 6px",
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: "1.5",
    margin: "0 0 20px",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#FFF0F0",
    border: `1px solid ${COLORS.critical}`,
    color: COLORS.critical,
    padding: "10px 12px",
    borderRadius: 4,
    fontSize: 13,
    marginBottom: 16,
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
};
