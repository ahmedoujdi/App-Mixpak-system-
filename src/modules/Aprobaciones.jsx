import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import { CheckCircle2, XCircle, Clock, ShieldCheck, Filter, Search, Download, AlertCircle } from "lucide-react";
import { inputStyle, primaryButtonStyle, ghostButtonStyle, exportToCsv, logActivity, CenteredMessage, ModalShell, ConfirmDialog, EmptyState, Field } from "../shared.jsx";

const APPROVAL_TYPES = [
  { value: "compra_material", label: "Compra de Material" },
  { value: "ajuste_stock", label: "Ajuste de Inventario" },
  { value: "cierre_calidad", label: "Cierre de No Conformidad" },
  { value: "presupuesto", label: "Aprobación de Presupuesto" },
];

const STATUS_MAP = {
  pendiente: { label: "Pendiente", color: "#FF9500", bg: "rgba(255, 149, 0, 0.15)", icon: Clock },
  aprobado: { label: "Aprobado", color: "#34C759", bg: "rgba(52, 199, 89, 0.15)", icon: CheckCircle2 },
  rechazado: { label: "Rechazado", color: "#FF3B30", bg: "rgba(255, 59, 48, 0.15)", icon: XCircle },
};

export default function Aprobaciones({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pendiente");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [comment, setComment] = useState("");

  useEffect(() => {
    const q = query(collection(db, "approvals"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;

    const newStatus = actionType === "approve" ? "aprobado" : "rechazado";
    const payload = {
      status: newStatus,
      reviewedBy: user.email,
      reviewerComment: comment,
      reviewedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, "approvals", selectedRequest.id), payload);
    logActivity(user.email, "Aprobaciones", newStatus === "aprobado" ? "Aprobado" : "Rechazado", selectedRequest.title);

    setSelectedRequest(null);
    setActionType(null);
    setComment("");
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filterStatus !== "todas" && r.status !== filterStatus) return false;
      const term = search.toLowerCase();
      return (
        `${r.title} ${r.requestedBy || ""} ${r.details || ""}`.toLowerCase().includes(term)
      );
    });
  }, [requests, filterStatus, search]);

  const stats = useMemo(() => {
    const pendientes = requests.filter((r) => r.status === "pendiente").length;
    const aprobadas = requests.filter((r) => r.status === "aprobado").length;
    const rechazadas = requests.filter((r) => r.status === "rechazado").length;
    return { pendientes, aprobadas, rechazadas };
  }, [requests]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(52, 199, 89, 0.15)", color: "#34C759", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            WORKFLOW APPROVALS
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Centro de Aprobaciones</h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Pendientes de Firma" value={stats.pendientes} icon={Clock} accentColor="#FF9500" badge={stats.pendientes > 0 ? "Acción Requerida" : null} />
        <KpiCard label="Aprobadas" value={stats.aprobadas} icon={CheckCircle2} accentColor="#34C759" />
        <KpiCard label="Rechazadas" value={stats.rechazadas} icon={XCircle} accentColor="#FF3B30" />
      </div>

      {/* Filtros y Toolbar */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar solicitud, solicitante..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip active={filterStatus === "pendiente"} onClick={() => setFilterStatus("pendiente")}>Pendientes</Chip>
          <Chip active={filterStatus === "aprobado"} onClick={() => setFilterStatus("aprobado")}>Aprobadas</Chip>
          <Chip active={filterStatus === "rechazado"} onClick={() => setFilterStatus("rechazado")}>Rechazadas</Chip>
          <Chip active={filterStatus === "todas"} onClick={() => setFilterStatus("todas")}>Todas</Chip>
        </div>

        <button onClick={() => exportToCsv("reporte-aprobaciones", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Grid de Solicitudes */}
      {loading ? (
        <CenteredMessage text="Cargando solicitudes de aprobación..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={ShieldCheck} title="Sin solicitudes pendientes" message="No hay solicitudes para revisar en este estado." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
          {filtered.map((r) => {
            const st = STATUS_MAP[r.status] || STATUS_MAP.pendiente;
            const IconComponent = st.icon;

            return (
              <div key={r.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <IconComponent size={13} /> {st.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : "Reciente"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>{r.title}</h3>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                    Solicitado por: <strong style={{ color: "rgba(255,255,255,0.8)" }}>{r.requestedBy}</strong>
                  </div>

                  {r.details && (
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 14 }}>
                      {r.details}
                    </div>
                  )}
                </div>

                {/* Footer de Tarjeta */}
                {r.status === "pendiente" ? (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, display: "flex", gap: 10 }}>
                    <button onClick={() => { setSelectedRequest(r); setActionType("reject"); }} style={{ ...ghostButtonStyle, flex: 1, color: "#FF3B30", borderColor: "rgba(255, 59, 48, 0.3)", borderRadius: 8 }}>
                      Rechazar
                    </button>
                    <button onClick={() => { setSelectedRequest(r); setActionType("approve"); }} style={{ ...primaryButtonStyle, flex: 1, background: "#34C759", borderRadius: 8 }}>
                      Aprobar
                    </button>
                  </div>
                ) : (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    Revisado por: {r.reviewedBy || "Sistema"}
                    {r.reviewerComment && <div style={{ fontStyle: "italic", marginTop: 2, color: "rgba(255,255,255,0.6)" }}>"{r.reviewerComment}"</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación de Decisión */}
      {selectedRequest && actionType && (
        <ModalShell title={`${actionType === "approve" ? "Aprobar" : "Rechazar"} Solicitud`} onClose={() => setSelectedRequest(null)}>
          <form onSubmit={handleActionSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
              ¿Estás seguro de que deseas {actionType === "approve" ? "aprobar" : "rechazar"} la solicitud <strong>"{selectedRequest.title}"</strong>?
            </p>

            <Field label="Observación / Justificación (Opcional)">
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Añade un comentario relevante para la auditoría..." style={{ ...inputStyle, minHeight: 80 }} />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setSelectedRequest(null)} style={ghostButtonStyle}>Cancelar</button>
              <button type="submit" style={{ ...primaryButtonStyle, background: actionType === "approve" ? "#34C759" : "#FF3B30" }}>
                Confirmar {actionType === "approve" ? "Aprobación" : "Rechazo"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accentColor, badge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</span>
        {badge && <span style={{ background: accentColor, color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{badge}</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#fff" }}>{value}</div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: active ? "#007AFF" : "rgba(255,255,255,0.05)", color: active ? "#fff" : "rgba(255,255,255,0.7)", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
      {children}
    </button>
  );
}
