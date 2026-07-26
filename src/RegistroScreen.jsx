import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// Pantalla de registro de un nuevo técnico/usuario.
// Al registrarse, se crea su documento en la colección "team"
// con aprobado: false. No podrá usar la app hasta que un
// administrador lo apruebe (ver AdminAprobaciones.jsx).
export default function RegistroScreen({ onVolverALogin }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError("");

    if (!nombre.trim() || !correo.trim() || !password) {
      setError("Completa nombre, correo y contraseña.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, correo.trim(), password);

      // Perfil en Firestore, pendiente de aprobación
      await setDoc(doc(db, "team", cred.user.uid), {
        nombre: nombre.trim(),
        correo: correo.trim(),
        rol: "sin_asignar", // el admin le asigna el rol al aprobar
        aprobado: false,
        creadoEn: new Date().toISOString(),
      });

      setExito(true);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Ese correo ya está registrado.");
      } else if (err.code === "auth/invalid-email") {
        setError("El correo no es válido.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña es muy débil (mínimo 6 caracteres).");
      } else {
        setError("No se pudo registrar: " + err.message);
      }
    } finally {
      setCargando(false);
    }
  };

  if (exito) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Registro enviado</h2>
          <p>
            Tu cuenta se creó correctamente. Un administrador debe
            aprobarla antes de que puedas entrar a la app.
          </p>
          <button style={styles.botonSecundario} onClick={onVolverALogin}>
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleRegistro}>
        <h2>Crear cuenta</h2>

        <label style={styles.label}>Nombre</label>
        <input
          style={styles.input}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre completo"
        />

        <label style={styles.label}>Correo</label>
        <input
          style={styles.input}
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />

        <label style={styles.label}>Contraseña</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.boton} type="submit" disabled={cargando}>
          {cargando ? "Registrando..." : "Registrarme"}
        </button>

        <button
          type="button"
          style={styles.botonSecundario}
          onClick={onVolverALogin}
        >
          Ya tengo cuenta
        </button>
      </form>
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
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  label: { fontSize: 13, fontWeight: 600, marginTop: 8 },
  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 15,
  },
  boton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
  botonSecundario: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "transparent",
    fontSize: 14,
    cursor: "pointer",
  },
  error: { color: "#dc2626", fontSize: 13, marginTop: 4 },
};
