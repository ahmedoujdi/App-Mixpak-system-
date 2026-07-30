import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

// ⚠️ RUTAS CORREGIDAS CON ../
import { db } from "../firebase.js";
import {
  Factory,
  Plus,
  Trash2,
  CheckCircle,
  Play,
  Pause,
  Download,
  Search,
} from "lucide-react";
import {
  COLORS,
  inputStyle,
  selectStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  exportToCsv,
  logActivity,
  CenteredMessage,
  Field,
  ModalShell,
  ConfirmDialog,
  StatCard,
  EmptyState,
} from "../shared.jsx";

const emptyForm = {
  line: "Línea 1",
  product: "",
  targetQty: "",
  producedQty: "0",
  status: "planificado", // planificado, en_proceso, pausado, completado
  notes: "",
};

export default function Produccion({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "production_orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function updateOrderStatus(order, newStatus) {
    await updateDoc(doc(db, "production_orders", order.id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    logActivity(user.email, "Producción", "Cambio de Estado", `Orden ${order.product}: ${order.status} → ${newStatus}`);
  }

  async function updateProducedQty(order, delta) {
    const newQty = Math.max(0, Number(order.producedQty || 0) + delta);
    await updateDoc(doc(db, "production_orders", order.id), {
      producedQty: newQty,
      updatedAt: serverTimestamp(),
    });
  }

  async function removeOrder(order) {
    await deleteDoc(doc(db, "production_orders", order.id));
    logActivity(user.email, "Producción", "Eliminada", `Orden ${order.product}`);
    setConfirmDelete(null);
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== "todos" && o.status !== filterStatus) return false;
      if (search && !`${o.product} ${o.line}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [orders, filterStatus, search]);

  const stats = useMemo(() => {
    let active = 0;
    let completed = 0;
    orders.forEach((o) => {
      if (o.status === "en_proceso") active++;
      if (o.status === "completado") completed++;
    });
    return { total: orders.length, active, completed };
  }, [orders]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, textTransform: "uppercase", margin: 0 }}>
          Órdenes de Producción
        </h1>
        <button onClick={() => setModalOpen(true)} style={primaryButtonStyle}>
          <Plus size={16} /> Nueva Orden
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Órdenes" value={stats.total} color={COLORS.steel} Icon={Factory} />
        <StatCard label="En Proceso" value={stats.active} color={COLORS.safety} Icon={Play} />
        <StatCard label="Completadas" value={stats.completed} color={COLORS.green} Icon={CheckCircle} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 9, top: 11 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por producto o línea..." style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="todos">Todos los estados</option>
          <option value="planificado">Planificado</option>
          <option value="en_proceso">En Proceso</option>
          <option value="pausado">Pausado</option>
          <option value="completado">Completado</option>
        </select>
        <button
          onClick={() => exportToCsv("ordenes-produccion", filteredOrders.map((o) => ({
            linea: o.line, producto: o.product, meta: o.targetQty, producido: o.producedQty, estado: o.status
          })))}
          style={ghostButtonStyle}
        >
          <Download size={16} /> Exportar
        </button>
      </div>

      {loading ? (
        <CenteredMessage text="Cargando órdenes de producción…" />
      ) : orders.length === 0 ? (
        <EmptyState Icon={Factory} title="Sin órdenes activas" message="Crea una nueva orden de producción para comenzar." onAdd={() => setModalOpen(true)} addLabel="Nueva Orden" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {filteredOrders.map((order) => {
            const progress = order.targetQty ? Math.min(100, Math.round((Number(order.producedQty || 0) / Number(order.targetQty)) * 100)) : 0;
            return (
              <div key={order.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.steel, textTransform: "uppercase" }}>{order.line}</span>
                  <button onClick={() => setConfirmDelete(order)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 style={{ fontSize: 16, margin: "0 0 10px", fontWeight: 600 }}>{order.product}</h3>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>
                    <span>Progreso: {progress}%</span>
                    <span>{order.producedQty || 0} / {order.targetQty || 0} u.</span>
                  </div>
                  <div style={{ background: "#0f1722", height: 6, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ background: progress >= 100 ? COLORS.green : COLORS.steel, width: `${progress}%`, height: "100%" }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {order.status !== "en_proceso" && (
                    <button onClick={() => updateOrderStatus(order, "en_proceso")} style={{ ...ghostButtonStyle, color: COLORS.green }}>
                      <Play size={12} /> Iniciar
                    </button>
                  )}
                  {order.status === "en_proceso" && (
                    <button onClick={() => updateOrderStatus(order, "pausado")} style={{ ...ghostButtonStyle, color: COLORS.safety }}>
                      <Pause size={12} /> Pausar
                    </button>
                  )}
                  {order.status !== "completado" && (
                    <button onClick={() => updateOrderStatus(order, "completado")} style={{ ...ghostButtonStyle, color: COLORS.steel }}>
                      <CheckCircle size={12} /> Finalizar
                    </button>
                  )}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <button onClick={() => updateProducedQty(order, -10)} style={ghostButtonStyle}>-10</button>
                    <button onClick={() => updateProducedQty(order, 10)} style={ghostButtonStyle}>+10</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && <OrderModal user={user} onClose={() => setModalOpen(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar Orden"
          message="¿Seguro que deseas eliminar esta orden de producción?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeOrder(confirmDelete)}
        />
      )}
    </div>
  );
}

function OrderModal({ user, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.product.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "production_orders"), {
        ...form,
        targetQty: Number(form.targetQty) || 0,
        producedQty: Number(form.producedQty) || 0,
        createdAt: serverTimestamp(),
      });
      logActivity(user.email, "Producción", "Nueva Orden", form.product);
      onClose();
    } catch (err) {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Nueva Orden de Producción">
      <form onSubmit={submit}>
        <Field label="Línea de Producción">
          <select value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} style={selectStyle}>
            <option value="Línea 1">Línea 1</option>
            <option value="Línea 2">Línea 2</option>
            <option value="Línea 3">Línea 3</option>
            <option value="Empaque">Empaque</option>
          </select>
        </Field>
        <Field label="Producto *">
          <input required value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} style={inputStyle} placeholder="Nombre o SKU del producto" />
        </Field>
        <Field label="Meta de producción (Unidades)">
          <input type="number" required value={form.targetQty} onChange={(e) => setForm({ ...form, targetQty: e.target.value })} style={inputStyle} placeholder="1000" />
        </Field>
        <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "100%", justifyContent: "center", marginTop: 10 }}>
          {saving ? "Guardando…" : "Crear Orden"}
        </button>
      </form>
    </ModalShell>
  );
}
