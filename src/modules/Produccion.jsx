import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { Factory, Plus, Search, Download, PlayCircle, CheckCircle2, PauseCircle, Trash2 } from "lucide-react";
import { inputStyle, primaryButtonStyle, ghostButtonStyle, exportToCsv, inDateRange, DateRangeFilter, logActivity, CenteredMessage, ConfirmDialog, EmptyState } from "../shared.jsx";

export default function Produccion({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "production_orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  async function updateProgress(order, progress) {
    const status = progress >= 100 ? "completada" : progress > 0 ? "en_proceso" : "planificada";
    await updateDoc(doc(db, "production_orders", order.id), { progress: Number(progress), status });
  }

  async function removeOrder(order) {
    await deleteDoc(doc(db, "production_orders", order.id));
    logActivity(user.email, "Producción", "Orden Eliminada", order.orderNumber || order.id);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (!inDateRange(o.createdAt, dateFrom, dateTo)) return false;
      if (search && !`${o.orderNumber} ${o.product}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [orders, search, dateFrom, dateTo]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(52, 199, 89, 0.15)", color: "#34C759", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            OPERATIONS
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Líneas de Producción</h1>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por número de orden o producto..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button onClick={() => exportToCsv("produccion", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Order Cards */}
      {loading ? (
        <CenteredMessage text="Cargando órdenes de producción..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Factory} title="Sin órdenes actuando" message="No existen procesos activos." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
          {filtered.map((o) => {
            const progress = o.progress || 0;
            return (
              <div key={o.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: "#007AFF", fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}>#{o.orderNumber || "ORD-00"}</span>
                  <button onClick={() => setConfirmDelete(o)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><Trash2 size={15} /></button>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "#fff" }}>{o.product}</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 16px" }}>Objetivo: {o.targetQuantity || 0} Unidades</p>

                {/* Meter Bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Avance</span>
                    <span style={{ color: progress === 100 ? "#34C759" : "#007AFF" }}>{progress}%</span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#34C759" : "linear-gradient(90deg, #007AFF, #5856D6)", transition: "width 0.3s ease" }} />
                  </div>
                </div>

                {/* Progress Control */}
                <input type="range" min="0" max="100" value={progress} onChange={(e) => updateProgress(o, e.target.value)} style={{ width: "100%", accentColor: "#007AFF", cursor: "pointer" }} />
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && <ConfirmDialog title="Eliminar orden" message="¿Deseas eliminar permanentemente esta orden de producción?" onCancel={() => setConfirmDelete(null)} onConfirm={() => removeOrder(confirmDelete)} />}
    </div>
  );
}
