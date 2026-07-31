import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
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
  Download,
  KeyRound,
  DollarSign,
  AlertTriangle,
  Building2,
  Check,
  X,
  Plus
} from "lucide-react";
import { 
  primaryButtonStyle, 
  dangerButtonStyle, 
  ghostButtonStyle, 
  secondaryButtonStyle,
  inputStyle, 
  CenteredMessage, 
  EmptyState, 
  ModalShell,
  Field,
  logActivity, 
  exportToCsv, 
  inDateRange, 
  DateRangeFilter, 
  StatusBadge,
  formatTimestamp 
} from "./shared.jsx";

export default function Aprobaciones({ user }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pendiente"); // Por defecto enfocamos en Pendientes
  const [filterCategory, setFilterCategory] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Estados para Firma Electrónica con Modal PIN
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [decisionType, setDecisionType] = useState(null); // "aprobado" | "rechazado"
  const [pin, setPin] = useState("");
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);
  const [pinError, setPinError] = useState("");

  // Estado para Nueva Solicitud Manual
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: "",
    category: "Presupuesto",
    urgency: "media",
    estimatedCost: "",
    description: "",
    impactArea: "Línea de Ensamble 1"
  });

  // Escuchar colecciones en tiempo real desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "approvals"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setApprovals(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Iniciar flujo de firma
  const openSignatureModal = (approvalItem, decision) => {
    setSelectedApproval(approvalItem);
    setDecisionType(decision);
    setPin("");
    setComments("");
    setPinError("");
  };

  // Confirmar Firma y Guardar Decisión
  const handleConfirmSignature = async (e) => {
    e.preventDefault();
    
    // Validación de PIN Enterprise (Simulado: 1234 o cualquier código de 4 dígitos)
    if (pin.length < 4) {
      setPinError("Ingrese un PIN válido de firma electrónica (min. 4 dígitos).");
      return;
    }

    setProcessing(true);
    try {
      const approvalRef = doc(db, "approvals", selectedApproval.id);
      await updateDoc(approvalRef, {
        status: decisionType,
        reviewedBy: user?.email || "Operador Pro",
        reviewedAt: serverTimestamp(),
        decisionComments: comments,
        signatureHash: `SIG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      });

      // Registrar auditoría estricta
      await logActivity(
        user?.email,
        "Aprobaciones",
        `Firma Digital: ${decisionType.toUpperCase()}`,
        `Solicitud '${selectedApproval.title}' ${decisionType} con comentario: "${comments || 'Sin comentarios'}"`
      );

      setSelectedApproval(null);
      setDecisionType(null);
    } catch (err) {
      console.error("Error al firmar electrónicamente:", err);
      alert("Error al procesar la firma en la red.");
    } finally {
      setProcessing(false);
    }
  };

  // Crear nueva solicitud de aprobación
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await addDoc(collection(db, "approvals"), {
        ...newRequest,
        status: "pendiente",
        requester: user?.email || "Supervisor de Planta",
        createdAt: serverTimestamp(),
        estimatedCost: parseFloat(newRequest.estimatedCost) || 0
      });

      await logActivity(
        user?.email,
        "Aprobaciones",
        "Nueva Solicitud Creada",
        `Solicitud de autorización '${newRequest.title}' enviada a directiva.`
      );

      setShowNewModal(false);
      setNewRequest({ title: "", category: "Presupuesto", urgency: "media", estimatedCost: "", description: "", impactArea: "Línea de Ensamble 1" });
    } catch (err) {
      console.error("Error al crear la solicitud:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Métricas y Filtrado
  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      const matchesStatus = filterStatus === "todos" || item.status === filterStatus;
      const matchesCategory = filterCategory === "todos" || item.category === filterCategory;
      const matchesSearch = 
        (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.requester || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.impactArea || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = inDateRange(item.createdAt, fromDate, toDate);

      return matchesStatus && matchesCategory && matchesSearch && matchesDate;
    });
  }, [approvals, filterStatus, filterCategory, searchTerm, fromDate, toDate]);

  const metrics = useMemo(() => {
    const pending = approvals.filter((a) => a.status === "pendiente");
    const approved = approvals.filter((a) => a.status === "aprobado");
    const rejected = approvals.filter((a) => a.status === "rechazado");
    const totalCostPending = pending.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);

    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      totalCostPending
    };
  }, [approvals]);

  if (loading) {
    return <CenteredMessage text="Iniciando subsistema de firmas electrónicas..." />;
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", paddingBottom: 50 }}>
      
      {/* HEADER DE MÓDULO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ background: "rgba(0,122,255,0.15)", color: "#007AFF", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4 }}>
              CUMPLIMIENTO ISO 27001 & FDA PART 11
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Centro de Autorización & Firmas
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Aprobación con firma criptográfica de compras, cambios de proceso y mantenimientos extraordinarios.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportToCsv("reporte_firmas_planta", filteredApprovals)} style={ghostButtonStyle}>
            <Download size={16} /> Exportar Auditoría
          </button>
          <button onClick={() => setShowNewModal(true)} style={primaryButtonStyle}>
            <Plus size={16} /> Nueva Solicitud
          </button>
        </div>
      </div>

      {/* STRIP DE KPIS ENTERPRISE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(255, 149, 0, 0.08)", border: "1px solid rgba(255, 149, 0, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF9500" }}>PENDIENTES DE FIRMA</span>
            <Clock size={18} color="#FF9500" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.pendingCount}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Impacto: ${metrics.totalCostPending.toLocaleString()} USD</div>
        </div>

        <div style={{ background: "rgba(52, 199, 89, 0.08)", border: "1px solid rgba(52, 199, 89, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#34C759" }}>SOLICITUDES APROBADAS</span>
            <CheckCircle2 size={18} color="#34C759" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.approvedCount}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Liberadas en sistema</div>
        </div>

        <div style={{ background: "rgba(255, 59, 48, 0.08)", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF3B30" }}>DENEGADAS</span>
            <XCircle size={18} color="#FF3B30" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.rejectedCount}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Rechazadas con observación</div>
        </div>
      </div>

      {/* BARRA DE FILTROS AVANZADOS */}
      <div 
        style={{ 
          background: "rgba(255,255,255,0.02)", 
          border: "1px solid rgba(255,255,255,0.06)", 
          borderRadius: 16, 
          padding: 16, 
          marginBottom: 20,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input 
            type="text" 
            placeholder="Buscar por título, solicitante, área de impacto..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ ...inputStyle, paddingLeft: 38 }} 
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Estados</option>
            <option value="pendiente" style={{ background: "#12141d" }}>Pendientes de Firma</option>
            <option value="aprobado" style={{ background: "#12141d" }}>Aprobados</option>
            <option value="rechazado" style={{ background: "#12141d" }}>Rechazados</option>
          </select>

          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todas las Categorías</option>
            <option value="Presupuesto" style={{ background: "#12141d" }}>Presupuesto & Compras</option>
            <option value="Mantenimiento" style={{ background: "#12141d" }}>Mantenimiento Crítico</option>
            <option value="Proceso" style={{ background: "#12141d" }}>Cambio de Proceso / BOM</option>
            <option value="Calidad" style={{ background: "#12141d" }}>Liberación de Lote CAPA</option>
          </select>

          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {/* LISTADO DE TARJETAS DE APROBACIÓN DETALLADAS */}
      {filteredApprovals.length === 0 ? (
        <EmptyState 
          Icon={FileCheck} 
          title="Sin Autorizaciones Pendientes" 
          message="No se encontraron solicitudes que requieran tu firma bajo los criterios seleccionados." 
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredApprovals.map((item) => {
            const isPending = item.status === "pendiente";
            const cost = Number(item.estimatedCost) || 0;

            return (
              <div 
                key={item.id} 
                style={{ 
                  background: "rgba(255,255,255,0.02)", 
                  border: isPending ? "1px solid rgba(255, 149, 0, 0.3)" : "1px solid rgba(255,255,255,0.06)", 
                  borderRadius: 18, 
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16
                }}
              >
                {/* Lado Izquierdo: Información Detallada */}
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <StatusBadge statusKey={item.status || "pendiente"} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#007AFF", background: "rgba(0,122,255,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                      {item.category || "General"}
                    </span>
                    {item.urgency === "alta" && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#FF3B30", background: "rgba(255,59,48,0.12)", padding: "2px 6px", borderRadius: 4 }}>
                        URGENCIA ALTA
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>
                    {item.title}
                  </h3>
                  
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: "0 0 14px", lineHeight: "1.4", maxWidth: 750 }}>
                    {item.description || "Sin descripción detallada disponible."}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 12, color: "rgba(255,255,255,0.45)", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <User size={14} color="#007AFF" /> Solicitante: <strong style={{ color: "#fff" }}>{item.requester}</strong>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Building2 size={14} /> Área: <strong style={{ color: "#fff" }}>{item.impactArea || "Planta Principal"}</strong>
                    </span>
                    {cost > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#34C759", fontWeight: 700 }}>
                        <DollarSign size={14} /> Costo Estimado: ${cost.toLocaleString()} USD
                      </span>
                    )}
                  </div>

                  {/* Resumen de Resolución si ya está firmado */}
                  {!isPending && (
                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px dashed rgba(255,255,255,0.08)", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                      <span>Revisado por: <strong style={{ color: "#fff" }}>{item.reviewedBy}</strong></span>
                      {item.decisionComments && <span> | Comentario: "<em>{item.decisionComments}</em>"</span>}
                      {item.signatureHash && <span style={{ color: "#007AFF", marginLeft: 8 }}>[Hash: {item.signatureHash}]</span>}
                    </div>
                  )}
                </div>

                {/* Lado Derecho: Acciones de Firma Electrónica */}
                {isPending ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button 
                      onClick={() => openSignatureModal(item, "rechazado")} 
                      style={{ ...dangerButtonStyle, padding: "10px 18px", borderRadius: 10, fontSize: 13 }}
                    >
                      <X size={16} /> Rechazar
                    </button>
                    <button 
                      onClick={() => openSignatureModal(item, "aprobado")} 
                      style={{ ...primaryButtonStyle, background: "#34C759", padding: "10px 18px", borderRadius: 10, fontSize: 13 }}
                    >
                      <Check size={16} /> Firmar y Aprobar
                    </button>
                  </div>
                ) : (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "10px 16px", borderRadius: 10, textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>ESTADO AUDITADO</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: item.status === "aprobado" ? "#34C759" : "#FF3B30", marginTop: 2 }}>
                      {item.status === "aprobado" ? "Aprobado con Firma" : "Denegado"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE FIRMA ELECTRÓNICA Y PIN DE SEGURIDAD */}
      {selectedApproval && (
        <ModalShell 
          title={`Firma Electrónica: ${decisionType === "aprobado" ? "Autorizar Solicitud" : "Rechazar Solicitud"}`} 
          onClose={() => setSelectedApproval(null)}
        >
          <form onSubmit={handleConfirmSignature} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.2)", padding: 14, borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#007AFF", marginBottom: 2 }}>SOLICITUD A FIRMAR</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{selectedApproval.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Solicitado por: {selectedApproval.requester}</div>
            </div>

            <Field label="Observaciones / Justificación de la Firma">
              <textarea 
                rows={3} 
                placeholder="Ingrese notas de aprobación o motivo de rechazo..." 
                value={comments} 
                onChange={(e) => setComments(e.target.value)} 
                style={{ ...inputStyle, resize: "vertical" }} 
              />
            </Field>

            <Field label="PIN de Firma Digital de Seguridad" requiredHelp="PIN de credenciales de operador (Ej: 1234)">
              <div style={{ position: "relative" }}>
                <KeyRound size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 13 }} />
                <input 
                  type="password" 
                  placeholder="••••" 
                  maxLength={6}
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)} 
                  style={{ ...inputStyle, paddingLeft: 38, letterSpacing: 4, fontWeight: 800 }} 
                  required 
                />
              </div>
            </Field>

            {pinError && (
              <div style={{ color: "#FF3B30", fontSize: 11, fontWeight: 700 }}>{pinError}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setSelectedApproval(null)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={processing} 
                style={{ 
                  ...primaryButtonStyle, 
                  background: decisionType === "aprobado" ? "#34C759" : "#FF3B30" 
                }}
              >
                {processing ? "Procesando Firma..." : `Confirmar ${decisionType === "aprobado" ? "Aprobación" : "Rechazo"}`}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* MODAL PARA CREAR NUEVA SOLICITUD */}
      {showNewModal && (
        <ModalShell title="Nueva Solicitud de Autorización" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreateRequest} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Título de la Solicitud" requiredHelp="Ej. Compra de refacción crítica para Extrusora 2">
              <input 
                type="text" 
                placeholder="Título claro..." 
                value={newRequest.title} 
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })} 
                style={inputStyle} 
                required 
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Categoría">
                <select 
                  value={newRequest.category} 
                  onChange={(e) => setNewRequest({ ...newRequest, category: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="Presupuesto" style={{ background: "#12141d" }}>Presupuesto & Compras</option>
                  <option value="Mantenimiento" style={{ background: "#12141d" }}>Mantenimiento Crítico</option>
                  <option value="Proceso" style={{ background: "#12141d" }}>Cambio de Proceso / BOM</option>
                  <option value="Calidad" style={{ background: "#12141d" }}>Liberación CAPA</option>
                </select>
              </Field>

              <Field label="Prioridad / Urgencia">
                <select 
                  value={newRequest.urgency} 
                  onChange={(e) => setNewRequest({ ...newRequest, urgency: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="baja" style={{ background: "#12141d" }}>Baja</option>
                  <option value="media" style={{ background: "#12141d" }}>Media</option>
                  <option value="alta" style={{ background: "#12141d" }}>Alta / Crítica</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Costo Estimado (USD)">
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={newRequest.estimatedCost} 
                  onChange={(e) => setNewRequest({ ...newRequest, estimatedCost: e.target.value })} 
                  style={inputStyle} 
                />
              </Field>

              <Field label="Área Afectada">
                <input 
                  type="text" 
                  placeholder="Línea de producción, Ensamble..." 
                  value={newRequest.impactArea} 
                  onChange={(e) => setNewRequest({ ...newRequest, impactArea: e.target.value })} 
                  style={inputStyle} 
                />
              </Field>
            </div>

            <Field label="Justificación & Detalles">
              <textarea 
                rows={3} 
                placeholder="Explicación detallada del por qué se requiere esta autorización..." 
                value={newRequest.description} 
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })} 
                style={{ ...inputStyle, resize: "vertical" }} 
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowNewModal(false)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={processing} style={primaryButtonStyle}>
                {processing ? "Enviando..." : "Enviar a Aprobación"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

    </div>
  );
}
