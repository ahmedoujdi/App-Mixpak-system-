import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Plus, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  User, 
  ClipboardCheck, 
  Eye, 
  Building2 
} from "lucide-react";
import { 
  primaryButtonStyle, 
  secondaryButtonStyle, 
  ghostButtonStyle, 
  dangerButtonStyle, 
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
} from "../shared.jsx";

export default function Calidad({ user }) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterResult, setFilterResult] = useState("todos"); // "todos" | "aprobado" | "rechazado" | "en_revision"
  const [filterSeverity, setFilterSeverity] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Estados para Modal de Nueva Inspección
  const [showNewModal, setShowNewModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newInspection, setNewInspection] = useState({
    batchNumber: "",
    productName: "",
    line: "Línea 1 - Ensamble",
    sampleSize: 50,
    defectsCount: 0,
    severity: "menor", // "menor" | "mayor" | "critica"
    scrapCost: "",
    notes: "",
    status: "aprobado" // "aprobado" | "rechazado" | "en_revision"
  });

  // Estado para Inspección Seleccionada (Vista Detallada / Liberación CAPA)
  const [selectedItem, setSelectedItem] = useState(null);
  const [capaAction, setCapaAction] = useState("");

  // Carga en tiempo real de Inspecciones de Calidad
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quality_inspections"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInspections(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Registrar Inspección
  const handleCreateInspection = async (e) => {
    e.preventDefault();
    setProcessing(true);

    const defects = Number(newInspection.defectsCount) || 0;
    const sample = Number(newInspection.sampleSize) || 1;
    const defectRate = ((defects / sample) * 100).toFixed(2);
    
    // Auto-determinación de resultado según gravedad/defectos si se requiere
    let autoStatus = newInspection.status;
    if (defects > 0 && newInspection.severity === "critica") {
      autoStatus = "rechazado";
    }

    try {
      await addDoc(collection(db, "quality_inspections"), {
        ...newInspection,
        status: autoStatus,
        sampleSize: sample,
        defectsCount: defects,
        defectRate: parseFloat(defectRate),
        scrapCost: parseFloat(newInspection.scrapCost) || 0,
        inspector: user?.email || "Inspector de Calidad",
        createdAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Calidad",
        "Inspección Registrada",
        `Lote '${newInspection.batchNumber}' de ${newInspection.productName} inspeccionado: ${autoStatus.toUpperCase()} (${defectRate}% Defectos)`
      );

      setShowNewModal(false);
      setNewInspection({
        batchNumber: "",
        productName: "",
        line: "Línea 1 - Ensamble",
        sampleSize: 50,
        defectsCount: 0,
        severity: "menor",
        scrapCost: "",
        notes: "",
        status: "aprobado"
      });
    } catch (err) {
      console.error("Error al registrar inspección de calidad:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Actualizar Plan de Acción CAPA / Liberación
  const handleSaveCAPA = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    setProcessing(true);
    try {
      const docRef = doc(db, "quality_inspections", selectedItem.id);
      await updateDoc(docRef, {
        capaPlan: capaAction,
        capaUpdatedBy: user?.email || "Supervisor Calidad",
        capaUpdatedAt: serverTimestamp(),
        status: "aprobado" // Al resolver el CAPA liberamos el lote
      });

      await logActivity(
        user?.email,
        "Calidad",
        "Resolución CAPA",
        `Plan de Acción Correctiva registrado para Lote '${selectedItem.batchNumber}'. Lote Liberado.`
      );

      setSelectedItem(null);
      setCapaAction("");
    } catch (err) {
      console.error("Error al guardar CAPA:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Filtrado de lista
  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      const matchesStatus = filterResult === "todos" || item.status === filterResult;
      const matchesSeverity = filterSeverity === "todos" || item.severity === filterSeverity;
      const matchesSearch = 
        (item.batchNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.line || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.inspector || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = inDateRange(item.createdAt, fromDate, toDate);

      return matchesStatus && matchesSeverity && matchesSearch && matchesDate;
    });
  }, [inspections, filterResult, filterSeverity, searchTerm, fromDate, toDate]);

  // KPIs de Calidad
  const metrics = useMemo(() => {
    const total = inspections.length;
    const approved = inspections.filter((i) => i.status === "aprobado").length;
    const rejected = inspections.filter((i) => i.status === "rechazado").length;
    const pendingReview = inspections.filter((i) => i.status === "en_revision").length;
    
    const yieldRate = total > 0 ? ((approved / total) * 100).toFixed(1) : "100.0";
    const totalScrap = inspections.reduce((sum, i) => sum + (Number(i.scrapCost) || 0), 0);

    return { total, approved, rejected, pendingReview, yieldRate, totalScrap };
  }, [inspections]);

  if (loading) {
    return <CenteredMessage text="Cargando módulo de Aseguramiento de Calidad Enterprise..." />;
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", paddingBottom: 50 }}>
      
      {/* HEADER PRINCIPAL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ background: "rgba(52,199,89,0.15)", color: "#34C759", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4 }}>
              NORMATIVA ISO 9001:2015 & AQL LEVEL II
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Control & Aseguramiento de Calidad
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Inspección de lotes en línea, gestión de mermas y Acciones Correctivas/Preventivas (CAPA).
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportToCsv("reporte_calidad_iso", filteredInspections)} style={ghostButtonStyle}>
            <Download size={16} /> Exportar ISO Report
          </button>
          <button onClick={() => setShowNewModal(true)} style={primaryButtonStyle}>
            <Plus size={16} /> Nueva Inspección
          </button>
        </div>
      </div>

      {/* STRIP DE KPIS ENTERPRISE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(52, 199, 89, 0.08)", border: "1px solid rgba(52, 199, 89, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#34C759" }}>YIELD DE CALIDAD</span>
            <TrendingUp size={18} color="#34C759" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.yieldRate}%</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Lotes Conformidad ISO</div>
        </div>

        <div style={{ background: "rgba(255, 59, 48, 0.08)", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF3B30" }}>NO CONFORMIDADES</span>
            <AlertTriangle size={18} color="#FF3B30" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.rejected}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Lotes Rechazados / Bloqueados</div>
        </div>

        <div style={{ background: "rgba(255, 149, 0, 0.08)", border: "1px solid rgba(255, 149, 0, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF9500" }}>COSTO DE SCRAP / MERMA</span>
            <DollarSign size={18} color="#FF9500" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>${metrics.totalScrap.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Impacto Financiero Acumulado</div>
        </div>

        <div style={{ background: "rgba(0, 122, 255, 0.08)", border: "1px solid rgba(0, 122, 255, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#007AFF" }}>REVISIONES PENDIENTES</span>
            <ClipboardCheck size={18} color="#007AFF" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.pendingReview}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>En Espera de Dictamen CAPA</div>
        </div>
      </div>

      {/* FILTROS AVANZADOS */}
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
            placeholder="Buscar por lote, producto, línea o inspector..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ ...inputStyle, paddingLeft: 38 }} 
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Dictámenes</option>
            <option value="aprobado" style={{ background: "#12141d" }}>Conforme (Aprobado)</option>
            <option value="rechazado" style={{ background: "#12141d" }}>No Conforme (Rechazado)</option>
            <option value="en_revision" style={{ background: "#12141d" }}>En Revisión CAPA</option>
          </select>

          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todas las Gravedades</option>
            <option value="menor" style={{ background: "#12141d" }}>Menor / Cosmética</option>
            <option value="mayor" style={{ background: "#12141d" }}>Mayor / Funcional</option>
            <option value="critica" style={{ background: "#12141d" }}>Crítica / Seguridad</option>
          </select>

          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {/* TABLA ENTERPRISE DE INSPECCIONES */}
      {filteredInspections.length === 0 ? (
        <EmptyState 
          Icon={ShieldCheck} 
          title="Sin Registros de Calidad" 
          message="No se encontraron inspecciones registradas bajo los parámetros de búsqueda especificados." 
        />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, color: "#fff" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                <th style={{ padding: "14px 16px" }}>Lote & Producto</th>
                <th style={{ padding: "14px 16px" }}>Línea de Proceso</th>
                <th style={{ padding: "14px 16px" }}>Muestra / Defectos</th>
                <th style={{ padding: "14px 16px" }}>% Tasa Defecto</th>
                <th style={{ padding: "14px 16px" }}>Gravedad</th>
                <th style={{ padding: "14px 16px" }}>Scrap ($)</th>
                <th style={{ padding: "14px 16px" }}>Dictamen</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((item) => {
                const isRejected = item.status === "rechazado";
                const isApproved = item.status === "aprobado";

                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, color: "#fff" }}>{item.batchNumber}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{item.productName}</div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.8)" }}>
                      {item.line}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span>{item.sampleSize} piezas</span>
                      <span style={{ fontSize: 11, color: item.defectsCount > 0 ? "#FF3B30" : "#34C759", marginLeft: 6 }}>
                        ({item.defectsCount} fallos)
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: item.defectRate > 2 ? "#FF3B30" : "#34C759" }}>
                      {item.defectRate || 0}%
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span 
                        style={{ 
                          fontSize: 10, 
                          fontWeight: 800, 
                          textTransform: "uppercase",
                          padding: "2px 8px", 
                          borderRadius: 4,
                          background: item.severity === "critica" ? "rgba(255,59,48,0.15)" : item.severity === "mayor" ? "rgba(255,149,0,0.15)" : "rgba(255,255,255,0.08)",
                          color: item.severity === "critica" ? "#FF3B30" : item.severity === "mayor" ? "#FF9500" : "rgba(255,255,255,0.7)"
                        }}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: item.scrapCost > 0 ? "#FF9500" : "rgba(255,255,255,0.4)" }}>
                      ${Number(item.scrapCost || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge statusKey={item.status} />
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button 
                        onClick={() => setSelectedItem(item)} 
                        style={{ ...ghostButtonStyle, padding: "6px 10px", fontSize: 12 }}
                      >
                        <Eye size={14} /> Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL REGISTRO DE INSPECCIÓN */}
      {showNewModal && (
        <ModalShell title="Registrar Nueva Inspección de Calidad" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreateInspection} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Número de Lote / Batch">
                <input 
                  type="text" 
                  placeholder="Ej. LOT-2026-X89" 
                  value={newInspection.batchNumber} 
                  onChange={(e) => setNewInspection({ ...newInspection, batchNumber: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Nombre del Producto">
                <input 
                  type="text" 
                  placeholder="Ej. Componente Plástico ABS" 
                  value={newInspection.productName} 
                  onChange={(e) => setNewInspection({ ...newInspection, productName: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Línea de Producción">
                <select 
                  value={newInspection.line} 
                  onChange={(e) => setNewInspection({ ...newInspection, line: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="Línea 1 - Ensamble" style={{ background: "#12141d" }}>Línea 1 - Ensamble</option>
                  <option value="Línea 2 - Inyección" style={{ background: "#12141d" }}>Línea 2 - Inyección</option>
                  <option value="Línea 3 - Empaque" style={{ background: "#12141d" }}>Línea 3 - Empaque</option>
                  <option value="Línea 4 - Mecanizado" style={{ background: "#12141d" }}>Línea 4 - Mecanizado</option>
                </select>
              </Field>

              <Field label="Dictamen Inicial">
                <select 
                  value={newInspection.status} 
                  onChange={(e) => setNewInspection({ ...newInspection, status: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="aprobado" style={{ background: "#12141d" }}>Conforme / Aprobado</option>
                  <option value="rechazado" style={{ background: "#12141d" }}>No Conforme / Rechazado</option>
                  <option value="en_revision" style={{ background: "#12141d" }}>En Retención CAPA</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Tamaño Muestra">
                <input 
                  type="number" 
                  value={newInspection.sampleSize} 
                  onChange={(e) => setNewInspection({ ...newInspection, sampleSize: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Piezas Defectuosas">
                <input 
                  type="number" 
                  value={newInspection.defectsCount} 
                  onChange={(e) => setNewInspection({ ...newInspection, defectsCount: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Gravedad del Defecto">
                <select 
                  value={newInspection.severity} 
                  onChange={(e) => setNewInspection({ ...newInspection, severity: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="menor" style={{ background: "#12141d" }}>Menor</option>
                  <option value="mayor" style={{ background: "#12141d" }}>Mayor</option>
                  <option value="critica" style={{ background: "#12141d" }}>Crítica</option>
                </select>
              </Field>
            </div>

            <Field label="Costo Estimado de Merma / Scrap (USD)">
              <input 
                type="number" 
                placeholder="0.00" 
                value={newInspection.scrapCost} 
                onChange={(e) => setNewInspection({ ...newInspection, scrapCost: e.target.value })} 
                style={inputStyle} 
              />
            </Field>

            <Field label="Observaciones Técnicas de Inspección">
              <textarea 
                rows={3} 
                placeholder="Detalles sobre fisuras, desviaciones dimensionales, tolerancias..." 
                value={newInspection.notes} 
                onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })} 
                style={{ ...inputStyle, resize: "vertical" }} 
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowNewModal(false)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={processing} style={primaryButtonStyle}>
                {processing ? "Guardando..." : "Guardar Inspección"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* MODAL DETALLE & PLAN CAPA */}
      {selectedItem && (
        <ModalShell title={`Auditoría de Lote: ${selectedItem.batchNumber}`} onClose={() => setSelectedItem(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{selectedItem.productName}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Inspector: {selectedItem.inspector}</div>
                </div>
                <StatusBadge statusKey={selectedItem.status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 10 }}>
                <div>Muestra: <strong>{selectedItem.sampleSize} pzs</strong></div>
                <div>Defectos: <strong style={{ color: "#FF3B30" }}>{selectedItem.defectsCount} pzs</strong></div>
                <div>Tasa Defecto: <strong>{selectedItem.defectRate}%</strong></div>
              </div>
            </div>

            {selectedItem.notes && (
              <Field label="Notas del Inspector">
                <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                  {selectedItem.notes}
                </div>
              </Field>
            )}

            {/* SECCIÓN CAPA / PLAN ACCIÓN CORRECTIVA */}
            <form onSubmit={handleSaveCAPA} style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
              <Field label="Plan de Acción Correctiva (CAPA)" requiredHelp="Requerido para liberar lotes en retención o corregir fallas">
                <textarea 
                  rows={3} 
                  placeholder="Describa la acción correctiva ejecutada en la línea..." 
                  value={capaAction || selectedItem.capaPlan || ""} 
                  onChange={(e) => setCapaAction(e.target.value)} 
                  style={{ ...inputStyle, resize: "vertical" }} 
                />
              </Field>

              {selectedItem.capaUpdatedBy && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  Última actualización CAPA por: {selectedItem.capaUpdatedBy}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setSelectedItem(null)} style={secondaryButtonStyle}>
                  Cerrar
                </button>
                <button type="submit" disabled={processing || !capaAction} style={primaryButtonStyle}>
                  {processing ? "Guardando..." : "Resolver CAPA & Liberar Lote"}
                </button>
              </div>
            </form>
          </div>
        </ModalShell>
      )}

    </div>
  );
}
