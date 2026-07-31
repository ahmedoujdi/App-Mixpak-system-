import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import { 
  Wrench, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search, 
  Download, 
  User, 
  Cpu, 
  FileText 
} from "lucide-react";
import { 
  inputStyle, 
  primaryButtonStyle, 
  ghostButtonStyle, 
  exportToCsv, 
  logActivity, 
  DateRangeFilter, 
  inDateRange, 
  CenteredMessage, 
  Field, 
  ModalShell, 
  EmptyState 
} from "../shared.jsx";

const MAINTENANCE_TYPES = [
  { value: "preventivo", label: "Preventivo" },
  { value: "correctivo", label: "Correctivo" },
  { value: "predictivo", label: "Predictivo" },
];

const PRIORITIES = [
  { value: "baja", label: "Baja", color: "#8E8E93" },
  { value: "media", label: "Media", color: "#007AFF" },
  { value: "alta", label: "Alta", color: "#FF9500" },
  { value: "urgente", label: "Urgente", color: "#FF3B30" },
];

const STATUS_MAP = {
  pendiente: { label: "Pendiente", color: "#FF9500", bg: "rgba(255, 149, 0, 0.15)", icon: Clock },
  en_proceso: { label: "En Proceso", color: "#007AFF", bg: "rgba(0, 122, 255, 0.15)", icon: Wrench },
  completado: { label: "Completado", color: "#34C759", bg: "rgba(52, 199, 89, 0.15)", icon: CheckCircle2 },
};

const emptyForm = {
  equipment: "",
  type: "preventivo",
  priority: "media",
  assignedTo: "",
  scheduledDate: "",
  description: "",
  spareParts: "",
};

export default function Mantenimiento({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const q = query(collection(db, "maintenance_orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== "todos" && o.status !== filterStatus) return false;
      if (!inDateRange(o.createdAt, dateFrom, dateTo)) return false;

      const term = search.toLowerCase();
      return `${o.equipment || ""} ${o.description || ""} ${o.assignedTo || ""}`.toLowerCase().includes(term);
    });
  }, [orders, filterStatus, search, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const pendientes = orders.filter((o) => o.status === "pendiente").length;
    const enProceso = orders.filter((o) => o.status === "en_proceso").length;
    const completados = orders.filter((o) => o.status === "completado").length;
    const urgentes = orders.filter((o) => o.priority === "urgente" && o.status !== "completado").length;
    return { pendientes, enProceso, completados, urgentes };
  }, [orders]);

  const handleUpdateStatus = async (order, newStatus) => {
    try {
      let downtimeHours = order.downtimeHours || 0;
      if (newStatus === "completado") {
        const inputDowntime = prompt("Ingresa el tiempo de paro de máquina (horas):", "0");
        downtimeHours = parseFloat(inputDowntime) || 0;
      }

      await updateDoc(doc(db, "maintenance_orders", order.id), {
        status: newStatus,
        downtimeHours,
        updatedAt: serverTimestamp(),
      });

      logActivity(user.email, "Mantenimiento", `Cambio de Estado (${newStatus})`, `Equipo: ${order.equipment}`);
    } catch (err) {
      alert("Error al actualizar la orden de trabajo.");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(255, 149, 0, 0.15)", color: "#FF9500", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            EQUIPMENT & ASSETS
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Órdenes de Mantenimiento</h1>
        </div>
        <button onClick={() => { setEditingOrder(null); setModalOpen(true); }} style={{ ...primaryButtonStyle, borderRadius: 10, padding: "10px 18px", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
          <Plus size={18} /> Nueva Orden de Trabajo (OT)
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Pendientes" value={stats.pendientes} icon={Clock} accentColor="#FF9500" />
        <KpiCard label="En Intervención" value={stats.enProceso} icon={Wrench} accentColor="#007AFF" />
        <KpiCard label="Completados" value={stats.completados} icon={CheckCircle2} accentColor="#34C759" />
        <KpiCard label="Urgentes Abiertos" value={stats.urgentes} icon={AlertTriangle} accentColor="#FF3B30" badge={stats.urgentes > 0 ? "Atención" : null} />
      </div>

      {/* Toolbar y Filtros */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar equipo, técnico, descripción..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip active={filterStatus === "todos"} onClick={() => setFilterStatus("todos")}>Todos</Chip>
          <Chip active={filterStatus === "pendiente"} onClick={() => setFilterStatus("pendiente")}>Pendientes</Chip>
          <Chip active={filterStatus === "en_proceso"} onClick={() => setFilterStatus("en_proceso")}>En Proceso</Chip>
          <Chip active={filterStatus === "completado"} onClick={() => setFilterStatus("completado")}>Completados</Chip>
        </div>

        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button onClick={() => exportToCsv("ordenes-mantenimiento", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Listado de Tarjetas de Mantenimiento */}
      {loading ? (
        <CenteredMessage text="Cargando órdenes de mantenimiento..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Wrench} title="Sin órdenes de mantenimiento" message="No se han registrado tareas de mantenimiento preventivo o correctivo." onAdd={() => setModalOpen(true)} addLabel="Nueva Orden" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 18 }}>
          {filtered.map((o) => {
            const st = STATUS_MAP[o.status] || STATUS_MAP.pendiente;
            const IconComp = st.icon;
            const prio = PRIORITIES.find((p) => p.value === o.priority) || PRIORITIES[1];

            return (
              <div key={o.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <IconComp size={13} /> {st.label.toUpperCase()}
                    </span>
                    <span style={{ border: `1px solid ${prio.color}`, color: prio.color, fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                      PRIORIDAD {prio.label.toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                    <Cpu size={18} color="#007AFF" /> {o.equipment}
                  </h3>

                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12, display: "flex", gap: 12 }}>
                    <span>Tipo: <strong style={{ color: "#fff" }}>{o.type}</strong></span>
                    {o.scheduledDate && <span>Fecha: <strong style={{ color: "#fff" }}>{o.scheduledDate}</strong></span>}
                  </div>

                  <p style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "0 0 12px" }}>
                    {o.description}
                  </p>

                  {o.spareParts && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
                      Repuestos: <span style={{ color: "rgba(255,255,255,0.8)" }}>{o.spareParts}</span>
                    </div>
                  )}
                </div>

                {/* Acciones e Info de Asignación */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <User size={12} /> Téc: {o.assignedTo || "Sin Asignar"}
                    </span>
                    {o.downtimeHours > 0 && (
                      <span style={{ color: "#FF9500", fontWeight: 700 }}>
                        Paro: {o.downtimeHours} hrs
                      </span>
                    )}
                  </div>

                  {/* Botones de Cambio de Estado */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {o.status === "pendiente" && (
                      <button onClick={() => handleUpdateStatus(o, "en_proceso")} style={{ ...primaryButtonStyle, flex: 1, background: "#007AFF", borderRadius: 8, padding: "6px" }}>
                        Iniciar Trabajo
                      </button>
                    )}
                    {o.status === "en_proceso" && (
                      <button onClick={() => handleUpdateStatus(o, "completado")} style={{ ...primaryButtonStyle, flex: 1, background: "#34C759", borderRadius: 8, padding: "6px" }}>
                        Marcar Completado
                      </button>
                    )}
                    {o.status === "completado" && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: "100%", textAlign: "center" }}>
                        Finalizado por {o.assignedTo || "Técnico"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear OT */}
      {modalOpen && <MaintenanceFormModal user={user} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accentColor, badge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</span>
        <div style={{ background: `${accentColor}20`, color: accentColor, padding: 6, borderRadius: 8 }}>
          <Icon size={18} />
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#fff" }}>{value}</div>
      {badge && <span style={{ position: "absolute", top: 14, right: 14, background: accentColor, color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{badge}</span>}
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

function MaintenanceFormModal({ user, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment || !form.description) return alert("Por favor completa los campos obligatorios.");

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        status: "pendiente",
        downtimeHours: 0,
        createdBy: user.email,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "maintenance_orders"), payload);
      logActivity(user.email, "Mantenimiento", "Nueva OT Creada", `Equipo: ${form.equipment}`);
      onClose();
    } catch (err) {
      alert("Error al crear la orden de mantenimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Nueva Orden de Trabajo de Mantenimiento" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Equipo / Maquinaria">
          <input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="Ej: Prensa Hidráulica #2" style={inputStyle} required />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Tipo de Mantenimiento">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Prioridad">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Técnico Asignado">
            <input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder="Nombre o Correo" style={inputStyle} />
          </Field>
          <Field label="Fecha Programada">
            <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} style={inputStyle} />
          </Field>
        </div>

        <Field label="Descripción de la Tarea o Falla">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalla el problema detectado o las tareas de rutina..." style={{ ...inputStyle, minHeight: 70 }} required />
        </Field>

        <Field label="Repuestos o Insumos Requeridos (Opcional)">
          <input value={form.spareParts} onChange={(e) => setForm({ ...form, spareParts: e.target.value })} placeholder="Ej: Aceite ISO VG 68, Filtro de Aire 10nm" style={inputStyle} />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Cancelar</button>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? "Guardando..." : "Crear Orden de Trabajo"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
