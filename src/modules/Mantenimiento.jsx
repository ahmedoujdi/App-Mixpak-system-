import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  COLORS,
  ModalShell,
  Field,
  inputStyle,
  selectStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  useToast,
  logActivity,
  EmptyState,
  CenteredMessage,
  exportToPdf,
  exportToCsv,
  shareText,
  DateRangeFilter,
  inDateRange,
  ConfirmDialog
} from "../shared.jsx";
import SignaturePad from "../components/SignaturePad.jsx";
import { Wrench, Plus, FileText, Download, Share2, Trash2, Edit, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function Mantenimiento() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const { addToast } = useToast();

  // Filtros
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Estado del formulario
  const [formData, setFormData] = useState({
    id: null,
    equipment: "",
    type: "Preventivo",
    status: "Pendiente",
    technician: "",
    description: "",
    repairTimeHours: "",
    signature: null,
  });

  useEffect(() => {
    const q = query(collection(db, "maintenance_logs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando mantenimientos:", error);
      addToast("Error al cargar los datos", "error");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchStatus = filterStatus ? log.status === filterStatus : true;
    const matchDate = inDateRange(log.timestamp, dateFrom, dateTo);
    return matchStatus && matchDate;
  });

  const openModal = (log = null) => {
    if (log) {
      setFormData({
        id: log.id,
        equipment: log.equipment || "",
        type: log.type || "Preventivo",
        status: log.status || "Pendiente",
        technician: log.technician || "",
        description: log.description || "",
        repairTimeHours: log.repairTimeHours || "",
        signature: log.signature || null,
      });
    } else {
      setFormData({
        id: null,
        equipment: "",
        type: "Preventivo",
        status: "Pendiente",
        technician: "",
        description: "",
        repairTimeHours: "",
        signature: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.equipment || !formData.technician) {
      addToast("Equipo y Técnico son obligatorios", "error");
      return;
    }

    try {
      const payload = {
        equipment: formData.equipment,
        type: formData.type,
        status: formData.status,
        technician: formData.technician,
        description: formData.description,
        repairTimeHours: Number(formData.repairTimeHours) || 0,
        signature: formData.signature,
      };

      if (formData.id) {
        await updateDoc(doc(db, "maintenance_logs", formData.id), payload);
        logActivity(formData.technician, "Mantenimiento", "Actualizó orden", `Equipo: ${formData.equipment}`);
        addToast("Orden actualizada con éxito", "success");
      } else {
        payload.timestamp = serverTimestamp();
        await addDoc(collection(db, "maintenance_logs"), payload);
        logActivity(formData.technician, "Mantenimiento", "Creó orden", `Equipo: ${formData.equipment}`);
        addToast("Orden creada con éxito", "success");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando:", error);
      addToast("Error al guardar la orden", "error");
    }
  };

  const handleDelete = async () => {
    if (!logToDelete) return;
    try {
      await deleteDoc(doc(db, "maintenance_logs", logToDelete.id));
      logActivity("Sistema", "Mantenimiento", "Eliminó orden", `ID: ${logToDelete.id}`);
      addToast("Orden eliminada", "success");
    } catch (error) {
      addToast("Error al eliminar", "error");
    }
    setLogToDelete(null);
  };

  const exportPDF = () => {
    const headers = ["Fecha", "Equipo", "Tipo", "Estado", "Técnico", "Horas"];
    const rows = filteredLogs.map(l => [
      l.timestamp?.toDate ? l.timestamp.toDate().toLocaleDateString() : "-",
      l.equipment,
      l.type,
      l.status,
      l.technician,
      l.repairTimeHours || "0"
    ]);
    exportToPdf("Reporte de Órdenes de Mantenimiento", headers, rows, "mantenimiento");
  };

  const getStatusColor = (status) => {
    if (status === "Completado") return COLORS.green;
    if (status === "En Proceso") return COLORS.safety;
    return COLORS.steel;
  };

  const getStatusIcon = (status) => {
    if (status === "Completado") return <CheckCircle2 size={16} color={COLORS.green} />;
    if (status === "En Proceso") return <Clock size={16} color={COLORS.safety} />;
    return <AlertCircle size={16} color={COLORS.steel} />;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* CABECERA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: COLORS.panel, padding: "16px 20px", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: COLORS.text, display: "flex", alignItems: "center", gap: 8 }}>
            <Wrench size={20} color={COLORS.steel} /> ÓRDENES DE TRABAJO
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>Gestión de reparaciones y mantenimientos</p>
        </div>
        <button onClick={() => openModal()} style={primaryButtonStyle}>
          <Plus size={16} /> Nueva Orden
        </button>
      </div>

      {/* FILTROS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, background: COLORS.panel, padding: 16, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: "auto", minWidth: 150 }}>
          <option value="">Todos los Estados</option>
          <option value="Pendiente">Pendientes</option>
          <option value="En Proceso">En Proceso</option>
          <option value="Completado">Completados</option>
        </select>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <div style={{ flex: 1 }} />
        <button onClick={() => exportToCsv("mantenimientos", filteredLogs)} style={ghostButtonStyle}><Download size={14} /> CSV</button>
        <button onClick={exportPDF} style={ghostButtonStyle}><FileText size={14} /> PDF</button>
      </div>

      {/* LISTA DE TARJETAS (DISEÑO INDUSTRIAL) */}
      {loading ? (
        <CenteredMessage text="Cargando órdenes de trabajo..." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState Icon={Wrench} title="No hay registros" message="No se encontraron órdenes de mantenimiento con estos filtros." onAdd={() => openModal()} addLabel="Crear Primera Orden" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filteredLogs.map(log => (
            <div key={log.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Header Tarjeta */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0e12" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: getStatusColor(log.status) }}>
                  {getStatusIcon(log.status)}
                  {log.status.toUpperCase()}
                </div>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                  {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : ""}
                </span>
              </div>
              
              {/* Cuerpo Tarjeta */}
              <div style={{ padding: 16, flex: 1 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700, color: COLORS.text }}>{log.equipment}</h3>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4, color: COLORS.textMuted }}>{log.type}</span>
                  <span style={{ fontSize: 11, padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4, color: COLORS.textMuted }}>{log.repairTimeHours || 0} hrs</span>
                </div>
                <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 12px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {log.description || "Sin descripción detallada."}
                </p>
                <div style={{ fontSize: 12, color: COLORS.steel }}>Técnico: <span style={{ color: COLORS.text }}>{log.technician}</span></div>
              </div>

              {/* Acciones Tarjeta */}
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8, background: "rgba(0,0,0,0.2)" }}>
                <button onClick={() => openModal(log)} style={{ ...ghostButtonStyle, flex: 1, justifyContent: "center" }}><Edit size={14} /> Editar</button>
                <button onClick={() => shareText(`Orden: ${log.equipment}`, `Estado: ${log.status}\nTécnico: ${log.technician}`, window.location.href)} style={ghostButtonStyle}><Share2 size={14} /></button>
                <button onClick={() => setLogToDelete(log)} style={{ ...ghostButtonStyle, color: COLORS.critical, borderColor: "transparent" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL FORMULARIO */}
      {isModalOpen && (
        <ModalShell title={formData.id ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"} onClose={() => setIsModalOpen(false)}>
          <Field label="Nombre del Equipo / Máquina *">
            <input type="text" value={formData.equipment} onChange={e => setFormData({...formData, equipment: e.target.value})} style={inputStyle} placeholder="Ej. Torno CNC 1" />
          </Field>
          
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Tipo de Mantenimiento">
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={selectStyle}>
                  <option value="Preventivo">Preventivo</option>
                  <option value="Correctivo">Correctivo</option>
                  <option value="Predictivo">Predictivo</option>
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Estado Operativo">
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={selectStyle}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Completado">Completado</option>
                </select>
              </Field>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 2 }}>
              <Field label="Técnico Responsable *">
                <input type="text" value={formData.technician} onChange={e => setFormData({...formData, technician: e.target.value})} style={inputStyle} placeholder="Nombre del técnico" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Tiempo (Horas)">
                <input type="number" value={formData.repairTimeHours} onChange={e => setFormData({...formData, repairTimeHours: e.target.value})} style={inputStyle} placeholder="Ej. 2.5" step="0.1" />
              </Field>
            </div>
          </div>

          <Field label="Descripción del Trabajo / Falla">
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Detalles de la reparación..." />
          </Field>

          {/* FIRMA DIGITAL (Solo si está completado o en proceso para validar) */}
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            {formData.signature ? (
              <div style={{ background: "#080c10", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: COLORS.green, fontWeight: 700, display: "block", marginBottom: 8 }}>✓ FIRMA REGISTRADA</span>
                <img src={formData.signature} alt="Firma" style={{ height: 60, filter: "invert(1)" }} />
                <button onClick={() => setFormData({...formData, signature: null})} style={{ ...ghostButtonStyle, marginTop: 8, fontSize: 11, color: COLORS.critical }}>Eliminar Firma</button>
              </div>
            ) : (
              <SignaturePad onSave={(sig) => setFormData({...formData, signature: sig})} />
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
            <button onClick={() => setIsModalOpen(false)} style={{ ...ghostButtonStyle, flex: 1 }}>Cancelar</button>
            <button onClick={handleSave} style={{ ...primaryButtonStyle, flex: 1, justifyContent: "center" }}>Guardar Orden</button>
          </div>
        </ModalShell>
      )}

      {/* DIÁLOGO DE CONFIRMACIÓN */}
      {logToDelete && (
        <ConfirmDialog 
          title="Eliminar Orden" 
          message={`¿Estás seguro de eliminar el registro de ${logToDelete.equipment}?`} 
          onConfirm={handleDelete} 
          onCancel={() => setLogToDelete(null)} 
        />
      )}
    </div>
  );
}
