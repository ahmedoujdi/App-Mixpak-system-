import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Download, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  User,
  Filter
} from "lucide-react";
import { 
  primaryButtonStyle, 
  secondaryButtonStyle, 
  ghostButtonStyle, 
  inputStyle, 
  CenteredMessage, 
  EmptyState, 
  ModalShell, 
  Field, 
  logActivity, 
  exportToCsv, 
  inDateRange, 
  DateRangeFilter, 
  SEVERITY_COLORS,
  formatTimestamp
} from "./shared.jsx";

export default function Calidad({ user }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    title: "",
    lotNumber: "",
    severity: "media",
    description: "",
    actionRequired: "",
  });

  // Escuchar registros de calidad en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quality_issues"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIssues(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Crear reporte de Calidad
  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.lotNumber.trim()) {
      alert("Por favor completa el título y el número de lote.");
      return;
    }

    setProcessing(true);
    try {
      await addDoc(collection(db, "quality_issues"), {
        title: formData.title,
        lotNumber: formData.lotNumber,
        severity: formData.severity,
        description: formData.description,
        actionRequired: formData.actionRequired,
        status: "abierto", // "abierto", "en_investigacion", "resuelto"
        reportedBy: user?.email || "Operador",
        createdAt: serverTimestamp(),
      });

      await logActivity(
        user?.email,
        "Calidad",
        "Alta No Conformidad",
        `Reporte '${formData.title}' creado para el Lote ${formData.lotNumber} (Severidad: ${formData.severity})`
      );

      setShowModal(false);
      setFormData({ title: "", lotNumber: "", severity: "media", description: "", actionRequired: "" });
    } catch (err) {
      console.error("Error al registrar incidencia de calidad:", err);
      alert("Error al guardar en la base de datos.");
    } finally {
      setProcessing(false);
    }
  };

  // Cambiar estado de la incidencia (Ej. Marcar como Resuelto)
  const handleUpdateStatus = async (issueId, issueTitle, newStatus) => {
    try {
      const docRef = doc(db, "quality_issues", issueId);
      await updateDoc(docRef, {
        status: newStatus,
        resolvedBy: newStatus === "resuelto" ? user?.email : null,
        resolvedAt: newStatus === "resuelto" ? serverTimestamp() : null,
      });

      await logActivity(
        user?.email,
        "Calidad",
        `Cambio Estado Incidencia`,
        `Reporte '${issueTitle}' actualizado a estado '${newStatus}'`
      );
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    }
  };

  // Filtrado de Datos
  const filteredIssues = issues.filter((item) => {
    const matchesSearch = 
      (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.lotNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reportedBy || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === "todos" || item.severity === filterSeverity;
    const matchesStatus = filterStatus === "todos" || item.status === filterStatus;
    const matchesDate = inDateRange(item.createdAt, fromDate, toDate);

    return matchesSearch && matchesSeverity && matchesStatus && matchesDate;
  });

  // Métricas rápidas
  const totalOpen = issues.filter((i) => i.status !== "resuelto").length;
  const criticalCount = issues.filter((i) => i.status !== "resuelto" && (i.severity === "alta" || i.severity === "critica")).length;

  if (loading) {
    return <CenteredMessage text="Cargando modulo de aseguramiento de calidad..." />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "#fff", letterSpacing: "-0.5px" }}>
            Control de Calidad & CAPA
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Registro de No Conformidades, trazabilidad de lotes y acciones correctivas.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportToCsv("reportes_calidad", filteredIssues)} style={ghostButtonStyle}>
            <Download size={16} /> Exportar CSV
          </button>
          <button onClick={() => setShowModal(true)} style={primaryButtonStyle}>
            <Plus size={16} /> Nueva No Conformidad
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(255, 59, 48, 0.1)", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FF3B30" }}>INCIDENCIAS ABIERTAS</span>
            <AlertOctagon size={18} color="#FF3B30" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 6 }}>{totalOpen}</div>
        </div>

        <div style={{ background: "rgba(255, 149, 0, 0.1)", border: "1px solid rgba(255, 149, 0, 0.2)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FF9500" }}>ALTA / CRÍTICA</span>
            <AlertTriangle size={18} color="#FF9500" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 6 }}>{criticalCount}</div>
        </div>
      </div>

      {/* Toolbar de Filtros */}
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
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 11 }} />
          <input 
            type="text" 
            placeholder="Buscar por título, lote o inspector..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ ...inputStyle, paddingLeft: 36 }} 
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todas las Severidades</option>
            <option value="baja" style={{ background: "#12141d" }}>Baja</option>
            <option value="media" style={{ background: "#12141d" }}>Media</option>
            <option value="alta" style={{ background: "#12141d" }}>Alta</option>
            <option value="critica" style={{ background: "#12141d" }}>Crítica</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Estados</option>
            <option value="abierto" style={{ background: "#12141d" }}>Abierto</option>
            <option value="en_investigacion" style={{ background: "#12141d" }}>En Investigación</option>
            <option value="resuelto" style={{ background: "#12141d" }}>Resuelto</option>
          </select>

          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {/* Grid de Reportes de Calidad */}
      {filteredIssues.length === 0 ? (
        <EmptyState 
          Icon={ShieldCheck} 
          title="Sin Reportes de Calidad" 
          message="No hay incidencias de calidad registradas que coincidan con los filtros." 
          onAdd={() => setShowModal(true)} 
          addLabel="Crear Reporte" 
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16 }}>
          {filteredIssues.map((item) => {
            const sevConfig = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS["media"];
            const isResolved = item.status === "resuelto";

            return (
              <div 
                key={item.id} 
                style={{ 
                  background: "rgba(255,255,255,0.02)", 
                  border: "1px solid rgba(255,255,255,0.06)", 
                  borderRadius: 16, 
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: sevConfig.bg, color: sevConfig.color }}>
                      SEVERIDAD {sevConfig.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isResolved ? "#34C759" : "#FF9500" }}>
                      ● {isResolved ? "RESUELTO" : "EN REVISIÓN"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>{item.title}</h3>
                  
                  <div style={{ fontSize: 12, color: "#007AFF", fontWeight: 700, marginBottom: 12 }}>
                    Lote / Serie: <span style={{ color: "#fff" }}>{item.lotNumber}</span>
                  </div>

                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "0 0 14px", lineHeight: "1.4" }}>
                    {item.description || "Sin descripción de la desviación."}
                  </p>

                  {item.actionRequired && (
                    <div style={{ background: "rgba(0,0,0,0.25)", borderLeft: "3px solid #007AFF", padding: "8px 12px", borderRadius: "0 6px 6px 0", marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#007AFF", marginBottom: 2 }}>ACCIÓN REQUERIDA / CAPA:</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{item.actionRequired}</div>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                    Reportado por: {item.reportedBy?.split("@")[0]}
                  </div>

                  {!isResolved ? (
                    <button 
                      onClick={() => handleUpdateStatus(item.id, item.title, "resuelto")} 
                      style={{ ...ghostButtonStyle, padding: "5px 10px", fontSize: 11, color: "#34C759", borderColor: "rgba(52, 199, 89, 0.3)" }}
                    >
                      <CheckCircle2 size={12} /> Resolver
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, color: "#34C759", fontWeight: 700 }}>Cerrado</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear No Conformidad */}
      {showModal && (
        <ModalShell title="Registrar No Conformidad (CAPA)" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreateIssue} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Título de la Desviación" requiredHelp="Ej. Deformación de empaque, impurezas">
              <input 
                type="text" 
                placeholder="Descripción corta de la falla..." 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                style={inputStyle} 
                required 
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Número de Lote / Orden" required>
                <input 
                  type="text" 
                  placeholder="LOT-2026-99" 
                  value={formData.lotNumber} 
                  onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Nivel de Severidad">
                <select 
                  value={formData.severity} 
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="baja" style={{ background: "#12141d" }}>Baja</option>
                  <option value="media" style={{ background: "#12141d" }}>Media</option>
                  <option value="alta" style={{ background: "#12141d" }}>Alta</option>
                  <option value="critica" style={{ background: "#12141d" }}>Crítica</option>
                </select>
              </Field>
            </div>

            <Field label="Detalles de la Desviación">
              <textarea 
                rows={3} 
                placeholder="Especifique el defecto observado durante la inspección..." 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                style={{ ...inputStyle, resize: "vertical" }} 
              />
            </Field>

            <Field label="Acción Correctiva Sugerida (CAPA)">
              <input 
                type="text" 
                placeholder="Ej. Detención de línea, cuarentena de lote..." 
                value={formData.actionRequired} 
                onChange={(e) => setFormData({ ...formData, actionRequired: e.target.value })} 
                style={inputStyle} 
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowModal(false)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={processing} style={primaryButtonStyle}>
                {processing ? "Guardando..." : "Registrar No Conformidad"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
