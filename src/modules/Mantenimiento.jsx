import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  Wrench, 
  Search, 
  Plus, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Settings, 
  ShieldAlert, 
  Calendar, 
  DollarSign, 
  Play, 
  CheckSquare, 
  User,
  Activity
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
  StatusBadge, 
  formatTimestamp 
} from "./shared.jsx";

export default function Mantenimiento({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("todos"); // "todos" | "Preventivo" | "Correctivo" | "Prediccion"
  const [filterStatus, setFilterStatus] = useState("todos"); // "todos" | "Pendiente" | "En Proceso" | "Completado"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modales
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Formulario de Nueva Orden de Trabajo (OT)
  const [newOrder, setNewOrder] = useState({
    code: "",
    machine: "Línea A - Extrusora Principal",
    type: "Preventivo", // "Preventivo" | "Correctivo"
    priority: "Media", // "Baja" | "Media" | "Alta" | "Crítica"
    assignedTo: "",
    description: "",
    estimatedCost: "",
    scheduledDate: new Date().toISOString().split("T")[0]
  });

  // Carga en tiempo real desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "maintenance_orders"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Crear Orden de Trabajo (OT)
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const otCode = newOrder.code || `OT-${Math.floor(1000 + Math.random() * 9000)}`;

      await addDoc(collection(db, "maintenance_orders"), {
        ...newOrder,
        code: otCode,
        status: "Pendiente",
        estimatedCost: parseFloat(newOrder.estimatedCost) || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Mantenimiento",
        "Alta de Orden de Trabajo",
        `OT '${otCode}' generada para la máquina '${newOrder.machine}' [Tipo: ${newOrder.type}, Prioridad: ${newOrder.priority}].`
      );

      setShowNewModal(false);
      setNewOrder({
        code: "",
        machine: "Línea A - Extrusora Principal",
        type: "Preventivo",
        priority: "Media",
        assignedTo: "",
        description: "",
        estimatedCost: "",
        scheduledDate: new Date().toISOString().split("T")[0]
      });
    } catch (err) {
      console.error("Error al crear OT:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Cambiar Estado de Orden de Trabajo
  const handleUpdateStatus = async (orderId, newStatus) => {
    setProcessing(true);
    try {
      const docRef = doc(db, "maintenance_orders", orderId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Mantenimiento",
        `Cambio de Estado OT`,
        `La Orden de Trabajo '${selectedOrder?.code || orderId}' cambió a estado: ${newStatus.toUpperCase()}`
      );

      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err) {
      console.error("Error al actualizar OT:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Filtrado de Órdenes
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesType = filterType === "todos" || order.type === filterType;
      const matchesStatus = filterStatus === "todos" || order.status === filterStatus;

      const matchesSearch = 
        (order.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.machine || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.assignedTo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = inDateRange(order.createdAt, fromDate, toDate);

      return matchesType && matchesStatus && matchesSearch && matchesDate;
    });
  }, [orders, filterType, filterStatus, searchTerm, fromDate, toDate]);

  // KPIs de Operatividad y Mantenimiento
  const metrics = useMemo(() => {
    const totalOTs = orders.length;
    const pendingOTs = orders.filter((o) => o.status === "Pendiente" || o.status === "En Proceso").length;
    const criticalOTs = orders.filter((o) => o.priority === "Crítica" || o.priority === "Alta").length;
    
    let totalCost = 0;
    orders.forEach((o) => {
      totalCost += Number(o.estimatedCost) || 0;
    });

    return { totalOTs, pendingOTs, criticalOTs, totalCost };
  }, [orders]);

  if (loading) {
    return <CenteredMessage text="Accediendo al Gestor SCADA de Mantenimiento & Activos..." />;
  }

  return (
    <div style={{ maxWidth: 1350, margin: "0 auto", paddingBottom: 50 }}>
      
      {/* HEADER DE MÓDULO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ background: "rgba(255,45,85,0.15)", color: "#FF2D55", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4 }}>
              GESTIÓN DE ACTIVOS & ORDENES DE TRABAJO (OT)
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Mantenimiento Preventivo & Correctivo
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Control de paradas de planta, órdenes de reparación, programación técnica y disponibilidad de activos.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportToCsv("mantenimiento_activos_enterprise", filteredOrders)} style={ghostButtonStyle}>
            <Download size={16} /> Exportar OT CSV
          </button>
          <button onClick={() => setShowNewModal(true)} style={primaryButtonStyle}>
            <Plus size={16} /> Nueva Orden de Trabajo
          </button>
        </div>
      </div>

      {/* STRIP DE KPIS ENTERPRISE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(0, 122, 255, 0.08)", border: "1px solid rgba(0, 122, 255, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#007AFF" }}>ORDENES REGISTRADAS</span>
            <Wrench size={18} color="#007AFF" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.totalOTs}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Total acumulado en sistema</div>
        </div>

        <div style={{ background: "rgba(255, 149, 0, 0.08)", border: "1px solid rgba(255, 149, 0, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF9500" }}>OTs EN CURSO / PENDIENTES</span>
            <Clock size={18} color="#FF9500" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.pendingOTs}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Intervenciones activas</div>
        </div>

        <div style={{ background: "rgba(255, 59, 48, 0.08)", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF3B30" }}>CRÍTICAS / ALTA PRIORIDAD</span>
            <AlertTriangle size={18} color="#FF3B30" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.criticalOTs}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Riesgo de parada prolongada</div>
        </div>

        <div style={{ background: "rgba(52, 199, 89, 0.08)", border: "1px solid rgba(52, 199, 89, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#34C759" }}>PRESUPUESTO ESTIMADO</span>
            <DollarSign size={18} color="#34C759" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>
            ${metrics.totalCost.toLocaleString()} USD
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Costo proyectado de reparaciones</div>
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
            placeholder="Buscar por OT, equipo, técnico asignado o falla..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ ...inputStyle, paddingLeft: 38 }} 
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Tipos</option>
            <option value="Preventivo" style={{ background: "#12141d" }}>Preventivo</option>
            <option value="Correctivo" style={{ background: "#12141d" }}>Correctivo</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Estados</option>
            <option value="Pendiente" style={{ background: "#12141d" }}>Pendiente</option>
            <option value="En Proceso" style={{ background: "#12141d" }}>En Proceso</option>
            <option value="Completado" style={{ background: "#12141d" }}>Completado</option>
          </select>

          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {/* TABLA ENTERPRISE DE MANTENIMIENTO */}
      {filteredOrders.length === 0 ? (
        <EmptyState 
          Icon={Wrench} 
          title="Sin Ordenes de Trabajo" 
          message="No se encontraron registros de mantenimiento bajo los criterios seleccionados." 
        />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, color: "#fff" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                <th style={{ padding: "14px 16px" }}>Código OT</th>
                <th style={{ padding: "14px 16px" }}>Equipo / Máquina</th>
                <th style={{ padding: "14px 16px" }}>Tipo & Prioridad</th>
                <th style={{ padding: "14px 16px" }}>Técnico Responsable</th>
                <th style={{ padding: "14px 16px" }}>Programación</th>
                <th style={{ padding: "14px 16px" }}>Estado</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isCritical = order.priority === "Crítica" || order.priority === "Alta";

                return (
                  <tr key={order.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 800, color: "#007AFF" }}>
                      {order.code}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, color: "#fff" }}>{order.machine}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {order.description || "Sin descripción"}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
                          {order.type}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 4, background: isCritical ? "rgba(255,59,48,0.2)" : "rgba(255,149,0,0.2)", color: isCritical ? "#FF3B30" : "#FF9500" }}>
                          {order.priority}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.8)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <User size={13} color="rgba(255,255,255,0.4)" />
                        {order.assignedTo || "Sin Asignar"}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar size={13} />
                        {order.scheduledDate || "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button 
                        onClick={() => setSelectedOrder(order)} 
                        style={{ ...ghostButtonStyle, padding: "6px 10px", fontSize: 12 }}
                      >
                        Administrar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CREAR OT */}
      {showNewModal && (
        <ModalShell title="Crear Orden de Trabajo (OT) de Mantenimiento" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreateOrder} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <Field label="Código OT (Opcional)">
                <input 
                  type="text" 
                  placeholder="Auto-generado si está vacío" 
                  value={newOrder.code} 
                  onChange={(e) => setNewOrder({ ...newOrder, code: e.target.value })} 
                  style={inputStyle} 
                />
              </Field>

              <Field label="Activo / Maquinaria Afectada">
                <input 
                  type="text" 
                  placeholder="Ej. Línea B - Inyectora N2" 
                  value={newOrder.machine} 
                  onChange={(e) => setNewOrder({ ...newOrder, machine: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Tipo de Mantenimiento">
                <select 
                  value={newOrder.type} 
                  onChange={(e) => setNewOrder({ ...newOrder, type: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="Preventivo" style={{ background: "#12141d" }}>Mantenimiento Preventivo</option>
                  <option value="Correctivo" style={{ background: "#12141d" }}>Mantenimiento Correctivo</option>
                </select>
              </Field>

              <Field label="Nivel de Prioridad">
                <select 
                  value={newOrder.priority} 
                  onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="Baja" style={{ background: "#12141d" }}>Baja (Operativo)</option>
                  <option value="Media" style={{ background: "#12141d" }}>Media (Programada)</option>
                  <option value="Alta" style={{ background: "#12141d" }}>Alta (Riesgo Parada)</option>
                  <option value="Crítica" style={{ background: "#12141d" }}>Crítica (Línea Detenida)</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Técnico Responsable">
                <input 
                  type="text" 
                  placeholder="Ej. Ing. Carlos Mendoza" 
                  value={newOrder.assignedTo} 
                  onChange={(e) => setNewOrder({ ...newOrder, assignedTo: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Fecha Programada">
                <input 
                  type="date" 
                  value={newOrder.scheduledDate} 
                  onChange={(e) => setNewOrder({ ...newOrder, scheduledDate: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Costo Estimado (USD)">
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={newOrder.estimatedCost} 
                  onChange={(e) => setNewOrder({ ...newOrder, estimatedCost: e.target.value })} 
                  style={inputStyle} 
                />
              </Field>
            </div>

            <Field label="Descripción del Trabajo o Falla Detectada">
              <textarea 
                rows={3} 
                placeholder="Detalla las acciones requeridas, repuestos necesarios o código de error SCADA..." 
                value={newOrder.description} 
                onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })} 
                style={{ ...inputStyle, resize: "vertical" }} 
                required 
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowNewModal(false)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={processing} style={primaryButtonStyle}>
                {processing ? "Generando..." : "Emitir Orden de Trabajo"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* MODAL ADMINISTRAR OT */}
      {selectedOrder && (
        <ModalShell title={`Gestión de OT: ${selectedOrder.code}`} onClose={() => setSelectedOrder(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.2)", padding: 14, borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#007AFF" }}>MÁQUINA / ACTIVO</span>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginTop: 2 }}>{selectedOrder.machine}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                Responsable: {selectedOrder.assignedTo || "No asignado"} | Presupuesto: ${Number(selectedOrder.estimatedCost || 0).toLocaleString()} USD
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>DETALLE DE INTERVENCIÓN</div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 12, borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                {selectedOrder.description || "Sin descripción de fallas detallada."}
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Actualizar Estado de la Reparación:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, "Pendiente")} 
                  disabled={processing || selectedOrder.status === "Pendiente"}
                  style={{ ...secondaryButtonStyle, fontSize: 12, justifyContent: "center" }}
                >
                  <Clock size={14} /> Pendiente
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, "En Proceso")} 
                  disabled={processing || selectedOrder.status === "En Proceso"}
                  style={{ ...secondaryButtonStyle, border: "1px solid #FF9500", color: "#FF9500", fontSize: 12, justifyContent: "center" }}
                >
                  <Play size={14} /> En Proceso
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, "Completado")} 
                  disabled={processing || selectedOrder.status === "Completado"}
                  style={{ ...primaryButtonStyle, background: "#34C759", fontSize: 12, justifyContent: "center" }}
                >
                  <CheckSquare size={14} /> Finalizada
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={() => setSelectedOrder(null)} style={secondaryButtonStyle}>
                Cerrar Ventana
              </button>
            </div>
          </div>
        </ModalShell>
      )}

    </div>
  );
}
