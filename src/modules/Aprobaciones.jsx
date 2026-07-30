import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
// ⚠️ Rutas con ../
import { db } from "../firebase.js";
import { UserCheck, Check, X } from "lucide-react";
import { COLORS, primaryButtonStyle, ghostButtonStyle, logActivity, CenteredMessage } from "../shared.jsx";
import { roleLabel } from "../roles.js";

export default function Aprobaciones({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "team"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function approveUser(u) {
    await updateDoc(doc(db, "team", u.id), { aprobado: true });
    logActivity(user.email, "Aprobaciones", "Usuario Aprobado", u.email);
  }

  async function rejectUser(u) {
    await deleteDoc(doc(db, "team", u.id));
    logActivity(user.email, "Aprobaciones", "Usuario Rechazado", u.email);
  }

  const pending = users.filter((u) => !u.aprobado);

  return (
    <div>
      <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <UserCheck size={20} color={COLORS.steel} /> Solicitudes de Acceso
      </h1>

      {loading ? (
        <CenteredMessage text="Cargando solicitudes…" />
      ) : pending.length === 0 ? (
        <CenteredMessage text="No hay usuarios pendientes de aprobación." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pending.map((u) => (
            <div key={u.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, padding: 14, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.email}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>Rol solicitado: {roleLabel(u.role)}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approveUser(u)} style={{ ...primaryButtonStyle, background: COLORS.green }}>
                  <Check size={14} /> Aprobar
                </button>
                <button onClick={() => rejectUser(u)} style={{ ...ghostButtonStyle, color: COLORS.critical }}>
                  <X size={14} /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
