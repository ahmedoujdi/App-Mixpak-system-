import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { 
  Factory, 
  Search, 
  Plus, 
  Download, 
  Play, 
  PauseCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Gauge, 
  TrendingUp, 
  Layers, 
  Clock, 
  CheckSquare, 
  BarChart2, 
  Activity,
  Calendar
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

export default function Produccion({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLine, setFilterLine] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos"); // "todos" | "Pendiente" | "En Proceso" | "Pausada" | "Completado"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modales
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Formulario para Registrar Avance de Producción
  const [advanceQty, setAdvanceQty] = useState("");
  const [scrapQty, setScrapQty] = useState("");

  // Formulario de Nueva Órden de Producción (OP)
  const [newOrder, setNewOrder] = useState({
    code: "",
    productName: "",
    line: "Línea A - Extrusión",
    targetQuantity: "",
    producedQuantity: 0,
    scrapQuantity: 0,
    startDate: new Date().toISOString().split("T")[0],
    operator: "",
    notes: ""
  });

  // Carga en tiempo real de Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "production_orders"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Crear Órden de Producción
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const opCode = newOrder.code || `OP-${Math.floor(1000 + Math.random() * 9000)}`;
      const target = Number(newOrder.targetQuantity) || 0;

      await addDoc(collection(db, "production_orders"), {
        ...newOrder,
        code: opCode,
        targetQuantity: target,
        producedQuantity: 0,
        scrapQuantity: 0,
        status: "Pendiente",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Producción",
        "Lanzamiento de Órden (OP)",
        `Nueva Órden '${opCode}' creada para '${newOrder.productName}' con meta de ${target} unidades.`
      );

      setShowNewModal(false);
      setNewOrder({
        code: "",
        productName: "",
        line: "Línea A - Extrusión",
        targetQuantity: "",
        producedQuantity: 0,
        scrapQuantity: 0,
        startDate: new Date().toISOString().split("T")[0],
        operator: "",
        notes: ""
      });
    } catch (err) {
      console.error("Error al crear la OP:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Registrar Avance de Unidades Producidas y Scrap
  const handleRegisterAdvance = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setProcessing(true);
    try {
      const addProduced = Number(advanceQty) || 0;
      const addScrap = Number(scrapQty) || 0;

      const currentProduced = Number(selectedOrder.producedQuantity) || 0;
      const currentScrap = Number(selectedOrder.scrapQuantity) || 0;
      const target = Number(selectedOrder.targetQuantity) || 0;

      const newProduced = currentProduced + addProduced;
      const newScrap = currentScrap + addScrap;

      // Determinar si automáticamente pasa a completada
      let autoStatus = selectedOrder.status;
      if (newProduced >= target) {
        autoStatus = "Completado";
      } else if (selectedOrder.status === "Pendiente" && addProduced > 0) {
        autoStatus = "En Proceso";
      }

      const docRef = doc(db, "production_orders", selectedOrder.id);
      await updateDoc(docRef, {
        producedQuantity: newProduced,
        scrapQuantity: newScrap,
        status: autoStatus,
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Producción",
        "Reporte de Avance OP",
        `OP '${selectedOrder.code}': +${addProduced} unidades conformes, +${addScrap} scrap.`
      );

      setSelectedOrder(null);
      setAdvanceQty("");
      setScrapQty("");
    } catch (err) {
      console.error("Error al registrar avance de producción:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Cambio manual de estado (Iniciar, Pausar, Finalizar)
  const handleUpdateStatus = async (orderId, newStatus) => {
    setProcessing(true);
    try {
      const docRef = doc(db, "production_orders", orderId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await logActivity(
        user?.email,
        "Producción",
        "Cambio Estado OP",
        `Órden de producción ID '${orderId}' pasó a estado: ${newStatus.toUpperCase()}`
      );

      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err) {
      console.error("Error al cambiar estado de OP:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Filtrado de Órdenes
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesLine = filterLine === "todos" || order.line === filterLine;
      const matchesStatus = filterStatus === "todos" || order.status === filterStatus;

      const matchesSearch = 
        (order.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.operator || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = inDateRange(order.createdAt, fromDate, toDate);

      return matchesLine && matchesStatus && matchesSearch && matchesDate;
    });
  }, [orders, filterLine, filterStatus, searchTerm, fromDate, toDate]);

  // KPIs Globales OEE / Rendimiento
  const metrics = useMemo(() => {
    let totalTarget = 0;
    let totalProduced = 0;
    let totalScrap = 0;
    let activeOrdersCount = 0;

    orders.forEach((o) => {
      totalTarget += Number(o.targetQuantity) || 0;
      totalProduced += Number(o.producedQuantity) || 0;
      totalScrap += Number(o.scrapQuantity) || 0;

      if (o.status === "En Proceso") activeOrdersCount++;
    });

    const efficiency = totalTarget > 0 ? Math.min(100, Math.round((totalProduced / totalTarget) * 100)) : 0;
    const scrapRate = (totalProduced + totalScrap) > 0 ? ((totalScrap / (totalProduced + totalScrap)) * 100).toFixed(1) : 0;

    return { totalTarget, totalProduced, totalScrap, activeOrdersCount, efficiency, scrapRate };
  }, [orders]);

  if (loading) {
    return <CenteredMessage text="Conectando con Servidor de Control de Planta & SCADA..." />;
  }

  return (
    <div style={{ maxWidth: 1350, margin: "0 auto", paddingBottom: 50 }}>
      
      {/* HEADER DE MÓDULO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ background: "rgba(52,199,89,0.15)", color: "#34C759", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 4 }}>
              CONTROL DE PLANTA & EJECUCIÓN (MES)
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Órdenes de Producción & Eficiencia OEE
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            Seguimiento de cumplimiento por línea de producción, registro de desperdicio y métricas de rendimiento.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportToCsv("ordenes_produccion_enterprise", filteredOrders)} style={ghostButtonStyle}>
            <Download size={16} /> Exportar Reporte OP
          </button>
          <button onClick={() => setShowNewModal(true)} style={primaryButtonStyle}>
            <Plus size={16} /> Crear Órden (OP)
          </button>
        </div>
      </div>

      {/* STRIP DE KPIS ENTERPRISE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(52, 199, 89, 0.08)", border: "1px solid rgba(52, 199, 89, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#34C759" }}>LÍNEAS ACTIVAS</span>
            <Activity size={18} color="#34C759" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.activeOrdersCount}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Órdenes en ejecución inmediata</div>
        </div>

        <div style={{ background: "rgba(0, 122, 255, 0.08)", border: "1px solid rgba(0, 122, 255, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#007AFF" }}>CUMPLIMIENTO META (OEE)</span>
            <Gauge size={18} color="#007AFF" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.efficiency}%</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{metrics.totalProduced.toLocaleString()} / {metrics.totalTarget.toLocaleString()} unidades</div>
        </div>

        <div style={{ background: "rgba(255, 59, 48, 0.08)", border: "1px solid rgba(255, 59, 48, 0.2)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FF3B30" }}>ÍNDICE DE DESPERDICIO (SCRAP)</span>
            <AlertTriangle size={18} color="#FF3B30" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 6 }}>{metrics.scrapRate}%</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{metrics.totalScrap.toLocaleString()} unidades mermadas</div>
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
            placeholder="Buscar por código OP, producto o responsable..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ ...inputStyle, paddingLeft: 38 }} 
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={filterLine} onChange={(e) => setFilterLine(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todas las Líneas</option>
            <option value="Línea A - Extrusión" style={{ background: "#12141d" }}>Línea A - Extrusión</option>
            <option value="Línea B - Inyección" style={{ background: "#12141d" }}>Línea B - Inyección</option>
            <option value="Línea C - Ensamble" style={{ background: "#12141d" }}>Línea C - Ensamble</option>
            <option value="Línea D - Empaque" style={{ background: "#12141d" }}>Línea D - Empaque</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="todos" style={{ background: "#12141d" }}>Todos los Estados</option>
            <option value="Pendiente" style={{ background: "#12141d" }}>Pendiente</option>
            <option value="En Proceso" style={{ background: "#12141d" }}>En Proceso</option>
            <option value="Pausada" style={{ background: "#12141d" }}>Pausada</option>
            <option value="Completado" style={{ background: "#12141d" }}>Completado</option>
          </select>

          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
      </div>

      {/* TABLA ENTERPRISE DE ÓRDENES DE PRODUCCIÓN */}
      {filteredOrders.length === 0 ? (
        <EmptyState 
          Icon={Factory} 
          title="Sin Órdenes de Producción" 
          message="No se encontraron registros de producción bajo los criterios seleccionados." 
        />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, color: "#fff" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                <th style={{ padding: "14px 16px" }}>Código OP</th>
                <th style={{ padding: "14px 16px" }}>Producto</th>
                <th style={{ padding: "14px 16px" }}>Línea de Proceso</th>
                <th style={{ padding: "14px 16px" }}>Progreso de Producción</th>
                <th style={{ padding: "14px 16px" }}>Scrap</th>
                <th style={{ padding: "14px 16px" }}>Estado</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Operación</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const target = Number(order.targetQuantity) || 0;
                const produced = Number(order.producedQuantity) || 0;
                const scrap = Number(order.scrapQuantity) || 0;
                const percent = target > 0 ? Math.min(100, Math.round((produced / target) * 100)) : 0;

                return (
                  <tr key={order.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 800, color: "#34C759" }}>
                      {order.code}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, color: "#fff" }}>{order.productName}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Operador: {order.operator || "Sin Asignar"}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}>
                        {order.line}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", minWidth: 180 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, fontWeight: 700 }}>
                        <span>{produced.toLocaleString()} / {target.toLocaleString()}</span>
                        <span style={{ color: percent === 100 ? "#34C759" : "#007AFF" }}>{percent}%</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.1)", height: 6, borderRadius: 3, overflow: "hidden" }}>
                        <div 
                          style={{ 
                            width: `${percent}%`, 
                            background: percent === 100 ? "#34C759" : "#007AFF", 
                            height: "100%", 
                            borderRadius: 3, 
                            transition: "width 0.3s ease" 
                          }} 
                        />
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: scrap > 0 ? "#FF3B30" : "rgba(255,255,255,0.4)" }}>
                      {scrap} pzs
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button 
                        onClick={() => setSelectedOrder(order)} 
                        style={{ ...ghostButtonStyle, padding: "6px 10px", fontSize: 12 }}
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CREAR NUEVA OP */}
      {showNewModal && (
        <ModalShell title="Lanzamiento de Órden de Producción (OP)" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreateOrder} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <Field label="Código OP (Opcional)">
                <input 
                  type="text" 
                  placeholder="Auto-generado si está vacío" 
                  value={newOrder.code} 
                  onChange={(e) => setNewOrder({ ...newOrder, code: e.target.value })} 
                  style={inputStyle} 
                />
              </Field>

              <Field label="Producto a Manufacturar">
                <input 
                  type="text" 
                  placeholder="Ej. Garrafa HDPE 5 Litros" 
                  value={newOrder.productName} 
                  onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Línea de Producción Asignada">
                <select 
                  value={newOrder.line} 
                  onChange={(e) => setNewOrder({ ...newOrder, line: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="Línea A - Extrusión" style={{ background: "#12141d" }}>Línea A - Extrusión</option>
                  <option value="Línea B - Inyección" style={{ background: "#12141d" }}>Línea B - Inyección</option>
                  <option value="Línea C - Ensamble" style={{ background: "#12141d" }}>Línea C - Ensamble</option>
                  <option value="Línea D - Empaque" style={{ background: "#12141d" }}>Línea D - Empaque</option>
                </select>
              </Field>

              <Field label="Cantidad Meta (Lote Solicitado)">
                <input 
                  type="number" 
                  placeholder="Ej. 5000" 
                  value={newOrder.targetQuantity} 
                  onChange={(e) => setNewOrder({ ...newOrder, targetQuantity: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Operador Responsable de Turno">
                <input 
                  type="text" 
                  placeholder="Ej. Roberto Gómez" 
                  value={newOrder.operator} 
                  onChange={(e) => setNewOrder({ ...newOrder, operator: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>

              <Field label="Fecha Programada de Inicio">
                <input 
                  type="date" 
                  value={newOrder.startDate} 
                  onChange={(e) => setNewOrder({ ...newOrder, startDate: e.target.value })} 
                  style={inputStyle} 
                  required 
                />
              </Field>
            </div>

            <Field label="Notas Operativas / Especificaciones de Proceso">
              <input 
                type="text" 
                placeholder="Ej. Verificar temperatura del molde B a 195°C" 
                value={newOrder.notes} 
                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })} 
                style={inputStyle} 
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowNewModal(false)} style={secondaryButtonStyle}>
                Cancelar
              </button>
              <button type="submit" disabled={processing} style={primaryButtonStyle}>
                {processing ? "Creando..." : "Lanzar a Planta"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* MODAL GESTIONAR Y REPORTAR AVANCE DE OP */}
      {selectedOrder && (
        <ModalShell title={`Monitoreo de Órden: ${selectedOrder.code}`} onClose={() => setSelectedOrder(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)", padding: 14, borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#34C759" }}>PRODUCTO EN LÍNEA</span>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginTop: 2 }}>{selectedOrder.productName}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                Línea: {selectedOrder.line} | Operador: {selectedOrder.operator || "No especificado"}
              </div>
            </div>

            {/* SECCIÓN REPORTE DE AVANCE */}
            <form onSubmit={handleRegisterAdvance} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 14, borderRadius: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Reportar Avance de Turno / Captura SCADA:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Piezas Buenas Conformes (+)">
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={advanceQty} 
                    onChange={(e) => setAdvanceQty(e.target.value)} 
                    style={inputStyle} 
                  />
                </Field>
                <Field label="Piezas Rechazadas / Scrap (+)">
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={scrapQty} 
                    onChange={(e) => setScrapQty(e.target.value)} 
                    style={inputStyle} 
                  />
                </Field>
              </div>
              <button type="submit" disabled={processing} style={{ ...primaryButtonStyle, justifyContent: "center" }}>
                {processing ? "Registrando..." : "Cargar Piezas a Producción"}
              </button>
            </form>

            {/* CAMBIO MANUAL DE ESTADO */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Controles de Estado de Línea:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, "En Proceso")} 
                  disabled={processing || selectedOrder.status === "En Proceso"}
                  style={{ ...secondaryButtonStyle, border: "1px solid #34C759", color: "#34C759", fontSize: 12, justifyContent: "center" }}
                >
                  <Play size={14} /> Iniciar / Reanudar
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, "Pausada")} 
                  disabled={processing || selectedOrder.status === "Pausada"}
                  style={{ ...secondaryButtonStyle, border: "1px solid #FF9500", color: "#FF9500", fontSize: 12, justifyContent: "center" }}
                >
                  <PauseCircle size={14} /> Pausar Línea
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, "Completado")} 
                  disabled={processing || selectedOrder.status === "Completado"}
                  style={{ ...primaryButtonStyle, background: "#34C759", fontSize: 12, justifyContent: "center" }}
                >
                  <CheckSquare size={14} /> Finalizar OP
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
