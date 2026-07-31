import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import { Wrench, Plus, Search, Download, AlertTriangle, CheckCircle, Clock, Trash2, ShieldAlert } from "lucide-react";
import { inputStyle, primaryButtonStyle, ghostButtonStyle, exportToCsv, inDateRange, DateRangeFilter, logActivity, CenteredMessage, ModalShell, ConfirmDialog, EmptyState } from "../shared.jsx";

const CRITICITY = [
  { value: "alta", label: "CRÍTICA", color: "#FF3B30", bg: "rgba(255, 59, 48, 0.15)" },
  { value: "media", label: "MEDIA", color: "#FF9500", bg: "rgba(255, 149, 0, 0.15)" },
  { value: "baja", label: "BAJA", color: "#30B0C7", bg: "rgba(48, 176, 199, 0.15)" },
];

const STATUSES = [
  { value: "pendiente", label: "Pendiente", color: "#FF9500" },
  { value: "en_proceso", label: "En Proceso", color: "#007AFF" },
  { value: "resuelto", label: "Resuelto", color: "#34C759" },
];

export default function Mantenimiento({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("todas");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "maintenance"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  async function updateStatus(task, status) {
    await updateDoc(doc(db, "maintenance", task.id), { status });
    logActivity(user.email, "Mantenimiento", "Estado actualizado", `${task.equipment}: ${task.status} → ${status}`);
  }

  async function removeTask(task) {
    await deleteDoc(doc(db, "maintenance", task.id));
    logActivity(user.email, "Mantenimiento", "Eliminado", task.equipment);
    setConfirmDelete(null);
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "todas" && t.status !== filterStatus) return false;
      if (!inDateRange(t.createdAt, dateFrom, dateTo)) return false;
      if (search && !`${t.equipment} ${t.description || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterStatus, search, dateFrom, dateTo]);

  const stats = useMemo(() => ({
    total: tasks.length,
    pendientes: tasks.filter((t) => t.status === "pendiente").length,
    criticas: tasks.filter((t) => t.criticity === "alta" && t.status !== "resuelto").length,
  }), [tasks]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(255, 149, 0, 0.15)", color: "#FF9500", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            ASSET MANAGEMENT
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Mantenimiento & Equipos</h1>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ ...primaryButtonStyle, borderRadius: 10, padding: "10px 18px" }}>
          <Plus size={18} /> Nueva Orden
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Órdenes Totales" value={stats.total} icon={Wrench} accentColor="#007AFF" />
        <KpiCard label="Pendientes" value={stats.pendientes} icon={Clock} accentColor="#FF9500" />
        <KpiCard label="Urgencias Críticas" value={stats.criticas} icon={ShieldAlert} accentColor="#FF3B30" badge="Urgente" />
      </div>

      {/* Filtros */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar equipo o falla..." style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["todas", ...STATUSES.map(s => s.value)].map((st) => (
            <button key={st} onClick={() => setFilterStatus(st)} style={{ background: filterStatus === st ? "#007AFF" : "rgba(255,255,255,0.05)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
              {st}
            </button>
          ))}
        </div>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button onClick={() => exportToCsv("mantenimiento", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <CenteredMessage text="Cargando mantenimientos..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Wrench} title="Sin órdenes" message="No se encontraron registros." onAdd={() => setModalOpen(true)} addLabel="Crear orden" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
          {filtered.map((t) => {
            const crit = CRITICITY.find((c) => c.value === t.criticity) || CRITICITY[2];
            const st = STATUSES.find((s) => s.value === t.status) || STATUSES[0];
            return (
              <div key={t.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ background: crit.bg, color: crit.color, fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>{crit.label}</span>
                    <button onClick={() => setConfirmDelete(t)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><Trash2 size={15} /></button>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>{t.equipment}</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "0 0 14px", lineHeight: 1.4 }}>{t.description}</p>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: st.color, fontWeight: 700 }}>● {st.label}</span>
                  <select value={t.status} onChange={(e) => updateStatus(t, e.target.value)} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && <ConfirmDialog title="Eliminar orden" message="¿Confirmas eliminar esta orden de mantenimiento?" onCancel={() => setConfirmDelete(null)} onConfirm={() => removeTask(confirmDelete)} />}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accentColor, badge }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</span>
        {badge && <span style={{ background: accentColor, color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{badge}</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#fff" }}>{value}</div>
    </div>
  );
}
