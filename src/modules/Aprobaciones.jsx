import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { UserCheck, UserX, Clock, Trash2, Shield, User } from "lucide-react";
import { COLORS, selectStyle, CenteredMessage, ConfirmDialog, logActivity } from "../shared.jsx";
import { ROLES, roleLabel } from "../roles.js";

export default function Aprobaciones({ user }) {
  const [people, setPeople] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "team"), (snap) => {
      setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function approve(person, aprobado) {
    await updateDoc(doc(db, "team", person.id), { aprobado });
    logActivity(user.email, "Aprobaciones", aprobado ? "Aprobada" : "Revocada", person.email);
  }

  async function changeRole(person, role) {
    await updateDoc(doc(db, "team", person.id), { role });
    logActivity(user.email, "Aprobaciones", "Cambio de categoría", `${person.email}: ${person.role} → ${role}`);
  }

  async function removePerson(person) {
    await deleteDoc(doc(db, "team", person.id));
    logActivity(user.email, "Aprobaciones", "Eliminada", person.email);
    setConfirmRemove(null);
  }

  const pending = useMemo(() => (people || []).filter((p) => !p.aprobado), [people]);
  const approved = useMemo(() => (people || []).filter((p) => p.aprobado), [people]);

  if (!people) return <CenteredMessage text="Cargando usuarios…" />;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Gestión de Accesos & Equipo</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "4px 0 0" }}>Panel restringido a administradores.</p>
      </div>

      {/* Contadores */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <div style={{ background: "rgba(255, 149, 0, 0.08)", border: "1px solid rgba(255, 149, 0, 0.2)", padding: 20, borderRadius: 14, display: "flex", alignItems: "center", gap: 16 }}>
          <Clock size={32} color="#FF9500" />
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{pending.length}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Esperando Aprobación</div>
          </div>
        </div>

        <div style={{ background: "rgba(52, 199, 89, 0.08)", border: "1px solid rgba(52, 199, 89, 0.2)", padding: 20, borderRadius: 14, display: "flex", alignItems: "center", gap: 16 }}>
          <UserCheck size={32} color="#34C759" />
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{approved.length}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Usuarios Activos</div>
          </div>
        </div>
      </div>

      {/* Lista Pendientes */}
      <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#FF9500", marginBottom: 12 }}>
        Pendientes de Aprobación ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", italic: "true", marginBottom: 28 }}>Sin solicitudes pendientes.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {pending.map((p) => (
            <UserRow key={p.id} person={p} onApprove={() => approve(p, true)} onRoleChange={(r) => changeRole(p, r)} onRemove={() => setConfirmRemove(p)} />
          ))}
        </div>
      )}

      {/* Lista Aprobados */}
      <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>
        Usuarios Autorizados ({approved.length})
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {approved.map((p) => (
          <UserRow key={p.id} person={p} approved onApprove={() => approve(p, false)} onRoleChange={(r) => changeRole(p, r)} isSelf={p.id === user.uid} onRemove={() => setConfirmRemove(p)} />
        ))}
      </div>

      {confirmRemove && (
        <ConfirmDialog title="Eliminar cuenta" message={`Se eliminará a ${confirmRemove.email}.`} confirmLabel="Eliminar" onCancel={() => setConfirmRemove(null)} onConfirm={() => removePerson(confirmRemove)} />
      )}
    </div>
  );
}

function UserRow({ person, approved, onApprove, onRoleChange, isSelf, onRemove }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: approved ? "rgba(52, 199, 89, 0.15)" : "rgba(255, 149, 0, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: approved ? "#34C759" : "#FF9500" }}>
          <User size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{person.email} {isSelf && <span style={{ color: "#007AFF", fontSize: 12 }}>(Tú)</span>}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{roleLabel(person.role)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <select value={person.role} onChange={(e) => onRoleChange(e.target.value)} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "6px 10px", borderRadius: 8, fontSize: 12 }}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <button onClick={onApprove} disabled={isSelf && approved} style={{ background: approved ? "rgba(255, 59, 48, 0.2)" : "#34C759", color: approved ? "#FF3B30" : "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          {approved ? <><UserX size={14} /> Revocar</> : <><UserCheck size={14} /> Aprobar</>}
        </button>

        <button onClick={onRemove} disabled={isSelf} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: isSelf ? "not-allowed" : "pointer" }}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
