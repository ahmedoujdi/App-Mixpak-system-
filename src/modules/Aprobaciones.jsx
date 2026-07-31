import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  FileCheck, 
  ShieldAlert, 
  User, 
  Calendar,
  Download
} from "lucide-react";
import { 
  primaryButtonStyle, 
  dangerButtonStyle, 
  ghostButtonStyle, 
  inputStyle, 
  CenteredMessage, 
  EmptyState, 
  logActivity, 
  exportToCsv, 
  inDateRange, 
  DateRangeFilter, 
  StatusBadge 
} from "./shared.jsx";

export default function Aprobaciones({ user }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("todos"); // "todos", "pendiente", "aprobado", "rechazado"
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Escuchar solicitudes de aprobación en Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "approvals"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setApprovals(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Manejar acción de Aprobar o Rechazar
  const handleDecision = async (approvalId, title, newStatus) => {
    setProcessingId(approvalId);
    try {
      const approvalRef = doc(db, "approvals", approvalId);
      await updateDoc(approvalRef, {
        status: newStatus,
        reviewedBy: user?.email || "Operador",
        reviewedAt: serverTimestamp(),
      });

      // Registrar la firma electrónica en auditoría
      await logActivity(
        user?.email,
        "Aprobaciones",
        `Solicitud ${newStatus.toUpperCase()}`,
        `Autorización para '${title}' marcada como ${newStatus}`
      );
    } catch (err) {
      console.error("Error al procesar la aprobación:", err);
      alert("Error al guardar la decisión en el servidor.");
    } finally {
      setProcessingId(null);
    }
  };

  // Filtrado dinámico
  const filteredApprovals = approvals.filter((item) => {
    const matchesStatus = filterStatus === "todos" || item.status === filterStatus;
    const matchesSearch = 
      (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.requester || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = inDateRange(item.createdAt || item.timestamp, fromDate, toDate);

    return matchesStatus && matchesSearch && matchesDate;
  });

  // Contadores para métricas superiores
  const pendingCount = approvals.filter((a) => a.status === "pendiente").length;
  const approvedCount = approvals.filter((a) => a.status === "aprobado").length;
  const rejectedCount = approvals.filter((a) => a.status === "rechazado").length;

  if (loading) {
    return <CenteredMessage text="Cargando centro de aprobaciones y firmas..." />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Encabezado del Módulo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "#fff", letterSpacing: "-0.5px" }}>
            Centro de Aprobaciones
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Gestión y firma de autorizaciones operativas de planta.
          </p>
        </div>

        <button onClick={() => exportToCsv("aprobaciones_planta", filteredApprovals)} style={ghostButtonStyle}>
          <Download size={16} /> Exportar Reporte
        </button>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(255, 149, 0, 0.1)", border: "1px solid rgba(255, 149, 0, 0.2)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FF9500" }}>PENDIENTES</span>
            <Clock size={18} color="#FF9500" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 6 }}>{pendingCount}</div>
        </div>

        <div style={{ background: "rgba(52, 199, 89, 0.1)", border: "1px solid rgba(52, 199, 89, 0.2)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#34C759" }}>APROBADAS</span>
            <CheckCircle2 size={18} color="#34C759" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 6 }}>{approvedCount}</div>
        </div>

        <div style={{ background: "rgba(255, 59, 48, 0.1)", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FF3B30" }}>RECHAZADAS</span>
            <XCircle size={18} color="#FF3B30" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 6 }}>{rejectedCount}</div>
        </div>
      </div>

      {/* Toolbar de Filtros y Búsqueda */}
      <div 
        style={{ 
          background: "rgba(255,255,255,0.02)", 
          border: "1px solid rgba(255,255,255,0.06)", 
          borderRadius: 14, 
          padding: 16, 
          marginBottom: 20,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 260 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 11 }} />
            <input 
              type="text" 
              placeholder="Buscar por título, solicitante o categoría..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ ...inputStyle, paddingLeft: 36 }} 
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Select de Estado */}
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={{ ...inputStyle, width: "auto" }}
          >
            <option value="todos" style={{ background: "#12141d" }}>Todos los estados</option>
            <option value="pendiente" style={{ background: "#12141d" }}>Pendientes</option>
            <option value="aprobado" style={{ background: "#12141d" }}>Aprobados</option>
            <option value="rechazado" style={{ background: "#12141d" }}>Rechazados</option>
          </select>

          <DateRangeFilter 
            from={fromDate} 
            to={toDate} 
            onFromChange={setFromDate} 
            onToChange={setToDate} 
          />
        </div>
      </div>

      {/* Lista / Grid de Tarjetas de Aprobación */}
      {filteredApprovals.length === 0 ? (
        <EmptyState 
          Icon={FileCheck} 
          title="Sin Solicitudes" 
          message="No hay solicitudes de aprobación registradas con los filtros actuales." 
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredApprovals.map((item) => {
            const isPending = item.status === "pendiente";
            const isProcessing = processingId === item.id;

            return (
              <div 
                key={item.id} 
                style={{ 
                  background: "rgba(255,255,255,0.02)", 
                  border: isPending ? "1px solid rgba(255, 149, 0, 0.3)" : "1px solid rgba(255,255,255,0.06)", 
                  borderRadius: 16, 
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  transition: "all 0.15s ease"
                }}
              >
                {/* Info Principal */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <StatusBadge statusKey={item.status || "pendiente"} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#007AFF", background: "rgba(0,122,255,0.1)", padding: "2px 8px", borderRadius: 6 }}>
                      {item.category || "General"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>
                    {item.title || "Solicitud de Autorización"}
                  </h3>
                  
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "0 0 12px", maxWidth: 650 }}>
                    {item.description || "Sin detalles adicionales especificados para esta solicitud."}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <User size={13} /> Solicitado por: <strong style={{ color: "#fff" }}>{item.requester || "Sistema"}</strong>
                    </span>
                    {item.reviewedBy && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <FileCheck size={13} color="#34C759" /> Revisado por: <strong style={{ color: "#fff" }}>{item.reviewedBy}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones de Autorización */}
                {isPending ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button 
                      disabled={isProcessing}
                      onClick={() => handleDecision(item.id, item.title, "rechazado")} 
                      style={{ ...dangerButtonStyle, padding: "10px 18px", borderRadius: 10 }}
                    >
                      <XCircle size={16} /> Rechazar
                    </button>
                    <button 
                      disabled={isProcessing}
                      onClick={() => handleDecision(item.id, item.title, "aprobado")} 
                      style={{ ...primaryButtonStyle, background: "#34C759", padding: "10px 18px", borderRadius: 10 }}
                    >
                      <CheckCircle2 size={16} /> Aprobar
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 700, color: item.status === "aprobado" ? "#34C759" : "#FF3B30", background: "rgba(0,0,0,0.2)", padding: "8px 14px", borderRadius: 8 }}>
                    Firma registrada
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
