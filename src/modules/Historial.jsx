import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase.js";
import { Activity, Search, Download, History, User, Calendar, Layers, ShieldCheck, CheckCircle2 } from "lucide-react";
import { inputStyle, ghostButtonStyle, exportToCsv, DateRangeFilter, inDateRange, CenteredMessage, EmptyState } from "../shared.jsx";

const MODULES = [
  { value: "todos", label: "Todos los Módulos" },
  { value: "Materiales", label: "Materiales" },
  { value: "Calidad", label: "Calidad" },
  { value: "Aprobaciones", label: "Aprobaciones" },
  { value: "Sistema", label: "Sistema" },
];

export default function Historial() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("todos");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limitCount, setLimitCount] = useState(100);

  useEffect(() => {
    const q = query(
      collection(db, "activity_logs"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [limitCount]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (filterModule !== "todos" && log.module !== filterModule) return false;
      if (!inDateRange(log.timestamp, dateFrom, dateTo)) return false;

      const term = search.toLowerCase();
      const matchSearch =
        `${log.user || ""} ${log.action || ""} ${log.module || ""} ${log.target || ""} ${log.details || ""}`
          .toLowerCase()
          .includes(term);

      return matchSearch;
    });
  }, [logs, filterModule, search, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = logs.length;
    const porModulo = logs.reduce((acc, log) => {
      const mod = log.module || "Otros";
      acc[mod] = (acc[mod] || 0) + 1;
      return acc;
    }, {});
    return { total, porModulo };
  }, [logs]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ background: "rgba(88, 86, 214, 0.15)", color: "#5856D6", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            AUDIT TRAIL & LOGS
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.5px" }}>Historial de Actividad</h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Registros Cargados" value={stats.total} icon={History} accentColor="#5856D6" />
        <KpiCard label="Eventos en Materiales" value={stats.porModulo["Materiales"] || 0} icon={Layers} accentColor="#007AFF" />
        <KpiCard label="Eventos en Calidad" value={stats.porModulo["Calidad"] || 0} icon={ShieldCheck} accentColor="#FF3B30" />
        <KpiCard label="Aprobaciones / Firmas" value={stats.porModulo["Aprobaciones"] || 0} icon={CheckCircle2} accentColor="#34C759" />
      </div>

      {/* Filtros y Toolbar */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuario, acción, detalle..."
            style={{ ...inputStyle, paddingLeft: 36, borderRadius: 8, background: "rgba(0,0,0,0.2)" }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MODULES.map((m) => (
            <Chip key={m.value} active={filterModule === m.value} onClick={() => setFilterModule(m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>

        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />

        <button onClick={() => exportToCsv("historial-actividad", filtered)} style={{ ...ghostButtonStyle, marginLeft: "auto", borderRadius: 8 }}>
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Lista de Registros */}
      {loading ? (
        <CenteredMessage text="Cargando historial de auditoría..." />
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Activity} title="Sin actividad registrada" message="No se encontraron eventos con los filtros seleccionados." />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 120px 160px 1fr 200px", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 }}>
            <span>FECHA / HORA</span>
            <span>MÓDULO</span>
            <span>ACCIÓN</span>
            <span>OBJETO / DETALLE</span>
            <span>USUARIO</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((log, index) => {
              const dateStr = log.timestamp?.toDate 
                ? log.timestamp.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' }) 
                : "Reciente";

              return (
                <div
                  key={log.id || index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 120px 160px 1fr 200px",
                    padding: "12px 18px",
                    alignItems: "center",
                    borderBottom: index !== filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    background: index % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{dateStr}</span>

                  <span>
                    <ModuleBadge module={log.module} />
                  </span>

                  <span style={{ fontWeight: 700, color: "#fff" }}>
                    <ActionBadge action={log.action} />
                  </span>

                  <div style={{ color: "rgba(255,255,255,0.9)", paddingRight: 10 }}>
                    <strong style={{ color: "#fff" }}>{log.target || log.details}</strong>
                    {log.target && log.details && <span style={{ color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>({log.details})</span>}
                  </div>

                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.user || "Sistema"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cargar más si es necesario */}
          {logs.length >= limitCount && (
            <div style={{ padding: 12, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setLimitCount((prev) => prev + 100)} style={{ ...ghostButtonStyle, fontSize: 12, margin: "0 auto" }}>
                Cargar más registros de auditoría
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accentColor }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{label}</span>
        <div style={{ background: `${accentColor}20`, color: accentColor, padding: 6, borderRadius: 8 }}>
          <Icon size={18} />
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#fff" }}>{value}</div>
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

function ModuleBadge({ module }) {
  const colors = {
    Materiales: { bg: "rgba(0, 122, 255, 0.15)", color: "#007AFF" },
    Calidad: { bg: "rgba(255, 59, 48, 0.15)", color: "#FF3B30" },
    Aprobaciones: { bg: "rgba(52, 199, 89, 0.15)", color: "#34C759" },
    Sistema: { bg: "rgba(142, 142, 147, 0.15)", color: "#8E8E93" },
  };

  const style = colors[module] || colors.Sistema;

  return (
    <span style={{ background: style.bg, color: style.color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
      {module || "General"}
    </span>
  );
}

function ActionBadge({ action }) {
  const act = (action || "").toLowerCase();
  let color = "rgba(255,255,255,0.8)";

  if (act.includes("cread") || act.includes("agregad")) color = "#34C759";
  if (act.includes("eliminad") || act.includes("borrad")) color = "#FF3B30";
  if (act.includes("actualizad") || act.includes("modificad")) color = "#007AFF";
  if (act.includes("aprobad")) color = "#34C759";
  if (act.includes("rechazad")) color = "#FF3B30";

  return <span style={{ color }}>{action}</span>;
}
