import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { UserCheck, UserX, Clock, Loader2, AlertCircle } from "lucide-react";
import { COLORS, selectStyle, CenteredMessage, StatCard, EmptyState } from "../shared.jsx";
import { ROLES, roleLabel } from "../roles.js";

export default function Aprobaciones({ user }) {
  const [people, setPeople] = useState(null);
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Escuchar cambios en tiempo real en la colección 'team'
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "team"),
      (snap) => {
        const teamData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPeople(teamData);
        setErrorMessage(null);
      },
      (error) => {
        console.error("Error al escuchar cambios en la lista de usuarios:", error);
        setErrorMessage("Error de conexión al cargar la lista de personal.");
      }
    );

    return () => unsub();
  }, []);

  // Handler para aprobar o revocar acceso
  const handleApprove = useCallback(
    async (personId, aprobado) => {
      setLoadingActionId(personId);
      setErrorMessage(null);
      try {
        await updateDoc(doc(db, "team", personId), { aprobado });
      } catch (err) {
        console.error("Error al actualizar estado de aprobación:", err);
        setErrorMessage("No se pudo actualizar el estado del usuario. Revisa tus permisos.");
      } finally {
        setLoadingActionId(null);
      }
    },
    []
  );

  // Handler para cambiar el rol de un usuario
  const handleChangeRole = useCallback(
    async (personId, role, isSelf) => {
      if (isSelf) {
        const confirmChange = window.confirm(
          "¿Estás seguro de cambiar tu propio rol? Esto podría limitar tu acceso a esta sección."
        );
        if (!confirmChange) return;
      }

      setLoadingActionId(personId);
      setErrorMessage(null);
      try {
        await updateDoc(doc(db, "team", personId), { role });
      } catch (err) {
        console.error("Error al actualizar rol:", err);
        setErrorMessage("No se pudo cambiar el rol. Verifica los permisos de Firestore.");
      } finally {
        setLoadingActionId(null);
      }
    },
    []
  );

  // Filtrado de usuarios pendientes y aprobados
  const pending = useMemo(() => (people || []).filter((p) => !p.aprobado), [people]);
  const approved = useMemo(() => (people || []).filter((p) => p.aprobado), [people]);

  if (!people && !errorMessage) {
    return <CenteredMessage text="Cargando personal de la organización…" />;
  }

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <div style={styles.headerContainer}>
        <h1 style={styles.mainTitle}>Aprobaciones y Accesos</h1>
        <p style={styles.subtitle}>Gestión de permisos de usuarios y roles del equipo.</p>
      </div>

      {/* Banner de error global de la vista */}
      {errorMessage && (
        <div style={styles.errorBanner}>
          <AlertCircle size={18} color={COLORS.critical} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tarjetas de Estadísticas */}
      <div style={styles.statsGrid}>
        <StatCard
          label="Pendientes de Aprobación"
          value={pending.length}
          color={COLORS.safety}
          Icon={Clock}
        />
        <StatCard
          label="Usuarios Aprobados"
          value={approved.length}
          color={COLORS.green}
          Icon={UserCheck}
        />
      </div>

      {/* Sección: Pendientes */}
      <h2 style={styles.sectionHeader}>Pendientes de Aprobación</h2>
      {pending.length === 0 ? (
        <p style={styles.emptyText}>No hay solicitudes pendientes en este momento.</p>
      ) : (
        <div style={styles.listContainer}>
          {pending.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              approved={false}
              isLoading={loadingActionId === p.id}
              onApprove={() => handleApprove(p.id, true)}
              onRoleChange={(r) => handleChangeRole(p.id, r, p.id === user.uid)}
              isSelf={p.id === user.uid}
            />
          ))}
        </div>
      )}

      {/* Sección: Aprobados */}
      <h2 style={styles.sectionHeader}>Usuarios Aprobados</h2>
      {approved.length === 0 ? (
        <EmptyState
          Icon={UserCheck}
          title="Sin usuarios activos"
          message="Aprueba a los miembros de la lista superior para otorgarles acceso a la plataforma."
        />
      ) : (
        <div style={styles.listContainer}>
          {approved.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              approved={true}
              isLoading={loadingActionId === p.id}
              onApprove={() => handleApprove(p.id, false)}
              onRoleChange={(r) => handleChangeRole(p.id, r, p.id === user.uid)}
              isSelf={p.id === user.uid}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente individual de fila de usuario
function PersonRow({ person, approved, isLoading, onApprove, onRoleChange, isSelf }) {
  const isButtonDisabled = isLoading || (isSelf && approved);

  return (
    <div
      style={{
        ...styles.rowContainer,
        borderLeft: `5px solid ${approved ? COLORS.green : COLORS.safety}`,
      }}
    >
      {/* Datos del usuario */}
      <div>
        <div style={styles.userEmail}>
          {person.email || "Sin correo registrado"}
          {isSelf && <span style={styles.selfBadge}> (Tú)</span>}
        </div>
        <div style={styles.userRoleLabel}>
          {roleLabel ? roleLabel(person.role) : person.role}
        </div>
      </div>

      {/* Acciones e Interacciones */}
      <div style={styles.actionsContainer}>
        <select
          value={person.role || ""}
          disabled={isLoading}
          onChange={(e) => onRoleChange(e.target.value)}
          style={{
            ...selectStyle,
            fontSize: 12,
            padding: "6px 8px",
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
          aria-label={`Cambiar rol de ${person.email}`}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onApprove}
          disabled={isButtonDisabled}
          title={
            isSelf && approved
              ? "No puedes revocarte la aprobación a ti mismo"
              : approved
              ? "Revocar acceso al sistema"
              : "Aprobar usuario"
          }
          style={{
            ...styles.actionButton,
            background: approved ? COLORS.critical : COLORS.green,
            opacity: isButtonDisabled ? 0.5 : 1,
            cursor: isButtonDisabled ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : approved ? (
            <>
              <UserX size={14} /> Revocar
            </>
          ) : (
            <>
              <UserCheck size={14} /> Aprobar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Estilos locales centralizados
const styles = {
  container: {
    width: "100%",
  },
  headerContainer: {
    marginBottom: 20,
  },
  mainTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    textTransform: "uppercase",
    margin: 0,
    color: COLORS.dark,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    margin: "4px 0 0",
  },
  errorBanner: {
    background: "#FCE8E6",
    border: `1px solid ${COLORS.critical}`,
    color: COLORS.critical,
    padding: "10px 14px",
    borderRadius: 2,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  sectionHeader: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: 14,
    textTransform: "uppercase",
    borderBottom: `2px solid ${COLORS.dark}`,
    paddingBottom: 8,
    marginBottom: 12,
    color: COLORS.dark,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginBottom: 24,
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 24,
  },
  rowContainer: {
    background: COLORS.panel,
    padding: "12px 14px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
    borderRadius: 2,
  },
  userEmail: {
    fontWeight: 600,
    fontSize: 14,
    color: COLORS.dark,
  },
  selfBadge: {
    color: COLORS.steel,
    fontWeight: 500,
    fontSize: 12,
  },
  userRoleLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionsContainer: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  actionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    border: "none",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 2,
    transition: "opacity 0.2s ease",
  },
};
