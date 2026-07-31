import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import { 
  Factory, 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  Download, 
  Layers, 
  TrendingUp, 
  AlertOctagon, 
  BarChart2 
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

const STATUS_MAP = {
  planificada: { label: "Planificada", color: "#8E8E93", bg: "rgba(142, 142, 147, 0.15)", icon: Clock },
  en_proceso: { label: "En Proceso", color: "#007AFF", bg: "rgba(0, 122, 255, 0.15)", icon: Play },
  pausada: { label: "Pausada", color: "#FF9500", bg: "rgba(255, 149, 0, 0.15)", icon: Pause },
  completada: { label: "Finalizada", color: "#34C759", bg: "rgba(52, 199, 89, 0.15)", icon: CheckCircle2 },
};

const emptyForm = {
  code: "",
  productName: "",
  targetQuantity: "",
  line: "",
  startDate: "",
  notes: "",
};

export default function Produccion({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null); // Para actualizar avance
  const [filterStatus, setFilterStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const q = query(collection(db, "production_orders"), orderBy("createdAt", "desc"));
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
      return `${o.code || ""} ${o.productName || ""} ${o.line || ""}`.toLowerCase().includes(term);
    });
  }, [orders, filterStatus, search, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const activas = orders.filter((o) => o.status === "en_proceso").length;
    const planificadas = orders.filter((o) => o.status === "planificada").length;
    const completadas = orders.filter((o) => o.status === "completada").length;
    const totalProducido = orders.reduce((acc, o) => acc + (o.producedQuantity || 0), 0);
    return { activas, planificadas, completadas, totalProducido };
  }, [orders]);

  const handleStatusChange = async (order, newStatus) => {
    try {
      await updateDoc(doc(db, "production_orders", order.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      logActivity(user.email, "Producción", `Estado OP (${newStatus.toUpperCase()})`, `OP: ${order.code} - ${order.productName}`);
    } catch (err) {
      alert("Error al actualizar la orden de producción.");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(0, 122, 255, 0.15)", color: "#007AFF", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            MANUFACTURING & EXECUTION (MES)
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Órdenes de Producción</h1>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ ...primaryButtonStyle, borderRadius: 10, padding: "10px 18px", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
          <Plus size={18} /> Nueva Orden de Producción (OP)
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Líneas en Proceso" value={stats.activas} icon={Play} accentColor="#007AFF" badge={stats.activas > 0 ? "En Planta" : null} />
        <KpiCard label="OP Planificadas" value={stats.planificadas} icon={Clock} accentColor="#8E8E93" />
        <KpiCard label="OP Finalizadas" value={stats.completadas} icon={CheckCircle2} accentColor="#34C759" />
        <KpiCard label="Total Unidades Fabricadas" value={stats.totalProducido.toLocaleString()} icon={Factory} accentColor="#5856D6" />
      </div>

      {/* Toolbar y Filtros */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por OP, producto, línea..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip active={filterStatus === "todos"} onClick={() => setFilterStatus("todos")}>Todas</Chip>
          <Chip active={filterStatus === "en_proceso"} onClick={() => setFilterStatus("en_proceso")}>En Proceso</Chip>
          <Chip active={filterStatus === "planificada"} onClick={() => setFilterStatus("planificada")}>Planificadas</Chip>
          <Chip active={filterStatus === "pausada"} onClick={() => setFilterStatus("pausada")}>Pausadas</Chip>
          <Chip active={filterStatus === "completada"} onClick={() => setFilterStatus("completada")}>Finalizadas</Chip>
        </div>

        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button onClick={() => exportToCsv("ordenes-produccion", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Grid de Tarjetas de Producción */}
      {loading ? (
        <CenteredMessage text="Cargando órdenes de producción..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Factory} title="Sin órdenes de producción" message="Crea una nueva OP para comenzar el seguimiento en planta." onAdd={() => setModalOpen(true)} addLabel="Nueva OP" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
          {filtered.map((o) => {
            const st = STATUS_MAP[o.status] || STATUS_MAP.planificada;
            const IconComp = st.icon;
            const target = parseFloat(o.targetQuantity) || 1;
            const produced = parseFloat(o.producedQuantity) || 0;
            const progress = Math.min(Math.round((produced / target) * 100), 100);

            return (
              <div key={o.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <IconComp size={13} /> {st.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      Línea: <strong style={{ color: "#fff" }}>{o.line || "N/A"}</strong>
                    </span>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: "#007AFF", marginBottom: 2 }}>{o.code}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px", color: "#fff" }}>{o.productName}</h3>

                  {/* Barra de Progreso */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>Avance de Lote</span>
                      <strong style={{ color: "#fff" }}>{produced.toLocaleString()} / {target.toLocaleString()} u. ({progress}%)</strong>
                    </div>
                    <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#34C759" : "#007AFF", transition: "width 0.3s ease" }} />
                    </div>
                  </div>

                  {o.scrapQuantity > 0 && (
                    <div style={{ fontSize: 11, color: "#FF3B30", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertOctagon size={12} /> Desperdicio / Scrap: {o.scrapQuantity} unidades
                    </div>
                  )}
                </div>

                {/* Acciones de OP */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, marginTop: 10, display: "flex", gap: 8 }}>
                  {o.status === "planificada" && (
                    <button onClick={() => handleStatusChange(o, "en_proceso")} style={{ ...primaryButtonStyle, flex: 1, background: "#007AFF", borderRadius: 8 }}>
                      <Play size={14} /> Iniciar OP
                    </button>
                  )}

                  {o.status === "en_proceso" && (
                    <>
                      <button onClick={() => setSelectedOrder(o)} style={{ ...primaryButtonStyle, flex: 1, background: "#34C759", borderRadius: 8 }}>
                        + Registrar Avance
                      </button>
                      <button onClick={() => handleStatusChange(o, "pausada")} style={{ ...ghostButtonStyle, borderRadius: 8, padding: "6px 10px" }}>
                        <Pause size={14} />
                      </button>
                    </>
                  )}

                  {o.status === "pausada" && (
                    <button onClick={() => handleStatusChange(o, "en_proceso")} style={{ ...primaryButtonStyle, flex: 1, background: "#FF9500", borderRadius: 8 }}>
                      <Play size={14} /> Reanudar
                    </button>
                  )}

                  {o.status !== "completada" && produced >= target && (
                    <button onClick={() => handleStatusChange(o, "completada")} style={{ ...primaryButtonStyle, background: "#34C759", borderRadius: 8 }}>
                      Finalizar Lote
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear OP */}
      {modalOpen && <ProductionFormModal user={user} onClose={() => setModalOpen(false)} />}

      {/* Modal Registrar Avance */}
      {selectedOrder && (
        <ProgressModal 
          user={user} 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
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

function ProductionFormModal({ user, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.productName || !form.targetQuantity) return alert("Completa los campos obligatorios.");

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        targetQuantity: parseFloat(form.targetQuantity) || 0,
        producedQuantity: 0,
        scrapQuantity: 0,
        status: "planificada",
        createdBy: user.email,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "production_orders"), payload);
      logActivity(user.email, "Producción", "Nueva OP Creada", `OP: ${form.code} - ${form.productName}`);
      onClose();
    } catch (err) {
      alert("Error al crear la orden de producción.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Nueva Orden de Producción (OP)" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <Field label="Código OP">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="OP-2026-001" style={inputStyle} required />
          </Field>
          <Field label="Producto a Fabricar">
            <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Ej: Válvula Industrial 2 pulgadas" style={inputStyle} required />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Cantidad Programada (Unidades)">
            <input type="number" step="any" value={form.targetQuantity} onChange={(e) => setForm({ ...form, targetQuantity: e.target.value })} placeholder="1000" style={inputStyle} required />
          </Field>
          <Field label="Línea / Maquinaria">
            <input value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} placeholder="Ej: Línea Ensamble A" style={inputStyle} />
          </Field>
        </div>

        <Field label="Fecha Estimada de Inicio">
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
        </Field>

        <Field label="Observaciones o Especificaciones">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Instrucciones de ensamble, empaque o cliente..." style={{ ...inputStyle, minHeight: 60 }} />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Cancelar</button>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? "Guardando..." : "Crear Orden de Producción"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ProgressModal({ user, order, onClose }) {
  const [addProduced, setAddProduced] = useState("");
  const [addScrap, setAddScrap] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(addProduced) || 0;
    const scrap = parseFloat(addScrap) || 0;

    if (qty <= 0 && scrap <= 0) return alert("Ingresa una cantidad producida o de scrap mayor a 0.");

    setSubmitting(true);
    try {
      const newProduced = (order.producedQuantity || 0) + qty;
      const newScrap = (order.scrapQuantity || 0) + scrap;

      const isCompleted = newProduced >= order.targetQuantity;

      await updateDoc(doc(db, "production_orders", order.id), {
        producedQuantity: newProduced,
        scrapQuantity: newScrap,
        status: isCompleted ? "completada" : "en_proceso",
        updatedAt: serverTimestamp(),
      });

      logActivity(user.email, "Producción", "Reporte de Avance", `OP: ${order.code} (+${qty} u. / Scrap: ${scrap})`);
      onClose();
    } catch (err) {
      alert("Error al actualizar el avance de producción.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={`Registrar Avance - ${order.code}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          Producto: <strong style={{ color: "#fff" }}>{order.productName}</strong> | Actual: <strong>{order.producedQuantity || 0} / {order.targetQuantity}</strong> u.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Unidades Fabricadas (Buenas)">
            <input type="number" step="any" value={addProduced} onChange={(e) => setAddProduced(e.target.value)} placeholder="0" style={inputStyle} required />
          </Field>
          <Field label="Scrap / Mermas (Defectuosas)">
            <input type="number" step="any" value={addScrap} onChange={(e) => setAddScrap(e.target.value)} placeholder="0" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Cancelar</button>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? "Guardando..." : "Confirmar Avance"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
