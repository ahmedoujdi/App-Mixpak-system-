import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

// Pantalla solo para el administrador (tú).
// Muestra a todas las personas registradas y permite:
// - Aprobar y asignarles un rol
// - Rechazar (borra su perfil de "team"; la cuenta de Auth queda
//   sin acceso porque no tendrá perfil aprobado)
const ROLES = ["mantenimiento", "materiales", "produccion", "calidad", "admin"];

export default function AdminAprobaciones() {
  const [personas, setPersonas] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "team"), (snap) => {
      setPersonas(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });
    return () => unsub();
  }, []);

  const aprobar = async (id, rol) => {
    if (!rol || rol === "sin_asignar") {
      alert("Primero elige un rol para esta persona.");
      return;
    }
    await updateDoc(doc(db, "team", id), { aprobado: true, rol });
  };

  const revocar = async (id) => {
    await updateDoc(doc(db, "team", id), { aprobado: false });
  };

  const rechazar = async (id) => {
    if (confirm("¿Eliminar el registro de esta persona?")) {
      await deleteDoc(doc(db, "team", id));
    }
  };

  const pendientes = personas.filter((p) => !p.aprobado);
  const aprobados = personas.filter((p) => p.aprobado);

  return (
    <div style={styles.container}>
      <h2>Pendientes de aprobación</h2>
      {pendientes.length === 0 && <p style={styles.vacio}>No hay solicitudes pendientes.</p>}
      {pendientes.map((p) => (
        <PersonaCard
          key={p.id}
          persona={p}
          onAprobar={(rol) => aprobar(p.id, rol)}
          onRechazar={() => rechazar(p.id)}
        />
      ))}

      <h2 style={{ marginTop: 32 }}>Equipo aprobado</h2>
      {aprobados.map((p) => (
        <div key={p.id} style={styles.filaAprobado}>
          <div>
            <strong>{p.nombre}</strong> — {p.correo} — rol: {p.rol}
          </div>
          <button style={styles.botonRevocar} onClick={() => revocar(p.id)}>
            Revocar acceso
          </button>
        </div>
      ))}
    </div>
  );
}

function PersonaCard({ persona, onAprobar, onRechazar }) {
  const [rol, setRol] = useState("");

  return (
    <div style={styles.card}>
      <div>
        <strong>{persona.nombre}</strong>
        <div style={{ fontSize: 13, color: "#555" }}>{persona.correo}</div>
      </div>
      <select
        style={styles.select}
        value={rol}
        onChange={(e) => setRol(e.target.value)}
      >
        <option value="">Elegir rol...</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={styles.botonAprobar} onClick={() => onAprobar(rol)}>
          Aprobar
        </button>
        <button style={styles.botonRechazar} onClick={onRechazar}>
          Rechazar
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 16, maxWidth: 480, margin: "0 auto" },
  vacio: { color: "#777", fontSize: 14 },
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  select: { padding: 8, borderRadius: 8, border: "1px solid #ccc" },
  botonAprobar: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  botonRechazar: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  botonRevocar: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #dc2626",
    background: "transparent",
    color: "#dc2626",
    cursor: "pointer",
  },
  filaAprobado: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    background: "#fff",
    borderRadius: 8,
    marginBottom: 6,
  },
};
