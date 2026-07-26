import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

// Se muestra cuando el usuario inició sesión correctamente
// pero su documento en "team" todavía tiene aprobado: false.
export default function PantallaPendiente() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Cuenta pendiente de aprobación</h2>
        <p>
          Ya te registraste, pero un administrador todavía no aprobó tu
          acceso. Avísale para que lo revise. Cuando te apruebe, vuelve a
          entrar con tu correo y contraseña.
        </p>
        <button style={styles.boton} onClick={() => signOut(auth)}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f2f2f2",
    padding: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  boton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
};
