import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye 
} from "lucide-react";
import { 
  COLORS, 
  primaryButtonStyle, 
  ghostButtonStyle, 
  inputStyle, 
  ModalShell, 
  Field, 
  StatusBadge 
} from "./shared.jsx";
import ExportButton from "./ExportModule.jsx";

// Datos iniciales de demostración para el módulo
const MOCK_MAINTENANCE_DATA = [
  {
    id: "ot-101",
    workOrder: "OT-2026-001",
    machine: "Envasadora Rotativa A1",
    machineType: "Envasado",
    title: "Reemplazo preventivo de sellos térmicos",
    priority: "alta",
    status: "en_proceso",
    assignedTo: "Carlos Ruiz",
    dueDate: "2026-08-02",
    createdAt: "2026-07-28",
  },
  {
    id: "ot-102",
    workOrder: "OT-2026-002",
    machine: "Mezcladora Industrial M3",
    machineType: "Proceso",
    title: "Calibración de sensor de presión y torque",
    priority: "critica",
    status: "pendiente",
    assignedTo: "Elena Gómez",
    dueDate: "2026-07-31",
    createdAt: "2026-07-29",
  },
  {
    id: "ot-103",
    workOrder: "OT-2026-003",
    machine: "Banda Transportadora BT-04",
    machineType: "Logística",
    title: "Alineación de rodillos y lubricación de rodamientos",
    priority: "baja",
    status: "completado",
    assignedTo: "Marcos Lima",
    dueDate: "2026-07-25",
    createdAt: "2026-07-20",
  },
  {
    id: "ot-104",
    workOrder: "OT-2026-004",
    machine: "Etiquetadora Automática E2",
    machineType: "Empaque",
    title: "Fallo en fotocélula de detección de paso",
    priority: "media",
    status: "en_proceso",
    assignedTo: "Carlos Ruiz",
    dueDate: "2026-08-01",
    createdAt: "2026-07-30",
  },
];

export default function MantenimientoModule({ currentUser, globalSearch = "" }) {
  const [orders, setOrders] = useState(MOCK_MAINTENANCE_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [priorityFilter, setPriorityFilter] = useState("todos");
  
  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOT, setEditingOT] = useState(null);

  // Formulario de edición/creación
  const [formData, setFormData] = useState({
    workOrder: "",
    machine: "",
    machineType: "Envasado",
    title: "",
    priority: "media",
    status: "pendiente",
    assignedTo: "",
    dueDate: "",
  });

  // Búsqueda combinada (global + búsqueda local)
  const effectiveSearch = globalSearch || searchTerm;

  // Filtrado optimizado de alto rendimiento
  const filteredOrders = useMemo(() => {
    return orders.filter((ot) => {
      const matchesSearch =
        ot.workOrder.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        ot.machine.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        ot.title.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        ot.assignedTo.toLowerCase().includes(effectiveSearch.toLowerCase());

      const matchesStatus = statusFilter === "todos" || ot.status === statusFilter;
      const matchesPriority = priorityFilter === "todos" || ot.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [orders, effectiveSearch, statusFilter, priorityFilter]);

  // Cálculos de KPIs para la parte superior de la vista
  const kpis = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pendiente").length;
    const inProgress = orders.filter((o) => o.status === "en_proceso").length;
    const critical = orders.filter((o) => o.priority === "critica" || o.priority === "alta").length;
    return { total, pending, inProgress, critical };
  }, [orders]);

  // Handlers para crear o editar
  const handleOpenModal = (ot = null) => {
    if (ot) {
      setEditingOT(ot);
      setFormData(ot);
    } else {
      setEditingOT(null);
      setFormData({
        workOrder: `OT-2026-00${orders.length + 1}`,
        machine: "",
        machineType: "Envasado",
        title: "",
        priority: "media",
        status: "pendiente",
        assignedTo: currentUser?.name || "Operador",
        dueDate: new Date().toISOString().slice(0, 10),
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingOT) {
      setOrders(orders.map((item) => (item.id === editingOT.id ? { ...formData } : item)));
    } else {
      setOrders([...orders, { ...formData, id: `ot-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Deseas eliminar esta orden de trabajo?")) {
      setOrders(orders.filter((item) => item.id !== id));
    }
  };

  // Mapeo visual de estados
  const getStatusBadge = (status) => {
    switch (status) {
      case "completado":
        return <StatusBadge status="COMPLETADO" type="success" />;
      case "en_proceso":
        return <StatusBadge status="EN PROCESO" type="info" />;
      case "pendiente":
        return <StatusBadge status="PENDIENTE" type="warning" />;
      default:
        return <StatusBadge status={status} type="info" />;
    }
  };

  // Mapeo visual de prioridad
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "critica":
        return <StatusBadge status="CRÍTICA" type="danger" />;
      case "alta":
        return <StatusBadge status="ALTA" type="danger" />;
      case "media":
        return <StatusBadge status="MEDIA" type="warning" />;
      case "baja":
        return <StatusBadge status="BAJA" type="info" />;
      default:
        return <StatusBadge status={priority} type="info" />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* 1. Header con métricas rápidas */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: COLORS.textMain }}>
            Gestión de Mantenimiento
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: COLORS.textMuted }}>
            Control de órdenes de trabajo, mantenimientos preventivos y paradas
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ExportButton
            moduleName="Mantenimiento"
            data={filteredOrders}
            userEmail={currentUser?.email || "operaciones@mixpak.com"}
            search={effectiveSearch}
          />
          <button onClick={() => handleOpenModal()} style={primaryButtonStyle}>
            <Plus size={16} /> Nueva Orden (OT)
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Indicadores (KPIs) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Total OTs Activas</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.textMain, marginTop: "4px" }}>{kpis.total}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>En Proceso</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.primary, marginTop: "4px" }}>{kpis.inProgress}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Pendientes</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.warning, marginTop: "4px" }}>{kpis.pending}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "12px", color: COLORS.textMuted, fontWeight: "600" }}>Prioridad Alta / Crítica</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: COLORS.danger, marginTop: "4px" }}>{kpis.critical}</div>
        </div>
      </div>

      {/* 3. Barra de Controles y Filtros */}
      <div style={{
        backgroundColor: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} />
          <input
            type="text"
            placeholder="Buscar por OT, equipo o técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: "36px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En Proceso</option>
            <option value="completado">Completado</option>
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos">Todas las prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {/* 4. Tabla de Órdenes de Trabajo */}
      <div style={{
        backgroundColor: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <th style={thStyle}>Orden</th>
                <th style={thStyle}>Equipo / Máquina</th>
                <th style={thStyle}>Tarea / Diagnóstico</th>
                <th style={thStyle}>Prioridad</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Asignado</th>
                <th style={thStyle}>Vencimiento</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: COLORS.textMuted }}>
                    No se encontraron órdenes de trabajo que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ot) => (
                  <tr key={ot.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, transition: "background 0.15s ease" }}>
                    <td style={{ ...tdStyle, fontWeight: "700", color: COLORS.primary }}>{ot.workOrder}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: "600" }}>{ot.machine}</div>
                      <div style={{ fontSize: "11px", color: COLORS.textMuted }}>{ot.machineType}</div>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: "240px" }}>{ot.title}</td>
                    <td style={tdStyle}>{getPriorityBadge(ot.priority)}</td>
                    <td style={tdStyle}>{getStatusBadge(ot.status)}</td>
                    <td style={tdStyle}>{ot.assignedTo}</td>
                    <td style={{ ...tdStyle, color: COLORS.textMuted }}>{ot.dueDate}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button onClick={() => handleOpenModal(ot)} style={actionBtnStyle} title="Editar OT">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(ot.id)} style={{ ...actionBtnStyle, color: COLORS.danger }} title="Eliminar OT">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal para Crear / Editar Orden */}
      {isModalOpen && (
        <ModalShell onClose={() => setIsModalOpen(false)} title={editingOT ? `Editar Orden ${editingOT.workOrder}` : "Nueva Orden de Trabajo"}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Field label="Código OT">
                <input type="text" value={formData.workOrder} onChange={(e) => setFormData({ ...formData, workOrder: e.target.value })} style={inputStyle} required />
              </Field>
              <Field label="Categoría de Equipo">
                <select value={formData.machineType} onChange={(e) => setFormData({ ...formData, machineType: e.target.value })} style={inputStyle}>
                  <option value="Envasado">Envasado</option>
                  <option value="Proceso">Proceso</option>
                  <option value="Logística">Logística</option>
                  <option value="Empaque">Empaque</option>
                  <option value="Servicios Generales">Servicios Generales</option>
                </select>
              </Field>
            </div>

            <Field label="Equipo / Maquinaria">
              <input type="text" placeholder="Ej: Envasadora Rotativa A1" value={formData.machine} onChange={(e) => setFormData({ ...formData, machine: e.target.value })} style={inputStyle} required />
            </Field>

            <Field label="Descripción de la Tarea">
              <input type="text" placeholder="Ej: Cambio de rodamientos y calibración" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={inputStyle} required />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Field label="Prioridad">
                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} style={inputStyle}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </Field>

              <Field label="Estado">
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="completado">Completado</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Field label="Asignado a">
                <input type="text" value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} style={inputStyle} required />
              </Field>

              <Field label="Fecha de Vencimiento">
                <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} style={inputStyle} required />
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={ghostButtonStyle}>
                Cancelar
              </button>
              <button type="submit" style={primaryButtonStyle}>
                Guardar Orden
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

// Estilos auxiliares
const kpiCardStyle = {
  backgroundColor: COLORS.cardBg,
  border: `1px solid ${COLORS.cardBorder}`,
  borderRadius: "12px",
  padding: "16px",
};

const thStyle = {
  padding: "12px 16px",
  fontWeight: "600",
  fontSize: "12px",
  color: COLORS.textMuted,
};

const tdStyle = {
  padding: "12px 16px",
  color: COLORS.textMain,
};

const actionBtnStyle = {
  backgroundColor: "transparent",
  border: `1px solid ${COLORS.cardBorder}`,
  borderRadius: "6px",
  color: COLORS.textMuted,
  cursor: "pointer",
  padding: "6px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
